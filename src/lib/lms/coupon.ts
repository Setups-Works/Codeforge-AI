import { computeDiscount } from "@/lib/coupon-math";

export interface CourseCouponRule {
  code: string;
  type: "percent" | "flat";
  value: number;
  active: boolean;
  expiresAt: Date | null;
  /** -1 = unlimited. */
  maxRedemptions: number;
  usedCount: number;
  appliesTo: "plan" | "course" | "all";
  /** Empty = every course. */
  courseIds: string[];
  minAmount: number;
  oncePerUser: boolean;
}

export type CouponEvaluation =
  | { ok: true; code: string; discount: number; finalAmount: number }
  | { ok: false; reason: string };

/** Decide whether a coupon applies to a course purchase, and by how much. Pure; the caller supplies facts from the DB. */
export function evaluateCourseCoupon(
  coupon: CourseCouponRule | null,
  ctx: { courseId: string; price: number; alreadyRedeemed: boolean; now?: Date },
): CouponEvaluation {
  const now = ctx.now ?? new Date();
  if (!coupon || !coupon.active) return { ok: false, reason: "Invalid or inactive coupon" };
  if (coupon.appliesTo === "plan") return { ok: false, reason: "This coupon is for subscription plans, not courses" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) return { ok: false, reason: "This coupon has expired" };
  if (coupon.maxRedemptions >= 0 && coupon.usedCount >= coupon.maxRedemptions) return { ok: false, reason: "This coupon has reached its limit" };
  if (coupon.courseIds.length > 0 && !coupon.courseIds.includes(ctx.courseId)) return { ok: false, reason: "This coupon doesn't apply to this course" };
  if (coupon.minAmount > 0 && ctx.price < coupon.minAmount) return { ok: false, reason: `Valid on orders of ₹${coupon.minAmount} or more` };
  if (coupon.oncePerUser && ctx.alreadyRedeemed) return { ok: false, reason: "You've already used this coupon" };

  const discount = computeDiscount(coupon, ctx.price);
  return { ok: true, code: coupon.code, discount, finalAmount: Math.max(0, ctx.price - discount) };
}
