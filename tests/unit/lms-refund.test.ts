import { isRefundable, refundDeadline } from "@/lib/lms/refund";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";

const paid = new Date("2026-11-01T10:00:00Z");
const DAY = 86_400_000;

describe("refund window", () => {
  it("uses the configured number of days", () => {
    expect(refundDeadline(paid).getTime() - paid.getTime()).toBe(COURSE_REFUND_DAYS * DAY);
    expect(COURSE_REFUND_DAYS).toBe(14);
  });
  it("is refundable just before the deadline and not at or after it", () => {
    const deadline = refundDeadline(paid);
    expect(isRefundable(paid, new Date(deadline.getTime() - 1))).toBe(true);
    expect(isRefundable(paid, deadline)).toBe(false);
    expect(isRefundable(paid, new Date(deadline.getTime() + DAY))).toBe(false);
  });
  it("is never refundable without a payment date", () => {
    expect(isRefundable(null)).toBe(false);
  });
});
