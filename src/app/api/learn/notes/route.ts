import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { noteSchema } from "@/schemas/course";
import { addLessonNote, listLessonNotes } from "@/services/lms-engagement";
import { authorizeLessonParticipation } from "@/services/lms-learn";

export const runtime = "nodejs";

/** The signed-in learner's notes for one lesson. */
export async function GET(req: NextRequest) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const lessonId = req.nextUrl.searchParams.get("lessonId") ?? "";
  if (!isUuid(lessonId)) return notFound();
  const auth = await authorizeLessonParticipation(session.user, lessonId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ notes: await listLessonNotes(session.user.id, lessonId) });
}

export async function POST(req: NextRequest) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;
  const body = await parseBody(req, noteSchema);
  if (body.error) return body.error;
  const auth = await authorizeLessonParticipation(session.user, body.data.lessonId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const note = await addLessonNote(session.user.id, auth.courseId, body.data.lessonId, body.data);
  return NextResponse.json({ note }, { status: 201 });
}
