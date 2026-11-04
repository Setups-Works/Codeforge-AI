import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { verifyPurchaseSchema } from "@/schemas/course";
import { verifyBundlePurchase } from "@/services/lms-orders";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("payment", req, session.user.id);
  if (limited) return limited;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, verifyPurchaseSchema);
  if (body.error) return body.error;

  const result = await verifyBundlePurchase(session.user.id, id, {
    razorpayOrderId: body.data.razorpay_order_id,
    razorpayPaymentId: body.data.razorpay_payment_id,
    razorpaySignature: body.data.razorpay_signature,
  });
  return result.ok ? NextResponse.json({ ok: true, resumeLessonId: null }) : NextResponse.json({ error: result.error }, { status: result.status });
}
