import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRazorpay, paymentsEnabled, publicKeyId, verifyCheckoutSignature } from "@/lib/razorpay";
import { sendEmail } from "@/lib/mailer";
import { courseReceiptEmailHtml, courseReceiptEmailSubject } from "@/lib/email-templates";
import { getPostHogServer } from "@/lib/posthog-server";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { formatPrice } from "@/lib/plans";
import { normalizeCode } from "@/lib/coupon-math";
import { redeemCoupon } from "@/lib/coupons";
import { planCoversCourse } from "@/lib/lms/growth";
import { isReferralOrderCode, referralOrderCode, refereeDiscount } from "@/lib/lms/referral";
import { recordReferralReward, referralEligibility } from "@/services/lms-referrals";
import { evaluateCourseCoupon, type CouponEvaluation, type CourseCouponRule } from "@/lib/lms/coupon";
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
  /** Exactly one of courseId / bundleId is set. */
  courseId: string | null;
  bundleId: string | null;
  amountInr: number;
  currency: string;
  status: OrderStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  couponCode: string | null;
  discountInr: number;
}

interface OrderRow {
  id: string;
  user_id: string;
  course_id: string | null;
  bundle_id: string | null;
  amount_inr: number;
  currency: string;
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  coupon_code: string | null;
  discount_inr: number;
}

const ORDER_COLS = "id,user_id,course_id,bundle_id,amount_inr,currency,status,razorpay_order_id,razorpay_payment_id,created_at,paid_at,coupon_code,discount_inr";

const orderFromRow = (r: OrderRow): CourseOrder => ({
  id: r.id,
  userId: r.user_id,
  courseId: r.course_id,
  bundleId: r.bundle_id,
  amountInr: r.amount_inr,
  currency: r.currency,
  status: r.status,
  razorpayOrderId: r.razorpay_order_id,
  razorpayPaymentId: r.razorpay_payment_id,
  createdAt: new Date(r.created_at),
  paidAt: r.paid_at ? new Date(r.paid_at) : null,
  couponCode: r.coupon_code,
  discountInr: r.discount_inr,
});

type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

/**
 * Make sure the buyer is enrolled. A plan-included enrolment is upgraded to a
 * real purchase (otherwise it would lapse with the subscription); any other
 * existing enrolment is left exactly as it is.
 */
async function ensureEnrollment(userId: string, courseId: string, source: "purchase" | "free" | "plan" | "bundle", orderId?: string): Promise<void> {
  const client = sb();
  const { data: existing } = await client.from("course_enrollments").select("id,source").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  const row = existing as { id: string; source: string } | null;
  if (!row) {
    const { error } = await client.from("course_enrollments").upsert(
      { user_id: userId, course_id: courseId, source, order_id: orderId ?? null },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return;
  }
  if (row.source === "plan" && source !== "plan") {
    const { error } = await client.from("course_enrollments").update({ source, order_id: orderId ?? null }).eq("id", row.id);
    if (error) throw new Error(error.message);
  }
}

const isActive = (e: Enrollment | null) => Boolean(e && (!e.expiresAt || e.expiresAt > new Date()));

interface CouponRow {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  active: boolean;
  expires_at: string | null;
  max_redemptions: number;
  used_count: number;
  applies_to: "plan" | "course" | "all";
  course_ids: string[] | null;
  min_amount: number;
  once_per_user: boolean;
}

/** Check a coupon code against a course for this user. Read-only; nothing is redeemed. */
export async function quoteCourseCoupon(
  userId: string,
  courseId: string,
  price: number,
  rawCode: string,
): Promise<CouponEvaluation> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "Enter a coupon code" };
  const client = sb();
  const { data } = await client.from("coupons").select("*").eq("code", code).maybeSingle();
  const row = data as CouponRow | null;
  const rule: CourseCouponRule | null = row
    ? {
        code: row.code,
        type: row.type,
        value: Number(row.value),
        active: row.active,
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        maxRedemptions: row.max_redemptions,
        usedCount: row.used_count,
        appliesTo: row.applies_to,
        courseIds: row.course_ids ?? [],
        minAmount: Number(row.min_amount),
        oncePerUser: row.once_per_user,
      }
    : null;
  let alreadyRedeemed = false;
  if (row?.once_per_user) {
    const { data: used } = await client.from("coupon_redemptions").select("id").eq("coupon_id", row.id).eq("user_id", userId).maybeSingle();
    alreadyRedeemed = Boolean(used);
  }
  return evaluateCourseCoupon(rule, { courseId, price, alreadyRedeemed });
}

export type CheckoutResult =
  | { ok: true; free: true }
  | { ok: true; free: false; razorpayOrderId: string; amountPaise: number; currency: string; key: string; courseTitle: string }
  | Fail;

