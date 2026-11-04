import { NextRequest, NextResponse } from "next/server";
import { GROWTH } from "@/lib/lms/growth";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { createCheckout } from "@/services/lms-orders";

export const runtime = "nodejs";

/** Start buying a course. The price comes from the database, never the request. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("payment", req, session.user.id);
  if (limited) return limited;

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  // Optional body: { couponCode }. An empty or missing body just means no coupon.
  const raw = (await req.json().catch(() => ({}))) as { couponCode?: unknown };
  const couponCode = typeof raw.couponCode === "string" ? raw.couponCode.slice(0, 40) : null;

  const referralCode = req.cookies.get(GROWTH.referral.cookie)?.value ?? null;
  const result = await createCheckout(session.user.id, id, couponCode, referralCode);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.free) return NextResponse.json({ free: true });
  return NextResponse.json({
    free: false,
    orderId: result.razorpayOrderId,
    amount: result.amountPaise,
    currency: result.currency,
    key: result.key,
    name: result.courseTitle,
  });
}
