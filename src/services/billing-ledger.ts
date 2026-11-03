import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, getPlanById } from "@/lib/plans";
import { lmsEnabled } from "@/lib/lms/flag";
import { refundDeadline } from "@/lib/lms/refund";
import { listPaidSubscriptions } from "@/services/billing-store";
import { courseRow, mergeLedger, subscriptionRow, type LedgerRow } from "@/lib/billing-ledger";

/** Everything the user has paid for — plan payments and course purchases — newest first. */
export async function getBillingLedger(userId: string, limit = 50): Promise<LedgerRow[]> {
  const subs = await listPaidSubscriptions(userId, limit);
  const subRows = subs.map((s) => subscriptionRow(s, PLANS[s.plan as keyof typeof PLANS]?.name ?? getPlanById(s.plan).name));

  if (!lmsEnabled()) return mergeLedger(subRows);

  const client = supabaseAdmin();
  const { data, error } = await client
    .from("course_orders")
    .select("id,course_id,amount_inr,currency,status,paid_at")
    .eq("user_id", userId)
    .in("status", ["paid", "refunded"])
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const orders = (data ?? []) as {
    id: string;
    course_id: string;
    amount_inr: number;
    currency: string;
    status: "paid" | "refunded";
    paid_at: string | null;
  }[];

  const courseIds = [...new Set(orders.map((o) => o.course_id))];
  const { data: courses } = courseIds.length
    ? await client.from("courses").select("id,title,slug").in("id", courseIds)
    : { data: [] };
  const byId = new Map(((courses ?? []) as { id: string; title: string; slug: string }[]).map((c) => [c.id, c]));
  const now = new Date();

  const courseRows = orders.map((o) => {
    const paidAt = o.paid_at ? new Date(o.paid_at) : null;
    const deadline = paidAt ? refundDeadline(paidAt) : null;
    return courseRow({
      id: o.id,
      courseTitle: byId.get(o.course_id)?.title ?? "Course",
      courseSlug: byId.get(o.course_id)?.slug ?? null,
      amount: o.amount_inr,
      currency: o.currency,
      status: o.status,
      paidAt,
      refundableUntil: o.status === "paid" && deadline && deadline > now ? deadline : null,
    });
  });

  return mergeLedger(subRows, courseRows);
}

export interface CouponRedemption {
  id: string;
  code: string;
  /** Amount taken off, in whole currency units. */
  discount: number;
  redeemedAt: Date;
}

/** Coupons the user has redeemed, newest first. */
export async function listCouponRedemptions(userId: string, limit = 50): Promise<CouponRedemption[]> {
  const { data, error } = await supabaseAdmin()
    .from("coupon_redemptions")
    .select("id,code,discount,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; code: string | null; discount: number | null; created_at: string }[]).map((r) => ({
    id: r.id,
    code: r.code ?? "—",
    discount: Number(r.discount ?? 0),
    redeemedAt: new Date(r.created_at),
  }));
}

export interface CourseInvoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "refunded";
  paidAt: Date;
  paymentId: string | null;
  courseTitle: string;
}

/** One paid (or refunded) course order owned by the user, for the printable invoice. */
export async function getCourseInvoice(userId: string, orderId: string): Promise<CourseInvoice | null> {
  const client = supabaseAdmin();
  const { data } = await client
    .from("course_orders")
    .select("id,course_id,amount_inr,currency,status,paid_at,razorpay_payment_id")
    .eq("id", orderId)
    .eq("user_id", userId)
    .in("status", ["paid", "refunded"])
    .maybeSingle();
  const o = data as {
    id: string;
    course_id: string;
    amount_inr: number;
    currency: string;
    status: "paid" | "refunded";
    paid_at: string | null;
    razorpay_payment_id: string | null;
  } | null;
  if (!o || !o.paid_at) return null;
  const { data: course } = await client.from("courses").select("title").eq("id", o.course_id).maybeSingle();
  return {
    id: o.id,
    amount: o.amount_inr,
    currency: o.currency,
    status: o.status,
    paidAt: new Date(o.paid_at),
    paymentId: o.razorpay_payment_id,
    courseTitle: (course as { title: string } | null)?.title ?? "Course",
  };
}
