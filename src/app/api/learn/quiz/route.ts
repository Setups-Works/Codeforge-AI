import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { quizSubmitSchema } from "@/schemas/course";
import { getLessonCourse, resolveLessonAccess } from "@/services/lms-learn";
import { submitQuiz } from "@/services/lms-quiz";

export const runtime = "nodejs";

/** Submit quiz answers. Only enrolled learners with access to the lesson can attempt it. */
export async function POST(req: NextRequest) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;

  const body = await parseBody(req, quizSubmitSchema);
  if (body.error) return body.error;
  const { lessonId, answers } = body.data;

  const found = await getLessonCourse(lessonId);
  if (!found) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  const { decision, enrollment } = await resolveLessonAccess(session.user, found.courseId, lessonId);
  if (!decision.allowed) return NextResponse.json({ error: "You don't have access to this lesson" }, { status: 403 });
  if (!enrollment) return NextResponse.json({ error: "Enrol in this course to take the quiz" }, { status: 403 });

  const result = await submitQuiz(session.user.id, found.courseId, lessonId, answers);
  return result.ok ? NextResponse.json({ result: result.result }) : NextResponse.json({ error: result.error }, { status: result.status });
}
