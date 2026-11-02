import { verifyCheckoutSignature } from "@/lib/razorpay";
import { redeemCoupon } from "@/lib/coupons";
import {
  findUserSubscription,
  updateSubscriptionRecord,
  updateUserPlan,
} from "@/services/billing-store";
import { getPostHogServer } from "@/lib/posthog-server";
import { PLANS, type PlanId } from "@/lib/plans";
import { sendEmail } from "@/lib/mailer";
import {
  trialStartedEmailHtml,
  trialStartedEmailSubject,
  paymentReceiptEmailHtml,
  paymentReceiptEmailSubject,
} from "@/lib/email-templates";

const APP_URL =
  process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function addPeriod(from: Date, cycle: "monthly" | "yearly"): Date {
  const end = new Date(from);
  if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export interface ActivateInput {
  userId: string;
  userEmail: string | null;
  userName: string | null;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export type ActivateResult =
  | { ok: true; plan: string; expiresAt: Date }
  | { ok: false; status: number; error: string };

/**
 * Verify a Razorpay checkout signature and activate the plan. Shared by the
 * JSON verify endpoint (popup flow) and the browser callback (full-page
 * redirect flow) so both paths behave identically: signature check, record
 * update, plan grant, coupon redemption, confirmation email, analytics.
 */
export async function activateVerifiedPayment(input: ActivateInput): Promise<ActivateResult> {
  const { userId, razorpayOrderId, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = input;

  if (!razorpayPaymentId || !razorpaySignature) {
    return { ok: false, status: 400, error: "Missing payment fields" };
  }

  // Constant-time signature verification (order OR subscription).
  const valid = verifyCheckoutSignature({
    orderId: razorpayOrderId,
    subscriptionId: razorpaySubscriptionId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) return { ok: false, status: 400, error: "Invalid payment signature" };

  // Locate the tracking record and confirm it belongs to this user.
  const sub = await findUserSubscription({ userId, razorpaySubscriptionId, razorpayOrderId });
  if (!sub) return { ok: false, status: 404, error: "Subscription not found" };

  const now = new Date();
  const periodEnd = addPeriod(now, sub.billingCycle);

  if (razorpaySubscriptionId) {
    // Card-on-file trial: the mandate is authenticated now but the first charge
    // fires later (Razorpay `start_at`). Grant access until the trial ends and
    // keep trialEndsAt set; `subscription.charged` will extend it on first bill.
    const isTrial = Boolean(sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime());
    const accessUntil = isTrial ? sub.trialEndsAt! : periodEnd;

    await updateSubscriptionRecord(sub.id, {
      status: isTrial ? "created" : "paid",
      razorpayPaymentId,
      razorpaySignature,
      periodStart: now,
      periodEnd: accessUntil,
    });
    await updateUserPlan(userId, {
      plan: sub.plan,
      billingCycle: sub.billingCycle,
      planExpiresAt: accessUntil,
      razorpaySubscriptionId,
      subscriptionStatus: "active",
      cancelAtPeriodEnd: false,
      trialEndsAt: isTrial ? accessUntil : null,
    });
    // Record coupon redemption only after a confirmed payment (never on a trial).
    if (sub.couponCode && !isTrial) {
      await redeemCoupon({ code: sub.couponCode, userId, discount: sub.discount ?? 0 });
    }

    // Confirmation email (fire-and-forget — never block or fail the payment).
    const to = input.userEmail;
    if (to) {
      const name = input.userName ?? to.split("@")[0];
      const planName = PLANS[sub.plan as PlanId].name;
      const manageUrl = `${APP_URL}/settings?tool=billing`;
      if (isTrial) {
        sendEmail({
          to,
          subject: trialStartedEmailSubject(planName, PLANS[sub.plan as PlanId].trialDays),
          html: trialStartedEmailHtml({
            name,
            planName,
            trialDays: PLANS[sub.plan as PlanId].trialDays,
            firstChargeDate: fmtDate(accessUntil),
            amountLabel: `₹${sub.amount}`,
            manageUrl,
          }),
        }).catch(() => {});
      } else {
        sendEmail({
          to,
          subject: paymentReceiptEmailSubject(planName, false),
          html: paymentReceiptEmailHtml({
            name,
            planName,
            amountLabel: `₹${sub.amount}`,
            periodEndLabel: fmtDate(accessUntil),
            renewal: false,
            manageUrl,
          }),
        }).catch(() => {});
      }
    }
  } else {
    // One-time order.
    await updateSubscriptionRecord(sub.id, {
      razorpayPaymentId,
      razorpaySignature,
      status: "paid",
      periodStart: now,
      periodEnd,
    });
    await updateUserPlan(userId, {
      plan: sub.plan,
      billingCycle: sub.billingCycle,
      planExpiresAt: periodEnd,
      trialEndsAt: null,
    });
  }

  getPostHogServer()?.capture({
    distinctId: userId,
    event: "subscription_purchased",
    properties: {
      plan: sub.plan,
      billing_cycle: sub.billingCycle,
      recurring: Boolean(razorpaySubscriptionId),
    },
  });

  return { ok: true, plan: sub.plan, expiresAt: periodEnd };
}
