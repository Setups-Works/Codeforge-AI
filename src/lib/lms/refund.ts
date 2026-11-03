import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";

const DAY_MS = 86_400_000;

/** When a paid order stops being refundable. */
export function refundDeadline(paidAt: Date, days: number = COURSE_REFUND_DAYS): Date {
  return new Date(paidAt.getTime() + days * DAY_MS);
}

/** True while the order is inside its refund window. */
export function isRefundable(paidAt: Date | null, now: Date = new Date(), days: number = COURSE_REFUND_DAYS): boolean {
  if (!paidAt) return false;
  return now.getTime() < refundDeadline(paidAt, days).getTime();
}
