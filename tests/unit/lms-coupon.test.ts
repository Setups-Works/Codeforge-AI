import { evaluateCourseCoupon, type CourseCouponRule } from "@/lib/lms/coupon";

const rule = (over: Partial<CourseCouponRule> = {}): CourseCouponRule => ({
  code: "SAVE20", type: "percent", value: 20, active: true, expiresAt: null, maxRedemptions: -1, usedCount: 0,
  appliesTo: "course", courseIds: [], minAmount: 0, oncePerUser: false, ...over,
});
const ctx = { courseId: "c1", price: 500, alreadyRedeemed: false };

describe("evaluateCourseCoupon", () => {
  it("applies a percent and a flat discount and never goes below zero", () => {
    expect(evaluateCourseCoupon(rule(), ctx)).toEqual({ ok: true, code: "SAVE20", discount: 100, finalAmount: 400 });
    expect(evaluateCourseCoupon(rule({ type: "flat", value: 9999 }), ctx)).toMatchObject({ ok: true, discount: 500, finalAmount: 0 });
    expect(evaluateCourseCoupon(rule({ value: 100 }), ctx)).toMatchObject({ finalAmount: 0 });
  });
  it("accepts 'all' coupons and rejects plan-only ones", () => {
    expect(evaluateCourseCoupon(rule({ appliesTo: "all" }), ctx).ok).toBe(true);
    expect(evaluateCourseCoupon(rule({ appliesTo: "plan" }), ctx)).toMatchObject({ ok: false, reason: expect.stringMatching(/plans/) });
  });
  it("rejects missing, inactive, expired and exhausted coupons", () => {
    expect(evaluateCourseCoupon(null, ctx).ok).toBe(false);
    expect(evaluateCourseCoupon(rule({ active: false }), ctx).ok).toBe(false);
    expect(evaluateCourseCoupon(rule({ expiresAt: new Date("2020-01-01") }), ctx)).toMatchObject({ reason: expect.stringMatching(/expired/) });
    expect(evaluateCourseCoupon(rule({ maxRedemptions: 5, usedCount: 5 }), ctx)).toMatchObject({ reason: expect.stringMatching(/limit/) });
    expect(evaluateCourseCoupon(rule({ maxRedemptions: 5, usedCount: 4 }), ctx).ok).toBe(true);
  });
  it("restricts to listed courses", () => {
    expect(evaluateCourseCoupon(rule({ courseIds: ["other"] }), ctx).ok).toBe(false);
    expect(evaluateCourseCoupon(rule({ courseIds: ["c1", "other"] }), ctx).ok).toBe(true);
  });
  it("enforces the minimum order and once-per-user", () => {
    expect(evaluateCourseCoupon(rule({ minAmount: 600 }), ctx).ok).toBe(false);
    expect(evaluateCourseCoupon(rule({ minAmount: 500 }), ctx).ok).toBe(true);
    expect(evaluateCourseCoupon(rule({ oncePerUser: true }), { ...ctx, alreadyRedeemed: true }).ok).toBe(false);
    expect(evaluateCourseCoupon(rule({ oncePerUser: false }), { ...ctx, alreadyRedeemed: true }).ok).toBe(true);
  });
});
