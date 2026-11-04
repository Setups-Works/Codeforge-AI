import { generateReferralCode, generateRewardCouponCode, isReferralOrderCode, isValidReferralCode, referralCodeFromOrder, referralOrderCode, refereeDiscount } from "@/lib/lms/referral";
import { GROWTH } from "@/lib/lms/growth";

describe("referral codes", () => {
  it("generates unique, valid codes", () => {
    const codes = new Set(Array.from({ length: 300 }, generateReferralCode));
    expect(codes.size).toBe(300);
    for (const c of codes) expect(isValidReferralCode(c)).toBe(true);
  });
  it("rejects malformed codes (including ambiguous characters and injection attempts)", () => {
    for (const bad of ["", "short", "ABCDEFG0", "ABCDEFGI", "abcdefgh", "ABCD EFG", "ABCDEFGH1", "'; drop--"]) expect(isValidReferralCode(bad)).toBe(false);
  });
  it("makes distinguishable reward coupon codes", () => {
    expect(generateRewardCouponCode()).toMatch(/^THANKS-[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe("order markers", () => {
  it("round-trips a referral code through the order's coupon field", () => {
    const marker = referralOrderCode("K7M2QX9D");
    expect(isReferralOrderCode(marker)).toBe(true);
    expect(referralCodeFromOrder(marker)).toBe("K7M2QX9D");
  });
  it("does not mistake real coupons for referrals", () => {
    expect(isReferralOrderCode("LAUNCH20")).toBe(false);
    expect(isReferralOrderCode(null)).toBe(false);
  });
});

describe("refereeDiscount", () => {
  it("applies the configured percentage", () => {
    expect(refereeDiscount(1000)).toBe(Math.round((1000 * GROWTH.referral.refereePercent) / 100));
  });
  it("never exceeds the price", () => {
    expect(refereeDiscount(0)).toBe(0);
    expect(refereeDiscount(5)).toBeLessThanOrEqual(5);
  });
});
