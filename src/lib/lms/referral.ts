import { randomBytes } from "node:crypto";
import { computeDiscount } from "@/lib/coupon-math";
import { GROWTH } from "@/lib/lms/growth";

// No 0/O/1/I, so a code survives being read aloud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIX = "REF-";

const randomChars = (n: number) => Array.from(randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** A user's shareable referral code, e.g. "K7M2QX9D". */
export const generateReferralCode = () => randomChars(8);

/** A one-time coupon code handed to a referrer, e.g. "THANKS-4TNB7K". */
export const generateRewardCouponCode = () => `THANKS-${randomChars(6)}`;

export const isValidReferralCode = (code: string) => /^[A-HJ-NP-Z2-9]{8}$/.test(code);

/** The marker stored on an order that used a referral, instead of a real coupon code. */
export const referralOrderCode = (code: string) => `${PREFIX}${code}`;
export const isReferralOrderCode = (code: string | null | undefined): code is string => Boolean(code?.startsWith(PREFIX));
export const referralCodeFromOrder = (code: string) => code.slice(PREFIX.length);

/** Rupees off the referred learner's first course. */
export const refereeDiscount = (price: number) => computeDiscount({ type: "percent", value: GROWTH.referral.refereePercent }, price);
