/**
 * Tunable growth settings. Change numbers here, not in services or components.
 */
export const GROWTH = {
  referral: {
    /** % off a referred learner's first course purchase. */
    refereePercent: 10,
    /** % off coupon the referrer receives once the referee's first purchase is paid. */
    referrerPercent: 15,
    /** How long the referrer's reward coupon stays valid. */
    rewardValidDays: 90,
    /** Cookie that carries a referral code from the share link to checkout. */
    cookie: "sw_ref",
    cookieDays: 30,
  },
  emails: {
    /** Drip-unlock emails go out for lessons that opened within this window. */
    dripWindowHours: 26,
  },
} as const;

/** Plans that can include a course, in display order. */
export const INCLUDABLE_PLANS = ["go", "plus"] as const;
export type IncludablePlan = (typeof INCLUDABLE_PLANS)[number];

/** True when the learner's current paid plan is one of the plans a course is included in. */
export function planCoversCourse(
  plan: string | null | undefined,
  planExpiresAt: Date | string | null | undefined,
  includedInPlans: readonly string[],
  now: Date = new Date(),
): boolean {
  if (!plan || plan === "free" || includedInPlans.length === 0) return false;
  if (!includedInPlans.includes(plan)) return false;
  if (planExpiresAt && new Date(planExpiresAt).getTime() <= now.getTime()) return false;
  return true;
}
