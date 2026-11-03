import { type CouponDoc } from "@/types/db";
import { PLANS,type PlanId,type BillingCycle } from "@/lib/plans";
import { computeDiscount,normalizeCode } from "@/lib/coupon-math";
import { supabaseAdmin } from "@/lib/supabase/admin";


/** Map a Supabase coupons row (snake_case) to the CouponDoc shape the math uses. */
interface SbCouponRow {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  active: boolean;
  expires_at: string | null;
  max_redemptions: number;
  used_count: number;
  plans: string[] | null;
  min_amount: number;
  once_per_user: boolean;
}
function toCouponDoc(r: SbCouponRow): CouponDoc & { _id: string } {
  return {
    _id: r.id,
    code: r.code,
    type: r.type,
    value: r.value,
    active: r.active,
    expiresAt: r.expires_at ? new Date(r.expires_at) : undefined,
    maxRedemptions: r.max_redemptions,
    usedCount: r.used_count,
    plans: r.plans ?? [],
    minAmount: r.min_amount,
    oncePerUser: r.once_per_user,
  } as unknown as CouponDoc & { _id: string };
}

// Re-exported so existing importers of `@/lib/coupons` keep working; the pure
// implementations now live in the dependency-free `@/lib/coupon-math`.
export { computeDiscount, normalizeCode };

export interface CouponResult {
  ok: boolean;
  reason?: string;
  code?: string;
  type?: "percent" | "flat";
  value?: number;
  discount?: number; // rupees
  baseAmount?: number; // rupees
  finalAmount?: number; // rupees
}

function baseAmount(plan: PlanId, cycle: BillingCycle): number {
  const def = PLANS[plan];
  return cycle === "yearly" ? def.price.yearly : def.price.monthly;
}

/**
 * Validate a coupon for a given user + plan + cycle. Pure read — does not
 * redeem. Server-authoritative: the discount it returns is what we charge.
 */
export async function validateCoupon(opts: {
  code: string;
  plan: PlanId;
  cycle: BillingCycle;
  userId: string;
}): Promise<CouponResult> {
  const code = normalizeCode(opts.code);
  if (!code) return { ok: false, reason: "Enter a coupon code" };

  let coupon: (CouponDoc & { _id: string }) | null;
  let alreadyRedeemed: () => Promise<boolean>;

  {    const sb = supabaseAdmin();
    const { data } = await sb.from("coupons").select("*").eq("code", code).maybeSingle();
    coupon = data ? toCouponDoc(data as SbCouponRow) : null;
    const couponId = data ? (data as SbCouponRow).id : null;
    alreadyRedeemed = async () => {
      if (!couponId) return false;
      const { data: r } = await sb
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", couponId)
        .eq("user_id", opts.userId)
        .maybeSingle();
      return Boolean(r);
    };}

  if (!coupon || !coupon.active) return { ok: false, reason: "Invalid or inactive coupon" };

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "This coupon has expired" };
  }
  if (coupon.maxRedemptions >= 0 && coupon.usedCount >= coupon.maxRedemptions) {
    return { ok: false, reason: "This coupon has reached its limit" };
  }
  if (coupon.plans.length > 0 && !(coupon.plans as string[]).includes(opts.plan)) {
    return { ok: false, reason: "This coupon doesn't apply to the selected plan" };
  }

  const amount = baseAmount(opts.plan, opts.cycle);
  if (coupon.minAmount > 0 && amount < coupon.minAmount) {
    return { ok: false, reason: `Valid on orders of ₹${coupon.minAmount} or more` };
  }

  if (coupon.oncePerUser && (await alreadyRedeemed())) {
    return { ok: false, reason: "You've already used this coupon" };
  }

  const discount = computeDiscount(coupon, amount);
  return {
    ok: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
    baseAmount: amount,
    finalAmount: Math.max(0, amount - discount),
  };
}

