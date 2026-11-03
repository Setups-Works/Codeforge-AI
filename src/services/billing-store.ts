import { supabaseAdmin } from "@/lib/supabase/admin";


/** Patch applied to a user's plan/billing fields (camelCase, backend-agnostic). */
export interface UserPlanPatch {
  plan?: string;
  billingCycle?: string | null;
  planExpiresAt?: Date | null;
  razorpaySubscriptionId?: string | null;
  subscriptionStatus?: string;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date | null;
  billing?: object;
  betaUser?: boolean;
  /** /join offer code the user claimed (e.g. LAUNCH30). */
  campaign?: string | null;
}

const USER_FIELD_MAP: Record<keyof UserPlanPatch, string> = {
  plan: "plan",
  billingCycle: "billing_cycle",
  planExpiresAt: "plan_expires_at",
  razorpaySubscriptionId: "razorpay_subscription_id",
  subscriptionStatus: "subscription_status",
  cancelAtPeriodEnd: "cancel_at_period_end",
  trialEndsAt: "trial_ends_at",
  billing: "billing",
  betaUser: "beta_user",
  campaign: "campaign",
};

function toSb(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value;
}

/** Apply a plan/billing patch to a user on the active backend. */
export async function updateUserPlan(userId: string, patch: UserPlanPatch): Promise<void> {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      row[USER_FIELD_MAP[k as keyof UserPlanPatch]] = toSb(v);
    }
    if (Object.keys(row).length) {
      const { error } = await supabaseAdmin().from("users").update(row).eq("id", userId);
      if (error) throw new Error(error.message);
    }
    return;
}

export interface UserBillingFields {
  plan: string;
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  razorpaySubscriptionId: string | null;
  name: string | null;
  email: string | null;
}

/** Read the billing-relevant fields of a user. */
export async function getUserBillingFields(userId: string): Promise<UserBillingFields | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("plan,plan_expires_at,trial_ends_at,razorpay_subscription_id,name,email")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    const u = data as {
      plan: string; plan_expires_at: string | null; trial_ends_at: string | null;
      razorpay_subscription_id: string | null; name: string | null; email: string | null;
    };
    return {
      plan: u.plan,
      planExpiresAt: u.plan_expires_at ? new Date(u.plan_expires_at) : null,
      trialEndsAt: u.trial_ends_at ? new Date(u.trial_ends_at) : null,
      razorpaySubscriptionId: u.razorpay_subscription_id,
      name: u.name,
      email: u.email,
    };
}

export interface SubscriptionInput {
  userId: string;
  plan: string;
  billingCycle: string;
  amount: number;
  currency?: string;
  kind?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  razorpayPaymentId?: string;
  couponCode?: string;
  discount?: number;
  status: string;
  trialEndsAt?: Date | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

/** Create a subscription tracking record on the active backend. */
export async function createSubscriptionRecord(input: SubscriptionInput): Promise<void> {
    const { error } = await supabaseAdmin().from("subscriptions").insert({
      user_id: input.userId,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency ?? "INR",
      kind: input.kind ?? "subscription",
      razorpay_order_id: input.razorpayOrderId ?? null,
      razorpay_subscription_id: input.razorpaySubscriptionId ?? null,
      razorpay_payment_id: input.razorpayPaymentId ?? null,
      coupon_code: input.couponCode ?? null,
      discount: input.discount ?? 0,
      status: input.status,
      trial_ends_at: input.trialEndsAt ? input.trialEndsAt.toISOString() : null,
      period_start: input.periodStart ? input.periodStart.toISOString() : null,
      period_end: input.periodEnd ? input.periodEnd.toISOString() : null,
    });
    if (error) throw new Error(error.message);
    return;
}

export interface SubscriptionRecord {
  id: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
  amount: number;
  couponCode: string | null;
  discount: number;
  trialEndsAt: Date | null;
}

/** Find a user's subscription by order or subscription id. */
export async function findUserSubscription(opts: {
  userId: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
}): Promise<SubscriptionRecord | null> {
    let q = supabaseAdmin()
      .from("subscriptions")
      .select("id,plan,billing_cycle,amount,coupon_code,discount,trial_ends_at")
      .eq("user_id", opts.userId);
    if (opts.razorpaySubscriptionId) q = q.eq("razorpay_subscription_id", opts.razorpaySubscriptionId);
    else if (opts.razorpayOrderId) q = q.eq("razorpay_order_id", opts.razorpayOrderId);
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const s = data as {
      id: string; plan: string; billing_cycle: string; amount: number;
      coupon_code: string | null; discount: number | null; trial_ends_at: string | null;
    };
    return {
      id: s.id,
      plan: s.plan,
      billingCycle: s.billing_cycle === "yearly" ? "yearly" : "monthly",
      amount: s.amount,
      couponCode: s.coupon_code,
      discount: s.discount ?? 0,
      trialEndsAt: s.trial_ends_at ? new Date(s.trial_ends_at) : null,
    };
}

export interface SubscriptionPatch {
  status?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

const SUB_FIELD_MAP: Record<keyof SubscriptionPatch, string> = {
  status: "status",
  razorpayPaymentId: "razorpay_payment_id",
  razorpaySignature: "razorpay_signature",
  periodStart: "period_start",
  periodEnd: "period_end",
};

export interface PaidInvoice {
  id: string;
  plan: string;
  billingCycle: string;
  amount: number;
  currency: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  paymentId: string | null;
  createdAt: Date;
}

/** List a user's paid subscriptions (invoice history). */
export async function listPaidSubscriptions(userId: string, limit: number): Promise<PaidInvoice[]> {
    const { data } = await supabaseAdmin()
      .from("subscriptions")
      .select("id,plan,billing_cycle,amount,currency,period_start,period_end,razorpay_payment_id,created_at")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as {
      id: string; plan: string; billing_cycle: string; amount: number; currency: string;
      period_start: string | null; period_end: string | null; razorpay_payment_id: string | null; created_at: string;
    }[]).map((s) => ({
      id: s.id, plan: s.plan, billingCycle: s.billing_cycle, amount: s.amount, currency: s.currency,
      periodStart: s.period_start ? new Date(s.period_start) : null,
      periodEnd: s.period_end ? new Date(s.period_end) : null,
      paymentId: s.razorpay_payment_id, createdAt: new Date(s.created_at),
    }));
}

export interface InvoiceDetail {
  id: string;
  plan: string;
  billingCycle: string;
  amount: number;
  currency: string;
  discount: number;
  couponCode: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  paymentId: string | null;
  createdAt: Date;
}

/** Fetch a single paid subscription owned by the user (for an invoice PDF/HTML). */
export async function getPaidSubscriptionById(userId: string, id: string): Promise<InvoiceDetail | null> {
    const { data } = await supabaseAdmin()
      .from("subscriptions")
      .select("id,plan,billing_cycle,amount,currency,discount,coupon_code,period_start,period_end,razorpay_payment_id,created_at")
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "paid")
      .maybeSingle();
    if (!data) return null;
    const s = data as {
      id: string; plan: string; billing_cycle: string; amount: number; currency: string; discount: number | null;
      coupon_code: string | null; period_start: string | null; period_end: string | null; razorpay_payment_id: string | null; created_at: string;
    };
    return {
      id: s.id, plan: s.plan, billingCycle: s.billing_cycle, amount: s.amount, currency: s.currency,
      discount: s.discount ?? 0, couponCode: s.coupon_code,
      periodStart: s.period_start ? new Date(s.period_start) : null,
      periodEnd: s.period_end ? new Date(s.period_end) : null,
      paymentId: s.razorpay_payment_id, createdAt: new Date(s.created_at),
    };
}

