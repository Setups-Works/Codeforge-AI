import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRazorpay, paymentsEnabled, publicKeyId, verifyCheckoutSignature } from "@/lib/razorpay";
import { sendEmail } from "@/lib/mailer";
import { courseReceiptEmailHtml, courseReceiptEmailSubject } from "@/lib/email-templates";
import { getPostHogServer } from "@/lib/posthog-server";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { formatPrice } from "@/lib/plans";
import { firstLessons, getEnrollment, refreshStudentCount, type Enrollment } from "@/services/lms-learn";

/**
 * Course purchases. The price is always read from the database here; the
 * browser only ever names a course. Fulfilment is idempotent: the checkout
 * callback and the Razorpay webhook can both fire and only the first one
 * enrols and emails.
 */

const sb = () => supabaseAdmin();
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

export type OrderStatus = "created" | "paid" | "failed" | "refunded";

export interface CourseOrder {
  id: string;
  userId: string;
  courseId: string;
  amountInr: number;
  currency: string;
  status: OrderStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

interface OrderRow {
  id: string;
  user_id: string;
  course_id: string;
  amount_inr: number;
  currency: string;
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
}

const ORDER_COLS = "id,user_id,course_id,amount_inr,currency,status,razorpay_order_id,razorpay_payment_id,created_at,paid_at";

const orderFromRow = (r: OrderRow): CourseOrder => ({
  id: r.id,
  userId: r.user_id,
  courseId: r.course_id,
  amountInr: r.amount_inr,
  currency: r.currency,
  status: r.status,
  razorpayOrderId: r.razorpay_order_id,
  razorpayPaymentId: r.razorpay_payment_id,
  createdAt: new Date(r.created_at),
  paidAt: r.paid_at ? new Date(r.paid_at) : null,
});

type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

const isActive = (e: Enrollment | null) => Boolean(e && (!e.expiresAt || e.expiresAt > new Date()));

export type CheckoutResult =
  | { ok: true; free: true }
  | { ok: true; free: false; razorpayOrderId: string; amountPaise: number; currency: string; key: string; courseTitle: string }
  | Fail;

/** Start a purchase: enrol directly if the course is free, else create a Razorpay order. */
export async function createCheckout(userId: string, courseId: string): Promise<CheckoutResult> {
  const client = sb();
  const { data: course, error } = await client
    .from("courses")
    .select("id,title,status,is_free,price_inr")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const c = course as { id: string; title: string; status: string; is_free: boolean; price_inr: number } | null;
  if (!c || c.status !== "published") return fail(404, "Course not found");

  if (isActive(await getEnrollment(userId, courseId))) return fail(409, "You already own this course");

  if (c.is_free || c.price_inr <= 0) {
    const { error: insertError } = await client
      .from("course_enrollments")
      .upsert({ user_id: userId, course_id: courseId, source: "free" }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    if (insertError) throw new Error(insertError.message);
    await refreshStudentCount(courseId);
    return { ok: true, free: true };
  }

  if (!paymentsEnabled()) return fail(503, "Payments aren't available yet.");

  const { data: order, error: orderError } = await client
    .from("course_orders")
    .insert({ user_id: userId, course_id: courseId, amount_inr: c.price_inr })
    .select("id")
    .single();
  if (orderError) throw new Error(orderError.message);
  const orderId = (order as { id: string }).id;

  try {
    const amountPaise = c.price_inr * 100;
    const rzp = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `crs_${orderId.replace(/-/g, "").slice(0, 30)}`,
      notes: { type: "course", orderId, userId, courseId },
    });
    await client.from("course_orders").update({ razorpay_order_id: rzp.id }).eq("id", orderId);
    return { ok: true, free: false, razorpayOrderId: rzp.id, amountPaise, currency: "INR", key: publicKeyId(), courseTitle: c.title };
  } catch (e) {
    await client.from("course_orders").update({ status: "failed", failed_at: new Date().toISOString() }).eq("id", orderId);
    throw e;
  }
}