/** Start a purchase: enrol directly if the course is free, else create a Razorpay order. */
export async function createCheckout(userId: string, courseId: string, couponCode?: string | null, referralCode?: string | null): Promise<CheckoutResult> {
  const client = sb();
  const { data: course, error } = await client
    .from("courses")
    .select("id,title,status,is_free,price_inr,included_in_plans")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const c = course as { id: string; title: string; status: string; is_free: boolean; price_inr: number; included_in_plans: string[] | null } | null;
  if (!c || c.status !== "published") return fail(404, "Course not found");

  if (isActive(await getEnrollment(userId, courseId))) return fail(409, "You already own this course");

  if (c.is_free || c.price_inr <= 0) {
    await ensureEnrollment(userId, courseId, "free");
    await refreshStudentCount(courseId);
    return { ok: true, free: true };
  }

  // Included in the learner's subscription: no payment, access follows the plan.
  const { data: u } = await client.from("users").select("plan,plan_expires_at").eq("id", userId).maybeSingle();
  const planRow = u as { plan: string | null; plan_expires_at: string | null } | null;
  if (planCoversCourse(planRow?.plan, planRow?.plan_expires_at, c.included_in_plans ?? [])) {
    await ensureEnrollment(userId, courseId, "plan");
    await refreshStudentCount(courseId);
    return { ok: true, free: true };
  }

  // The coupon is re-checked here; the preview the browser saw is never trusted.
  let discount = 0;
  let appliedCode: string | null = null;
  if (couponCode?.trim()) {
    const quote = await quoteCourseCoupon(userId, courseId, c.price_inr, couponCode);
    if (!quote.ok) return fail(400, quote.reason);
    discount = quote.discount;
    appliedCode = quote.code;
  }
  // A referral link gives the referred learner a first-purchase discount (it doesn't stack with a coupon).
  if (!appliedCode && referralCode) {
    const eligible = await referralEligibility(userId, referralCode);
    if (eligible.ok) {
      discount = refereeDiscount(c.price_inr);
      appliedCode = referralOrderCode(referralCode);
    }
  }
  const charge = c.price_inr - discount;

  // A coupon that covers the whole price enrols directly, with a zero-value paid order for the record.
  if (charge <= 0) {
    const now = new Date().toISOString();
    const { data: free, error: freeError } = await client
      .from("course_orders")
      .insert({ user_id: userId, course_id: courseId, amount_inr: 0, status: "paid", paid_at: now, coupon_code: appliedCode, discount_inr: discount })
      .select("id")
      .single();
    if (freeError) throw new Error(freeError.message);
    const orderId = (free as { id: string }).id;
    await ensureEnrollment(userId, courseId, "purchase", orderId);
    await refreshStudentCount(courseId);
    if (appliedCode && !isReferralOrderCode(appliedCode)) await redeemCoupon({ code: appliedCode, userId, discount });
    if (isReferralOrderCode(appliedCode)) await recordReferralReward({ id: orderId, userId, couponCode: appliedCode }).catch((e) => console.error("[referral]", e));
    return { ok: true, free: true };
  }

  if (!paymentsEnabled()) return fail(503, "Payments aren't available yet.");

  const { data: order, error: orderError } = await client
    .from("course_orders")
    .insert({ user_id: userId, course_id: courseId, amount_inr: charge, coupon_code: appliedCode, discount_inr: discount })
    .select("id")
    .single();
  if (orderError) throw new Error(orderError.message);
  const orderId = (order as { id: string }).id;

  try {
    const amountPaise = charge * 100;
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

/** Buy a bundle: one payment that enrols the learner in every course in it. */
export async function createBundleCheckout(userId: string, bundleId: string): Promise<CheckoutResult> {
  const client = sb();
  const { data: bundle, error } = await client.from("course_bundles").select("id,title,status,price_inr").eq("id", bundleId).maybeSingle();
  if (error) throw new Error(error.message);
  const b = bundle as { id: string; title: string; status: string; price_inr: number } | null;
  if (!b || b.status !== "published" || b.price_inr <= 0) return fail(404, "Bundle not found");

  const { data: items } = await client.from("course_bundle_items").select("course_id").eq("bundle_id", bundleId);
  const courseIds = ((items ?? []) as { course_id: string }[]).map((i) => i.course_id);
  const owned = await Promise.all(courseIds.map(async (id) => isActive(await getEnrollment(userId, id))));
  if (courseIds.length > 0 && owned.every(Boolean)) return fail(409, "You already own every course in this bundle");

  if (!paymentsEnabled()) return fail(503, "Payments aren't available yet.");

  const { data: order, error: orderError } = await client
    .from("course_orders")
    .insert({ user_id: userId, bundle_id: bundleId, amount_inr: b.price_inr })
    .select("id")
    .single();
  if (orderError) throw new Error(orderError.message);
  const orderId = (order as { id: string }).id;

  try {
    const amountPaise = b.price_inr * 100;
    const rzp = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `bnd_${orderId.replace(/-/g, "").slice(0, 30)}`,
      notes: { type: "bundle", orderId, userId, bundleId },
    });
    await client.from("course_orders").update({ razorpay_order_id: rzp.id }).eq("id", orderId);
    return { ok: true, free: false, razorpayOrderId: rzp.id, amountPaise, currency: "INR", key: publicKeyId(), courseTitle: b.title };
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
  const courseIds = await orderCourseIds(order);
  for (const courseId of courseIds) {
    await ensureEnrollment(order.userId, courseId, order.bundleId ? "bundle" : "purchase", order.id);
  }

  if (firstTime) {
    for (const courseId of courseIds) await refreshStudentCount(courseId);
    if (order.couponCode && isReferralOrderCode(order.couponCode)) {
      await recordReferralReward({ id: order.id, userId: order.userId, couponCode: order.couponCode }).catch((e) => console.error("[referral]", e));
    } else if (order.couponCode) {
      await redeemCoupon({ code: order.couponCode, userId: order.userId, discount: order.discountInr }).catch((e) => console.error("[course-coupon]", e));
    }
    void sendReceipt(paid).catch((e) => console.error("[course-receipt]", e));
    getPostHogServer()?.capture({
      distinctId: order.userId,
      event: "course_purchased",
      properties: { courseId: order.courseId, bundleId: order.bundleId, amountInr: order.amountInr },
    });
  }
  return { ok: true, order: paid, firstTime };
}

/** The course ids an order unlocks: one for a course order, every item for a bundle. */
async function orderCourseIds(order: CourseOrder): Promise<string[]> {
  if (order.courseId) return [order.courseId];
  if (!order.bundleId) return [];
  const { data, error } = await sb().from("course_bundle_items").select("course_id").eq("bundle_id", order.bundleId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { course_id: string }[]).map((r) => r.course_id);
}

async function sendReceipt(order: CourseOrder): Promise<void> {
  const client = sb();
  const [{ data: user }, target] = await Promise.all([
    client.from("users").select("name,email").eq("id", order.userId).maybeSingle(),
    order.courseId
      ? client.from("courses").select("title,slug").eq("id", order.courseId).maybeSingle().then(({ data }) => {
          const r = data as { title: string; slug: string } | null;
          return r ? { title: r.title, path: `/learn/courses/${r.slug}` } : null;
        })
      : client.from("course_bundles").select("title").eq("id", order.bundleId!).maybeSingle().then(({ data }) => {
          const r = data as { title: string } | null;
          return r ? { title: r.title, path: "/learn/my-courses" } : null;
        }),
  ]);
  const u = user as { name: string | null; email: string | null } | null;
  const c = target ? { title: target.title, slug: target.path } : null;
  if (!u?.email || !c) return;
  await sendEmail({
    to: u.email,
    subject: courseReceiptEmailSubject(c.title),
    html: courseReceiptEmailHtml({
      name: u.name ?? u.email.split("@")[0],
      courseTitle: c.title,
      amountLabel: formatPrice(order.amountInr),
      refundDays: COURSE_REFUND_DAYS,
      courseUrl: `${APP_URL}${c.slug}`,
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
  const done = await verifyOrder(userId, (o) => o.courseId === courseId, input);
  if (!done.ok) return done;
  const first = (await firstLessons([courseId])).get(courseId) ?? null;
  return { ok: true, resumeLessonId: first };
}

/** Same as {@link verifyPurchase} for a bundle order. */
export async function verifyBundlePurchase(userId: string, bundleId: string, input: VerifyInput): Promise<{ ok: true } | Fail> {
  const done = await verifyOrder(userId, (o) => o.bundleId === bundleId, input);
  return done.ok ? { ok: true } : done;
}

async function verifyOrder(userId: string, matches: (o: CourseOrder) => boolean, input: VerifyInput): Promise<{ ok: true } | Fail> {
  const order = await findByRazorpayOrder(input.razorpayOrderId);
  // The order must belong to this user and to the thing being bought.
  if (!order || order.userId !== userId || !matches(order)) return fail(404, "Order not found");

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
  return result.ok ? { ok: true } : result;
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

  const courseIds = [...new Set(orders.flatMap((o) => (o.courseId ? [o.courseId] : [])))];
  const bundleIds = [...new Set(orders.flatMap((o) => (o.bundleId ? [o.bundleId] : [])))];
  const userIds = [...new Set(orders.map((o) => o.userId))];
  const [courses, bundles, users] = await Promise.all([
    courseIds.length ? client.from("courses").select("id,title").in("id", courseIds) : Promise.resolve({ data: [] }),
    bundleIds.length ? client.from("course_bundles").select("id,title").in("id", bundleIds) : Promise.resolve({ data: [] }),
    client.from("users").select("id,name,email").in("id", userIds),
  ]);
  const titleById = new Map([...((courses.data ?? []) as { id: string; title: string }[]), ...((bundles.data ?? []) as { id: string; title: string }[])].map((c) => [c.id, c.title]));
  const userById = new Map(((users.data ?? []) as { id: string; name: string | null; email: string | null }[]).map((u) => [u.id, u]));

  return orders.map((o) => ({
    ...o,
    courseTitle: titleById.get((o.courseId ?? o.bundleId)!) ?? null,
    userName: userById.get(o.userId)?.name ?? null,
    userEmail: userById.get(o.userId)?.email ?? null,
  }));
}
