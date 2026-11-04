import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { quizSaveSchema } from "@/schemas/course";
import { adminGetQuiz, adminSaveQuiz } from "@/services/lms-quiz";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; lessonId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id, lessonId } = await params;
  if (!isUuid(id) || !isUuid(lessonId)) return notFound();
  const quiz = await adminGetQuiz(id, lessonId);
  return quiz ? NextResponse.json({ quiz }) : notFound();
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id, lessonId } = await params;
  if (!isUuid(id) || !isUuid(lessonId)) return notFound();
  const body = await parseBody(req, quizSaveSchema);
  if (body.error) return body.error;
  const result = await adminSaveQuiz(id, lessonId, body.data);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
}
