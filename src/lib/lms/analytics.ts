/** Pure aggregation for the admin analytics screens, so the maths is tested without a database. */

export const percentOf = (part: number, whole: number): number => (whole <= 0 ? 0 : Math.round((part / whole) * 100));

export interface OrderFact {
  amountInr: number;
  status: "created" | "paid" | "failed" | "refunded";
  paidAt: Date | null;
  refundedAt: Date | null;
}

export interface RevenueSummary {
  gross: number;
  refunded: number;
  net: number;
  paidOrders: number;
  refundedOrders: number;
}

/**
 * Money in a window. Gross counts every order paid since `since`; refunded
 * counts orders refunded since `since` (whenever they were paid), so net is
 * what the business actually kept over the period.
 */
export function summariseRevenue(orders: OrderFact[], since: Date | null): RevenueSummary {
  const inWindow = (d: Date | null) => Boolean(d && (!since || d.getTime() >= since.getTime()));
  let gross = 0;
  let refunded = 0;
  let paidOrders = 0;
  let refundedOrders = 0;
  for (const o of orders) {
    if ((o.status === "paid" || o.status === "refunded") && inWindow(o.paidAt)) {
      gross += o.amountInr;
      paidOrders++;
    }
    if (o.status === "refunded" && inWindow(o.refundedAt ?? o.paidAt)) {
      refunded += o.amountInr;
      refundedOrders++;
    }
  }
  return { gross, refunded, net: gross - refunded, paidOrders, refundedOrders };
}

export interface FunnelStep {
  lessonId: string;
  title: string;
  completed: number;
  /** Share of enrolled learners who finished this lesson. */
  percent: number;
  /** Percentage points lost versus the previous lesson (0 for the first, never negative). */
  dropOff: number;
}

/** Per-lesson completion in curriculum order, with the drop-off from the lesson before. */
export function buildFunnel(lessons: { id: string; title: string }[], completedByLesson: Map<string, number>, enrolled: number): FunnelStep[] {
  let previous = 100;
  return lessons.map((l, i) => {
    const completed = Math.min(completedByLesson.get(l.id) ?? 0, enrolled);
    const pct = percentOf(completed, enrolled);
    const step = { lessonId: l.id, title: l.title, completed, percent: pct, dropOff: i === 0 ? 0 : Math.max(0, previous - pct) };
    previous = pct;
    return step;
  });
}
