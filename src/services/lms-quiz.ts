import { supabaseAdmin } from "@/lib/supabase/admin";
import { gradeQuiz, validateQuiz, type QuizDraftQuestion } from "@/lib/lms/quiz";
import { setLessonStatus } from "@/services/lms-learn";

/**
 * Quiz lessons. Correct answers live only in `quiz_questions.correct_index`
 * and are read here, server-side: learner reads go through `getLearnerQuiz`,
 * which never selects them.
 */

const sb = () => supabaseAdmin();

type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

interface QRow {
  id: string;
  position: number;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

export interface AdminQuiz {
  passPercent: number;
  questions: (QuizDraftQuestion & { id: string })[];
}

async function lessonInCourse(courseId: string, lessonId: string): Promise<{ kind: string; passPercent: number } | null> {
  const { data } = await sb().from("course_lessons").select("kind,pass_percent").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
  const r = data as { kind: string; pass_percent: number } | null;
  return r ? { kind: r.kind, passPercent: r.pass_percent } : null;
}

export async function adminGetQuiz(courseId: string, lessonId: string): Promise<AdminQuiz | null> {
  const lesson = await lessonInCourse(courseId, lessonId);
  if (!lesson) return null;
  const { data, error } = await sb().from("quiz_questions").select("id,position,prompt,options,correct_index,explanation").eq("lesson_id", lessonId).order("position");
  if (error) throw new Error(error.message);
  return {
    passPercent: lesson.passPercent,
    questions: ((data ?? []) as QRow[]).map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, correctIndex: q.correct_index, explanation: q.explanation })),
  };
}

/** Replace a quiz lesson's questions and pass mark. */
export async function adminSaveQuiz(
  courseId: string,
  lessonId: string,
  input: { passPercent: number; questions: QuizDraftQuestion[] },
): Promise<{ ok: true } | Fail> {
  const lesson = await lessonInCourse(courseId, lessonId);
  if (!lesson) return fail(404, "Lesson not found");
  if (lesson.kind !== "quiz") return fail(400, "This lesson isn't a quiz");
  const problem = validateQuiz(input.questions);
  if (problem) return fail(400, problem);

  const client = sb();
  const { error: delError } = await client.from("quiz_questions").delete().eq("lesson_id", lessonId);
  if (delError) throw new Error(delError.message);
  const { error } = await client.from("quiz_questions").insert(
    input.questions.map((q, position) => ({
      lesson_id: lessonId,
      position,
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()),
      correct_index: q.correctIndex,
      explanation: q.explanation?.trim() || null,
    })),
  );
  if (error) throw new Error(error.message);
  await client.from("course_lessons").update({ pass_percent: input.passPercent, updated_at: new Date().toISOString() }).eq("id", lessonId);
  return { ok: true };
}

export interface LearnerQuiz {
  passPercent: number;
  questions: { id: string; prompt: string; options: string[] }[];
  lastAttempt: { percent: number; passed: boolean; createdAt: Date } | null;
}

/** The quiz as a learner sees it: prompts and options only, never the answers. */
export async function getLearnerQuiz(userId: string, lessonId: string, passPercent: number): Promise<LearnerQuiz> {
  const client = sb();
  const [{ data: qs, error }, { data: last }] = await Promise.all([
    client.from("quiz_questions").select("id,prompt,options").eq("lesson_id", lessonId).order("position"),
    client.from("quiz_attempts").select("percent,passed,created_at").eq("user_id", userId).eq("lesson_id", lessonId).order("created_at", { ascending: false }).limit(1),
  ]);
  if (error) throw new Error(error.message);
  const attempt = (last as { percent: number; passed: boolean; created_at: string }[] | null)?.[0];
  return {
    passPercent,
    questions: (qs ?? []) as { id: string; prompt: string; options: string[] }[],
    lastAttempt: attempt ? { percent: attempt.percent, passed: attempt.passed, createdAt: new Date(attempt.created_at) } : null,
  };
}

export interface QuizResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  passPercent: number;
  /** Per question. The right option and explanation are only revealed once the quiz is passed. */
  review: { correct: boolean; correctIndex: number | null; explanation: string | null }[];
  courseCompleted: boolean;
  xpEarned: number;
}

/** Grade an attempt, store it, and complete the lesson when it passes. */
export async function submitQuiz(
  userId: string,
  courseId: string,
  lessonId: string,
  answers: (number | null)[],
): Promise<{ ok: true; result: QuizResult } | Fail> {
  const lesson = await lessonInCourse(courseId, lessonId);
  if (!lesson || lesson.kind !== "quiz") return fail(404, "Quiz not found");

  const client = sb();
  const { data, error } = await client.from("quiz_questions").select("id,position,prompt,options,correct_index,explanation").eq("lesson_id", lessonId).order("position");
  if (error) throw new Error(error.message);
  const questions = (data ?? []) as QRow[];
  if (!questions.length) return fail(400, "This quiz has no questions yet");
  if (answers.length > questions.length) return fail(400, "Too many answers");

  const grade = gradeQuiz(questions.map((q) => ({ correctIndex: q.correct_index, optionCount: q.options.length })), answers, lesson.passPercent);

  const { error: attemptError } = await client
    .from("quiz_attempts")
    .insert({ user_id: userId, lesson_id: lessonId, score: grade.score, total: grade.total, percent: grade.percent, passed: grade.passed, answers });
  if (attemptError) throw new Error(attemptError.message);

  let courseCompleted = false;
  let xpEarned = 0;
  if (grade.passed) {
    const progress = await setLessonStatus(userId, courseId, lessonId, "completed");
    courseCompleted = progress.courseCompleted;
    xpEarned = progress.xpEarned;
  }

  return {
    ok: true,
    result: {
      score: grade.score,
      total: grade.total,
      percent: grade.percent,
      passed: grade.passed,
      passPercent: lesson.passPercent,
      review: questions.map((q, i) => ({
        correct: grade.correct[i],
        correctIndex: grade.passed ? q.correct_index : null,
        explanation: grade.passed ? q.explanation : null,
      })),
      courseCompleted,
      xpEarned,
    },
  };
}
