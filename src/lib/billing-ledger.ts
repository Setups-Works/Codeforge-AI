/**
 * One normalised row shape for everything a user has paid for, so the billing
 * UI never branches on payment kind. Pure (no I/O) so the merge is unit-tested.
 */

export type LedgerKind = "subscription" | "course";
export type LedgerStatus = "paid" | "refunded";

export interface LedgerRow {
  id: string;
  kind: LedgerKind;
  /** ISO timestamp. */
  date: string;
  description: string;
  detail: string | null;
  amount: number;
  currency: string;
  status: LedgerStatus;
  /** Printable invoice for this row. */
  invoiceHref: string;
  /** Course purchases link to the course. */
  courseSlug: string | null;
  /** ISO deadline while a course purchase can still be refunded. */
  refundableUntil: string | null;
}

export interface SubscriptionPayment {
  id: string;
  plan: string;
  billingCycle: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

export interface CoursePurchase {
  id: string;
  courseTitle: string;
  courseSlug: string | null;
  amount: number;
  currency: string;
  status: "paid" | "refunded";
  paidAt: Date | null;
  refundableUntil: Date | null;
}

export function subscriptionRow(s: SubscriptionPayment, planName: string): LedgerRow {
  return {
    id: s.id,
    kind: "subscription",
    date: s.createdAt.toISOString(),
    description: `${planName} plan`,
    detail: s.billingCycle,
    amount: s.amount,
    currency: s.currency,
    status: "paid",
    invoiceHref: `/api/billing/invoice/${s.id}`,
    courseSlug: null,
    refundableUntil: null,
  };
}

export function courseRow(p: CoursePurchase): LedgerRow {
  return {
    id: p.id,
    kind: "course",
    date: (p.paidAt ?? new Date(0)).toISOString(),
    description: p.courseTitle,
    detail: "course",
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    invoiceHref: `/api/billing/course-invoice/${p.id}`,
    courseSlug: p.courseSlug,
    refundableUntil: p.refundableUntil ? p.refundableUntil.toISOString() : null,
  };
}

/** Newest first; ties broken by id so ordering is stable. */
export function mergeLedger(...lists: LedgerRow[][]): LedgerRow[] {
  return lists
    .flat()
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1));
}

/** Total of paid rows only (refunds excluded), per currency. */
export function totalsByCurrency(rows: LedgerRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.status !== "paid") continue;
    out[r.currency] = (out[r.currency] ?? 0) + r.amount;
  }
  return out;
}
