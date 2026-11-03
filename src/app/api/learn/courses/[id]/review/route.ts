import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { reviewSchema } from "@/schemas/course";
import { deleteMyReview, saveReview } from "@/services/lms-engagement";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Create or update the signed-in learner's review of a course they own. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, reviewSchema);
  if (body.error) return body.error;
  const result = await saveReview(session.user.id, id, body.data);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return (await deleteMyReview(session.user.id, id)) ? NextResponse.json({ ok: true }) : notFound();
}
