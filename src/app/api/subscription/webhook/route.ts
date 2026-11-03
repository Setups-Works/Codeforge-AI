import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import {
  recordWebhookEvent,
  findUserByRazorpaySubId,
  updateUserByRazorpaySubId,
  updateUserPlan,
  upsertInvoiceByPaymentId,
} from "@/services/billing-store";
import { handleCapturedPayment, handleFailedPayment } from "@/services/lms-orders";
import { lmsEnabled } from "@/lib/lms/flag";
import { getPostHogServer } from "@/lib/posthog-server";
import { PLANS, type PlanId } from "@/lib/plans";
import { sendEmail } from "@/lib/mailer";
import {
  paymentReceiptEmailHtml,
  paymentReceiptEmailSubject,
  paymentFailedEmailHtml,
  paymentFailedEmailSubject,
} from "@/lib/email-templates";

const APP_URL =
  process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function planLabel(plan: string): string {
  return PLANS[plan as PlanId]?.name ?? "your";
}

export const runtime = "nodejs";
// Razorpay needs the raw, unmodified body to validate the signature.
export const dynamic = "force-dynamic";

interface RzpEntity {
  id?: string;
  plan_id?: string;
  status?: string;
  current_end?: number;
  amount?: number;
  currency?: string;
  notes?: Record<string, string>;
}

function addPeriod(from: Date, cycle: string): Date {
  const end = new Date(from);
  if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  // 1) Authenticate the webhook — reject anything we can't verify.
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: { event?: string; payload?: { subscription?: { entity?: RzpEntity }; payment?: { entity?: RzpEntity } } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event ?? "unknown";
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${eventType}:${Date.now()}`;

  // Course purchases are handled before the idempotency record: their fulfilment
  // is itself idempotent, so a retry after a failure must be allowed to run again.
  if (lmsEnabled() && (eventType === "payment.captured" || eventType === "payment.failed")) {
    const pay = (payload.payload?.payment?.entity ?? {}) as RzpEntity & { order_id?: string };
    try {
      const handled =
        eventType === "payment.captured"
          ? await handleCapturedPayment({ orderId: pay.order_id, paymentId: pay.id, amountPaise: pay.amount, currency: pay.currency })
          : await handleFailedPayment(pay.order_id);
      if (handled) return NextResponse.json({ ok: true, course: true });
    } catch (e) {
      console.error("[razorpay-webhook] course", eventType, e);
      return NextResponse.json({ error: "Handler error" }, { status: 500 });
    }
  }

  // 2) Idempotency — a duplicate delivery is a no-op.
  const isNew = await recordWebhookEvent(eventId, eventType);
  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const subEntity = payload.payload?.subscription?.entity;
  const payEntity = payload.payload?.payment?.entity;

  try {
    switch (eventType) {
      case "subscription.charged": {
        const subId = subEntity?.id;
        if (!subId) break;
        const user = await findUserByRazorpaySubId(subId);
        const userId = user?.id ?? subEntity?.notes?.userId;
        if (!userId) break;

        const plan = (user?.plan && user.plan !== "free" ? user.plan : subEntity?.notes?.plan) ?? "go";
        const cycle = user?.billingCycle ?? subEntity?.notes?.cycle ?? "monthly";
        const periodStart = new Date();
        const periodEnd = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000)
          : addPeriod(periodStart, cycle);

        // Record the charge as an invoice (idempotent on payment id).
        let newInvoice = false;
        if (payEntity?.id) {
          newInvoice = await upsertInvoiceByPaymentId(payEntity.id, {
            userId,
            plan,
            billingCycle: cycle,
            amount: (payEntity.amount ?? 0) / 100,
            currency: payEntity.currency ?? "INR",
            kind: "subscription",
            razorpaySubscriptionId: subId,
            status: "paid",
            periodStart,
            periodEnd,
          });
        }

        await updateUserPlan(userId, {
          plan,
          billingCycle: cycle,
          planExpiresAt: periodEnd,
          razorpaySubscriptionId: subId,
          subscriptionStatus: "active",
        });
        getPostHogServer()?.capture({ distinctId: String(userId), event: "subscription_renewed", properties: { plan, billing_cycle: cycle } });

        // Receipt email for genuine new charges only (renewals + the first
        // charge after a trial). The immediate first purchase was already
        // emailed by the verify route, whose invoice row already exists, so
        // newInvoice is false there and we don't double-send.
        if (newInvoice && user?.email) {
          sendEmail({
            to: user.email,
            subject: paymentReceiptEmailSubject(planLabel(plan), true),
            html: paymentReceiptEmailHtml({
              name: user.name ?? user.email.split("@")[0],
              planName: planLabel(plan),
              amountLabel: `₹${(payEntity?.amount ?? 0) / 100}`,
              periodEndLabel: fmtDate(periodEnd),
              renewal: true,
              manageUrl: `${APP_URL}/settings?tool=billing`,
            }),
          }).catch(() => {});
        }
        break;
      }

      case "subscription.activated":
      case "subscription.authenticated": {
        const subId = subEntity?.id;
        if (subId) await updateUserByRazorpaySubId(subId, { subscriptionStatus: "active" });
        break;
      }

      case "subscription.halted": {
        const subId = subEntity?.id;
        if (subId) {
          const u = await updateUserByRazorpaySubId(subId, { subscriptionStatus: "halted" });
          // A recurring charge failed → auto-pay paused. Ask them to fix the card.
          if (u?.email) {
            const plan = u.plan && u.plan !== "free" ? u.plan : subEntity?.notes?.plan ?? "go";
            sendEmail({
              to: u.email,
              subject: paymentFailedEmailSubject(planLabel(plan)),
              html: paymentFailedEmailHtml({
                name: u.name ?? u.email.split("@")[0],
                planName: planLabel(plan),
                updateUrl: `${APP_URL}/settings?tool=billing`,
              }),
            }).catch(() => {});
          }
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        const subId = subEntity?.id;
        if (subId) {
          // Keep access until planExpiresAt; a later check downgrades to free.
          await updateUserByRazorpaySubId(subId, {
            subscriptionStatus: eventType === "subscription.completed" ? "completed" : "cancelled",
          });
        }
        break;
      }

      case "payment.failed": {
        getPostHogServer()?.capture({
          distinctId: subEntity?.notes?.userId ?? "unknown",
          event: "payment_failed",
          properties: { paymentId: payEntity?.id },
        });
        break;
      }

      default:
        // Acknowledge unhandled events so Razorpay stops retrying.
        break;
    }
  } catch (e) {
    console.error("[razorpay-webhook]", eventType, e);
    // Return 500 so Razorpay retries a genuinely failed handler.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
