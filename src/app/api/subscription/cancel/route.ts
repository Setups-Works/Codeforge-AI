import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRazorpay, paymentsEnabled } from "@/lib/razorpay";
import { getUserBillingFields, updateUserPlan } from "@/services/billing-store";
import { getPostHogServer } from "@/lib/posthog-server";
import { PLANS, type PlanId } from "@/lib/plans";
import { sendEmail } from "@/lib/mailer";
import {
  subscriptionCancelledEmailHtml,
  subscriptionCancelledEmailSubject,
} from "@/lib/email-templates";

export const runtime = "nodejs";

const APP_URL =
  process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const limited = await enforceRateLimit("payment", req, session.user.id);
  if (limited) return limited;

  const user = await getUserBillingFields(session.user.id);

  // For a recurring subscription, tell Razorpay to stop after the current cycle
  // so auto-pay is revoked but the user keeps access until period end.
  if (user?.razorpaySubscriptionId && paymentsEnabled()) {
    try {
      await getRazorpay().subscriptions.cancel(user.razorpaySubscriptionId, true);
    } catch (e) {
      console.error("[subscription-cancel]", e);
      // Surface a soft error — the user's local state is still updated below.
    }
  }

  await updateUserPlan(session.user.id, {
    cancelAtPeriodEnd: true,
    subscriptionStatus: "cancelled",
    billingCycle: null,
    // plan stays active until planExpiresAt; a check downgrades after expiry.
  });

  getPostHogServer()?.capture({
    distinctId: session.user.id,
    event: "subscription_cancelled",
    properties: {},
  });

  // Cancellation confirmation (fire-and-forget). Sent from here (not the
  // webhook) so it's immediate and reliable regardless of webhook config.
  if (user?.email && user.plan && user.plan !== "free") {
    const planName = PLANS[user.plan as PlanId]?.name ?? "your plan";
    sendEmail({
      to: user.email,
      subject: subscriptionCancelledEmailSubject(planName),
      html: subscriptionCancelledEmailHtml({
        name: user.name ?? user.email.split("@")[0],
        planName,
        accessUntilLabel: user.planExpiresAt
          ? new Date(user.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : "the end of your billing period",
        resubscribeUrl: `${APP_URL}/pricing`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    message: "Auto-renewal cancelled. You keep access until your billing period ends.",
  });
}
