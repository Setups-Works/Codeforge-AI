import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { isLessonCompleted } from "@/services/lms-learn";

export const runtime = "nodejs";

/** Is this lesson completed for the signed-in learner? Polled by problem lessons waiting on a submission. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return NextResponse.json({ completed: await isLessonCompleted(session.user.id, id) });
}