/**
 * Atomically record a redemption after a successful payment. Increments the
 * coupon's usedCount only if there's headroom, and writes a per-user row
 * (idempotent via the unique (coupon,user) index).
 */
export async function redeemCoupon(opts: {
  code: string;
  userId: string;
  discount: number;
}): Promise<void> {
  const code = normalizeCode(opts.code);
  if (!code) return;
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("coupons")
      .select("id,max_redemptions")
      .eq("code", code)
      .maybeSingle();
    if (!data) return;
    const coupon = data as { id: string; max_redemptions: number };
    const { error } = await sb.from("coupon_redemptions").insert({
      coupon_id: coupon.id,
      code,
      user_id: opts.userId,
      discount: opts.discount,
    });
    // Duplicate (coupon,user) — already redeemed, don't double-count.
    if (error) return;
    await sb.rpc("increment_coupon_usage", {
      p_coupon: coupon.id,
      p_max: coupon.max_redemptions,
    });
    return;
}

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminCoupon {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  minAmount: number;
  maxRedemptions: number;
  usedCount: number;
  oncePerUser: boolean;
  plans: string[];
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}

/** Admin: list all coupons. */
export async function adminListCoupons(): Promise<AdminCoupon[]> {
    const { data } = await supabaseAdmin()
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    return ((data ?? []) as Record<string, unknown>[]).map((c) => ({
      id: c.id as string, code: c.code as string, description: (c.description as string) ?? "",
      type: c.type as string, value: c.value as number, minAmount: (c.min_amount as number) ?? 0,
      maxRedemptions: (c.max_redemptions as number) ?? -1, usedCount: (c.used_count as number) ?? 0,
      oncePerUser: Boolean(c.once_per_user), plans: (c.plans as string[]) ?? [],
      expiresAt: c.expires_at ? new Date(c.expires_at as string) : null,
      active: Boolean(c.active), createdAt: new Date(c.created_at as string),
    }));
}

export interface CreateCoupon {
  code: string;
  description: string;
  type: string;
  value: number;
  minAmount: number;
  maxRedemptions: number;
  oncePerUser: boolean;
  plans: string[];
  expiresAt: Date | null;
  active: boolean;
}

/** Admin: create a coupon. Returns its id, or null if the code exists. */
export async function createCoupon(input: CreateCoupon): Promise<string | null> {
    const sb = supabaseAdmin();
    const { data: exists } = await sb.from("coupons").select("id").eq("code", input.code).maybeSingle();
    if (exists) return null;
    const { data, error } = await sb.from("coupons").insert({
      code: input.code, description: input.description, type: input.type, value: input.value,
      min_amount: input.minAmount, max_redemptions: input.maxRedemptions, once_per_user: input.oncePerUser,
      plans: input.plans, expires_at: input.expiresAt ? input.expiresAt.toISOString() : null, active: input.active,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
}

export interface CouponPatch {
  active?: boolean;
  description?: string;
  value?: number;
  type?: string;
  minAmount?: number;
  maxRedemptions?: number;
  oncePerUser?: boolean;
  plans?: string[];
  expiresAt?: Date | null;
}

const COUPON_FIELD_MAP: Record<keyof CouponPatch, string> = {
  active: "active", description: "description", value: "value", type: "type",
  minAmount: "min_amount", maxRedemptions: "max_redemptions", oncePerUser: "once_per_user",
  plans: "plans", expiresAt: "expires_at",
};

/** Admin: update a coupon (never its code or usedCount). */
export async function updateCoupon(id: string, patch: CouponPatch): Promise<void> {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      row[COUPON_FIELD_MAP[k as keyof CouponPatch]] = v instanceof Date ? v.toISOString() : v;
    }
    if (Object.keys(row).length) await supabaseAdmin().from("coupons").update(row).eq("id", id);
    return;
}

/** Admin: delete a coupon. */
export async function deleteCoupon(id: string): Promise<void> {
    await supabaseAdmin().from("coupons").delete().eq("id", id);
    return;
}
