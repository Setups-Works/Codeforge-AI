import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { questionSchema } from "@/schemas/course";
import { addLessonQuestion, listLessonQuestions } from "@/services/lms-engagement";
import { authorizeLessonParticipation } from "@/services/lms-learn";

export const runtime = "nodejs";

/** Questions and replies for a lesson; visible to anyone enrolled in the course. */
export async function GET(req: NextRequest) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const lessonId = req.nextUrl.searchParams.get("lessonId") ?? "";
  if (!isUuid(lessonId)) return notFound();
  const auth = await authorizeLessonParticipation(session.user, lessonId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ questions: await listLessonQuestions(lessonId), me: session.user.id, admin: session.user.role === "admin" });
}

export async function POST(req: NextRequest) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;
  const body = await parseBody(req, questionSchema);
  if (body.error) return body.error;
  const auth = await authorizeLessonParticipation(session.user, body.data.lessonId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const result = await addLessonQuestion(session.user, auth.courseId, body.data.lessonId, body.data);
  return result.ok ? NextResponse.json({ ok: true }, { status: 201 }) : NextResponse.json({ error: result.error }, { status: result.status });
}
