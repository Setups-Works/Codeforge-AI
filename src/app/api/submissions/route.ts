import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getLanguage, type Difficulty } from "@/lib/constants";
import { submitRequestSchema } from "@/schemas/execution";
import { runTestSuite, suiteToSubmissionStatus } from "@/services/execution";
import { getDailyChallenge, scoreContestSolve } from "@/services/contests";
import { XP_DAILY_CHALLENGE_BONUS } from "@/lib/constants";
import {
  recordAcceptedSolve,
  recordDailyActivity,
} from "@/services/gamification";
import {
  getSubmittableQuestion,
  hasPriorAccepted,
  createDsaSubmission,
  incrementQuestionStats,
  listUserSubmissions,
} from "@/services/submissions";
import { getPostHogServer } from "@/lib/posthog-server";
import { lmsEnabled } from "@/lib/lms/flag";
import { completeProblemLessons } from "@/services/lms-learn";

export const maxDuration = 120;

/** Full submission: all test cases (incl. hidden), persisted, awards XP. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const limited = await enforceRateLimit("submit", req, session.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const language = getLanguage(parsed.data.language);
  if (!language) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const question = await getSubmittableQuestion(parsed.data.questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const suite = await runTestSuite(
    language,
    parsed.data.code,
    question.testCases,
  );
  const status = suiteToSubmissionStatus(suite);
  const accepted = status === "Accepted";

  const priorAccepted = await hasPriorAccepted(session.user.id, question.id);
  const firstAccept = accepted && !priorAccepted;

  // Contest scoring (when submitted from a live contest arena)
  let contestId: string | null = null;
  if (parsed.data.contestSlug) {
    contestId = await scoreContestSolve({
      slug: parsed.data.contestSlug,
      userId: session.user.id,
      questionId: question.id,
      accepted,
    });
  }

  const testResults = suite.results.map((r) => ({
    // hidden test inputs/outputs are not stored in cleartext detail
    input: r.hidden ? "[hidden]" : r.input,
    expected: r.hidden ? "[hidden]" : r.expected,
    actual: r.hidden ? (r.passed ? "[hidden]" : "[hidden — failed]") : r.actual,
    passed: r.passed,
    hidden: r.hidden,
    stderr: r.hidden ? "" : r.stderr,
    timeMs: r.timeMs ?? undefined,
  }));

  const submission = await createDsaSubmission({
    userId: session.user.id,
    questionId: question.id,
    contestId,
    language: language.id,
    code: parsed.data.code,
    status,
    testResults,
    passedCount: suite.passedCount,
    totalCount: suite.totalCount,
    runtimeMs: suite.totalTimeMs,
    memoryKb: suite.maxMemoryKb ?? undefined,
  });

  await incrementQuestionStats(question.id, accepted);

  let rewards = null;
  await recordDailyActivity(session.user.id, accepted);
  if (accepted) {
    // Solving today's daily challenge grants bonus XP
    const daily = await getDailyChallenge().catch(() => null);
    const isDaily = daily?.id === question.id;
    rewards = await recordAcceptedSolve({
      userId: session.user.id,
      kind: "dsa",
      difficulty: question.difficulty as Difficulty,
      firstAccept,
      xpBonus: isDaily && firstAccept ? XP_DAILY_CHALLENGE_BONUS : 0,
      tags: [...question.tags, question.category],
    });
  }

  // An accepted solve also completes any course lesson built on this problem.
  if (accepted && lmsEnabled()) {
    await completeProblemLessons(session.user.id, question.slug).catch((e) => console.error("[lms] problem lesson", e));
  }

  const posthog = getPostHogServer();
  posthog?.capture({
    distinctId: session.user.id,
    event: "code_submitted",
    properties: {
      status,
      language: language.id,
      difficulty: question.difficulty,
      category: question.category,
      first_accept: firstAccept,
      in_contest: !!contestId,
      passed_count: suite.passedCount,
      total_count: suite.totalCount,
      runtime_ms: suite.totalTimeMs,
    },
  });

  return NextResponse.json({
    submissionId: submission.id,
    status,
    passedCount: suite.passedCount,
    totalCount: suite.totalCount,
    runtimeMs: suite.totalTimeMs,
    results: submission.testResults,
    rewards,
  });
}

/** List the signed-in user's submissions, optionally for one question */
export async function GET(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const questionId = req.nextUrl.searchParams.get("questionId");
  const submissions = await listUserSubmissions(session.user.id, questionId);

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      status: s.status,
      language: s.language ?? undefined,
      passedCount: s.passedCount,
      totalCount: s.totalCount,
      runtimeMs: s.runtimeMs,
      createdAt: s.createdAt,
      code: s.code ?? undefined,
    })),
  });
}