async function findByRazorpayOrder(razorpayOrderId: string): Promise<CourseOrder | null> {
  const { data, error } = await sb().from("course_orders").select(ORDER_COLS).eq("razorpay_order_id", razorpayOrderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? orderFromRow(data as OrderRow) : null;
}

export type FulfilResult = { ok: true; order: CourseOrder; firstTime: boolean } | Fail;

/**
 * Mark an order paid and enrol the buyer. Safe to call repeatedly or
 * concurrently: only the call that flips created/failed -> paid does the
 * side effects, and the enrolment insert ignores duplicates.
 */
async function fulfil(order: CourseOrder, paymentId: string): Promise<FulfilResult> {
  const client = sb();
  if (order.status === "refunded") return fail(409, "This order was refunded");

  const { data: flipped, error } = await client
    .from("course_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), razorpay_payment_id: paymentId })
    .eq("id", order.id)
    .in("status", ["created", "failed"])
    .select(ORDER_COLS);
  if (error) throw new Error(error.message);

  const firstTime = Boolean(flipped?.length);
  const paid = firstTime ? orderFromRow((flipped as OrderRow[])[0]) : order;

  // Always ensure the enrolment exists, even on a repeat call (heals a crash between steps).
  const { error: enrolError } = await client
    .from("course_enrollments")
    .upsert(
      { user_id: order.userId, course_id: order.courseId, source: "purchase", order_id: order.id },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
  if (enrolError) throw new Error(enrolError.message);

  if (firstTime) {
    await refreshStudentCount(order.courseId);
    void sendReceipt(paid).catch((e) => console.error("[course-receipt]", e));
    getPostHogServer()?.capture({
      distinctId: order.userId,
      event: "course_purchased",
      properties: { courseId: order.courseId, amountInr: order.amountInr },
    });
  }
  return { ok: true, order: paid, firstTime };
}

async function sendReceipt(order: CourseOrder): Promise<void> {
  const client = sb();
  const [{ data: user }, { data: course }] = await Promise.all([
    client.from("users").select("name,email").eq("id", order.userId).maybeSingle(),
    client.from("courses").select("title,slug").eq("id", order.courseId).maybeSingle(),
  ]);
  const u = user as { name: string | null; email: string | null } | null;
  const c = course as { title: string; slug: string } | null;
  if (!u?.email || !c) return;
  await sendEmail({
    to: u.email,
    subject: courseReceiptEmailSubject(c.title),
    html: courseReceiptEmailHtml({
      name: u.name ?? u.email.split("@")[0],
      courseTitle: c.title,
      amountLabel: formatPrice(order.amountInr),
      refundDays: COURSE_REFUND_DAYS,
      courseUrl: `${APP_URL}/learn/courses/${c.slug}`,
    }),
  });
}

export interface VerifyInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/** Browser callback after Razorpay Checkout: verify the signature, then fulfil. */
export async function verifyPurchase(
  userId: string,
  courseId: string,
  input: VerifyInput,
): Promise<{ ok: true; resumeLessonId: string | null } | Fail> {
  const order = await findByRazorpayOrder(input.razorpayOrderId);
  // The order must belong to this user and this course.
  if (!order || order.userId !== userId || order.courseId !== courseId) return fail(404, "Order not found");

  if (
    !verifyCheckoutSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })
  ) {
    return fail(400, "Payment signature could not be verified");
  }

  const result = await fulfil(order, input.razorpayPaymentId);
  if (!result.ok) return result;
  const first = (await firstLessons([courseId])).get(courseId) ?? null;
  return { ok: true, resumeLessonId: first };
}

/**
 * Webhook `payment.captured`: fulfil the order if the captured amount matches.
 * Returns false when the payment isn't one of ours (e.g. a subscription charge).
 */
export async function handleCapturedPayment(p: {
  orderId?: string;
  paymentId?: string;
  amountPaise?: number;
  currency?: string;
}): Promise<boolean> {
  if (!p.orderId || !p.paymentId) return false;
  const order = await findByRazorpayOrder(p.orderId);
  if (!order) return false;
  if (p.amountPaise !== order.amountInr * 100 || (p.currency ?? "INR") !== order.currency) {
    console.error("[course-webhook] amount mismatch", { order: order.id, got: p.amountPaise });
    return true; // ours, but not fulfilled; don't let another handler touch it
  }
  const result = await fulfil(order, p.paymentId);
  if (!result.ok) console.error("[course-webhook]", result.error);
  return true;
}

/** Webhook `payment.failed`: record the failure on a still-open order. */
export async function handleFailedPayment(razorpayOrderId?: string): Promise<boolean> {
  if (!razorpayOrderId) return false;
  const order = await findByRazorpayOrder(razorpayOrderId);
  if (!order) return false;
  await sb()
    .from("course_orders")
    .update({ status: "failed", failed_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "created");
  return true;
}

// ── Admin ───────────────────────────────────────────────────────────────

export interface AdminOrder extends CourseOrder {
  courseTitle: string | null;
  userName: string | null;
  userEmail: string | null;
}

export async function adminListOrders(limit = 200): Promise<AdminOrder[]> {
  const client = sb();
  const { data, error } = await client.from("course_orders").select(ORDER_COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const orders = ((data ?? []) as OrderRow[]).map(orderFromRow);
  if (!orders.length) return [];

  const courseIds = [...new Set(orders.map((o) => o.courseId))];
  const userIds = [...new Set(orders.map((o) => o.userId))];
  const [courses, users] = await Promise.all([
    client.from("courses").select("id,title").in("id", courseIds),
    client.from("users").select("id,name,email").in("id", userIds),
  ]);
  const titleById = new Map(((courses.data ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));
  const userById = new Map(((users.data ?? []) as { id: string; name: string | null; email: string | null }[]).map((u) => [u.id, u]));

  return orders.map((o) => ({
    ...o,
    courseTitle: titleById.get(o.courseId) ?? null,
    userName: userById.get(o.userId)?.name ?? null,
    userEmail: userById.get(o.userId)?.email ?? null,
  }));
}
