import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { positionSchema } from "@/schemas/course";
import { getLessonCourse, resolveLessonAccess, saveLessonPosition } from "@/services/lms-learn";

export const runtime = "nodejs";

/** Save the playhead for resume, and complete the lesson once enough of the video has played. Enrolled learners only. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, positionSchema);
  if (body.error) return body.error;

  const found = await getLessonCourse(id);
  if (!found) return notFound();
  const { decision, enrollment, lesson } = await resolveLessonAccess(session.user, found.courseId, id);
  if (!decision.allowed || !enrollment || !lesson) return NextResponse.json({ error: "You don't have access to this lesson" }, { status: 403 });
  // Only plain video lessons track by playback; quizzes and problems complete themselves.
  if (lesson.kind !== "video") return NextResponse.json({ error: "Not a video lesson" }, { status: 400 });

  return NextResponse.json(await saveLessonPosition(session.user.id, found.courseId, id, body.data.seconds, body.data.duration));
}
