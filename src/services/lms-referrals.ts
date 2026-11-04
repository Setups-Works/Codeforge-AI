import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/mailer";
import { referralRewardEmailHtml, referralRewardEmailSubject } from "@/lib/email-templates";
import { GROWTH } from "@/lib/lms/growth";
import { generateReferralCode, generateRewardCouponCode, isValidReferralCode, referralCodeFromOrder } from "@/lib/lms/referral";

/**
 * Referrals. A learner shares their link; a friend who buys their first course
 * through it gets a discount, and once that payment is confirmed the referrer
 * receives a one-time coupon. Rewards are normal coupons, so billing, redemption
 * limits and expiry all reuse the existing coupon system.
 */

const sb = () => supabaseAdmin();
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const client = sb();
  const { data } = await client.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (data) return (data as { code: string }).code;
  for (let i = 0; i < 5; i++) {
    const { data: created, error } = await client.from("referral_codes").insert({ user_id: userId, code: generateReferralCode() }).select("code").single();
    if (!error) return (created as { code: string }).code;
    // Lost a race for this user, or (very unlikely) a code collision.
    const { data: again } = await client.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (again) return (again as { code: string }).code;
  }
  throw new Error("Couldn't create a referral code");
}

/** Who owns a code, or null if it doesn't exist. */
export async function referrerForCode(code: string): Promise<string | null> {
  if (!isValidReferralCode(code)) return null;
  const { data } = await sb().from("referral_codes").select("user_id").eq("code", code).maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

/** A referral discount applies to a learner's first paid course purchase, never to their own code. */
export async function referralEligibility(userId: string, code: string): Promise<{ ok: true; referrerId: string } | { ok: false }> {
  const referrerId = await referrerForCode(code);
  if (!referrerId || referrerId === userId) return { ok: false };
  const { count } = await sb().from("course_orders").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "paid");
  if (count) return { ok: false };
  const { data: prior } = await sb().from("referrals").select("id").eq("referee_id", userId).maybeSingle();
  return prior ? { ok: false } : { ok: true, referrerId };
}

/** After a referred purchase is paid: record it and give the referrer a coupon. */
export async function recordReferralReward(order: { id: string; userId: string; couponCode: string }): Promise<void> {
  const client = sb();
  const referrerId = await referrerForCode(referralCodeFromOrder(order.couponCode));
  if (!referrerId || referrerId === order.userId) return;

  // referee_id is unique: a second attempt for the same friend is a no-op.
  const { data: referral, error } = await client.from("referrals").insert({ referrer_id: referrerId, referee_id: order.userId, order_id: order.id }).select("id").single();
  if (error) return;
  const referralId = (referral as { id: string }).id;

  const { referrerPercent, rewardValidDays } = GROWTH.referral;
  const code = generateRewardCouponCode();
  const { error: couponError } = await client.from("coupons").insert({
    code,
    description: "Referral reward",
    type: "percent",
    value: referrerPercent,
    max_redemptions: 1,
    once_per_user: true,
    applies_to: "all",
    expires_at: new Date(Date.now() + rewardValidDays * 86_400_000).toISOString(),
  });
  if (couponError) throw new Error(couponError.message);
  await client.from("referrals").update({ status: "rewarded", reward_coupon_code: code, rewarded_at: new Date().toISOString() }).eq("id", referralId);

  const { data: user } = await client.from("users").select("name,email,email_opt_out").eq("id", referrerId).maybeSingle();
  const u = user as { name: string | null; email: string | null; email_opt_out: boolean } | null;
  if (u?.email && !u.email_opt_out) {
    await sendEmail({
      to: u.email,
      subject: referralRewardEmailSubject(),
      html: referralRewardEmailHtml({ name: u.name ?? u.email.split("@")[0], code, percent: referrerPercent, validDays: rewardValidDays, url: `${APP_URL}/learn/courses` }),
    }).catch((e) => console.error("[referral-email]", e));
  }
}

export interface ReferralOverview {
  code: string;
  link: string;
  refereePercent: number;
  referrerPercent: number;
  referrals: { id: string; status: "pending" | "rewarded"; rewardCode: string | null; createdAt: Date }[];
}

export async function getReferralOverview(userId: string): Promise<ReferralOverview> {
  const code = await getOrCreateReferralCode(userId);
  const { data } = await sb().from("referrals").select("id,status,reward_coupon_code,created_at").eq("referrer_id", userId).order("created_at", { ascending: false }).limit(50);
  return {
    code,
    link: `${APP_URL}/invite/${code}`,
    refereePercent: GROWTH.referral.refereePercent,
    referrerPercent: GROWTH.referral.referrerPercent,
    referrals: ((data ?? []) as { id: string; status: "pending" | "rewarded"; reward_coupon_code: string | null; created_at: string }[]).map((r) => ({
      id: r.id,
      status: r.status,
      rewardCode: r.reward_coupon_code,
      createdAt: new Date(r.created_at),
    })),
  };
}
