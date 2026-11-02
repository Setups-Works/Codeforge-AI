import crypto from "crypto";
import Razorpay from "razorpay";
import { RazorpayPlan } from "@/models";
import { PLANS, type PlanId, type BillingCycle } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { backendFor } from "@/lib/data-backend";

/** True when Razorpay server credentials are configured. */
export function paymentsEnabled(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** The publishable key id sent to the browser checkout. */
export function publicKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

let client: Razorpay | null = null;
export function getRazorpay(): Razorpay {
  if (!paymentsEnabled()) throw new Error("Razorpay is not configured");
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

/** Constant-time string compare to avoid timing side-channels on signatures. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function hmacHex(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify a Razorpay Checkout signature for either a one-time order or a
 * recurring subscription.
 *  - order:        HMAC(order_id + "|" + payment_id)
 *  - subscription: HMAC(payment_id + "|" + subscription_id)
 */
export function verifyCheckoutSignature(opts: {
  orderId?: string;
  subscriptionId?: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !opts.signature || !opts.paymentId) return false;
  const payload = opts.subscriptionId
    ? `${opts.paymentId}|${opts.subscriptionId}`
    : `${opts.orderId}|${opts.paymentId}`;
  return safeEqual(hmacHex(payload, secret), opts.signature);
}

/** Verify a Razorpay webhook payload against the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(hmacHex(rawBody, secret), signature);
}

/** Amount in paise for a plan + billing cycle (server-authoritative). */
export function amountForPlan(plan: PlanId, cycle: BillingCycle): number {
  const def = PLANS[plan];
  const rupees = cycle === "yearly" ? def.price.yearly : def.price.monthly;
  return rupees * 100;
}

/**
 * Get a cached Razorpay plan id for (plan, cycle), creating it once if needed.
 * Razorpay plans are immutable, so the mapping is persisted to avoid duplicates.
 * Caller must have connected to the DB.
 */
export async function getOrCreatePlanId(
  plan: PlanId,
  cycle: BillingCycle,
  amountPaiseOverride?: number,
): Promise<string> {
  const amount = amountPaiseOverride ?? amountForPlan(plan, cycle);
  // Discounted amounts get their own cached plan keyed by the amount, so a
  // given coupon price is reused across users without creating duplicates.
  const key =
    amountPaiseOverride != null && amountPaiseOverride !== amountForPlan(plan, cycle)
      ? `${plan}_${cycle}_${amount}`
      : `${plan}_${cycle}`;

  const useSupabase = backendFor("razorpay_plans") === "supabase";
  if (useSupabase) {
    const { data } = await supabaseAdmin()
      .from("razorpay_plans")
      .select("plan_id")
      .eq("id", key)
      .maybeSingle();
    const planId = (data as { plan_id: string } | null)?.plan_id;
    if (planId) return planId;
  } else {
    const existing = await RazorpayPlan.findById(key).lean<{ planId: string }>();
    if (existing?.planId) return existing.planId;
  }

  const def = PLANS[plan];
  // razorpay sdk types are loose here; period accepts "monthly" | "yearly"
  const created = await getRazorpay().plans.create({
    period: cycle === "yearly" ? "yearly" : "monthly",
    interval: 1,
    item: {
      name: `Setups Works Lab ${def.name} (${cycle})`,
      amount,
      currency: "INR",
      description: `${def.name} plan — billed ${cycle}`,
    },
  } as Parameters<Razorpay["plans"]["create"]>[0]);

  if (useSupabase) {
    await supabaseAdmin()
      .from("razorpay_plans")
      .upsert(
        { id: key, plan_id: created.id, plan, cycle, amount },
        { onConflict: "id" },
      );
  } else {
    await RazorpayPlan.updateOne(
      { _id: key },
      { $set: { planId: created.id, plan, cycle, amount } },
      { upsert: true },
    );
  }
  return created.id;
}
