import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { parseBody } from "@/lib/lms/route";
import { progressSchema } from "@/schemas/course";
import { getLessonCourse, resolveLessonAccess, setLessonStatus } from "@/services/lms-learn";

export const runtime = "nodejs";

/** Mark a lesson completed (or undo it). Only enrolled learners with access can record progress. */
export async function POST(req: NextRequest) {
  if (!lmsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;

  const body = await parseBody(req, progressSchema);
  if (body.error) return body.error;
  const { lessonId, status } = body.data;

  const found = await getLessonCourse(lessonId);
  if (!found) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { decision, enrollment, lesson } = await resolveLessonAccess(session.user, found.courseId, lessonId);
  if (!decision.allowed) return NextResponse.json({ error: "You don't have access to this lesson" }, { status: 403 });
  // Previews and admin viewing don't create progress; only real enrolments do.
  if (!enrollment) return NextResponse.json({ error: "Enrol in this course to track progress" }, { status: 403 });

  // Quizzes and coding problems complete themselves when passed / accepted; no self-service shortcut.
  if (status === "completed" && lesson && (lesson.kind === "quiz" || lesson.kind === "problem")) {
    return NextResponse.json({ error: lesson.kind === "quiz" ? "Pass the quiz to complete this lesson" : "Solve the problem to complete this lesson" }, { status: 403 });
  }

  const progress = await setLessonStatus(session.user.id, found.courseId, lessonId, status);
  return NextResponse.json({ progress });
}
