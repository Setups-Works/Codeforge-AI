import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { quoteCourseCoupon } from "@/services/lms-orders";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().trim().min(1).max(40) }).strict();

/** Preview what a coupon would take off a course. Nothing is redeemed. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("payment", req, session.user.id);
  if (limited) return limited;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, schema);
  if (body.error) return body.error;

  const { data } = await supabaseAdmin().from("courses").select("price_inr,is_free").eq("id", id).eq("status", "published").maybeSingle();
  const course = data as { price_inr: number; is_free: boolean } | null;
  if (!course || course.is_free) return notFound();

  const quote = await quoteCourseCoupon(session.user.id, id, course.price_inr, body.data.code);
  return quote.ok
    ? NextResponse.json({ ok: true, code: quote.code, discount: quote.discount, finalAmount: quote.finalAmount })
    : NextResponse.json({ ok: false, reason: quote.reason }, { status: 200 });
}