export interface InvoiceUserProfile {
  name: string | null;
  email: string | null;
  billing: Record<string, string> | null;
}

/** Read a user's name/email/billing for invoice rendering. */
export async function getInvoiceUserProfile(userId: string): Promise<InvoiceUserProfile | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("name,email,billing")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    const u = data as { name: string | null; email: string | null; billing: Record<string, string> | null };
    return { name: u.name, email: u.email, billing: u.billing };
}

/** Count beta users, and flip the current user to a beta plan. */
export async function betaUserCount(): Promise<number> {
    const { count } = await supabaseAdmin()
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("beta_user", true);
    return count ?? 0;
}

/** Update a subscription record by its native id. */
export async function updateSubscriptionRecord(id: string, patch: SubscriptionPatch): Promise<void> {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      row[SUB_FIELD_MAP[k as keyof SubscriptionPatch]] = toSb(v);
    }
    if (Object.keys(row).length) {
      const { error } = await supabaseAdmin().from("subscriptions").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    }
    return;
}

/** Record a webhook event id for idempotency. Returns false if already seen. */
export async function recordWebhookEvent(id: string, event: string): Promise<boolean> {
    const { error } = await supabaseAdmin().from("webhook_events").insert({ id, event });
    return !error;
}

export interface RzpUser {
  id: string;
  plan: string;
  billingCycle: string | null;
  email: string | null;
  name: string | null;
}

/** Find a user by their Razorpay subscription id. */
export async function findUserByRazorpaySubId(subId: string): Promise<RzpUser | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("id,plan,billing_cycle,email,name")
      .eq("razorpay_subscription_id", subId)
      .maybeSingle();
    if (!data) return null;
    const u = data as { id: string; plan: string; billing_cycle: string | null; email: string | null; name: string | null };
    return { id: u.id, plan: u.plan, billingCycle: u.billing_cycle, email: u.email, name: u.name };
}

/** Update a user's plan fields by Razorpay subscription id. Returns the user. */
export async function updateUserByRazorpaySubId(
  subId: string,
  patch: UserPlanPatch,
): Promise<RzpUser | null> {
  const user = await findUserByRazorpaySubId(subId);
  if (!user) return null;
  await updateUserPlan(user.id, patch);
  return user;
}

/** Insert an invoice row keyed by payment id, if not already present. */
export async function upsertInvoiceByPaymentId(
  paymentId: string,
  input: SubscriptionInput,
): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from("subscriptions")
      .select("id")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();
    if (existing) return false;
    await createSubscriptionRecord({ ...input, razorpayPaymentId: paymentId });
    return true;
}
