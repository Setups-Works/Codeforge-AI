import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { reviewModerationSchema } from "@/schemas/course";
import { setReviewStatus } from "@/services/lms-engagement";

export const runtime = "nodejs";

/** Hide or restore a review. Ratings on the course are recomputed from visible reviews. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, reviewModerationSchema);
  if (body.error) return body.error;
  return (await setReviewStatus(id, body.data.status)) ? NextResponse.json({ ok: true }) : notFound();
}
