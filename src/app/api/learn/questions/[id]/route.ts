import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { deleteLessonQuestion } from "@/services/lms-engagement";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return (await deleteLessonQuestion(session.user, id)) ? NextResponse.json({ ok: true }) : notFound();
}
