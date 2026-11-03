import { type QuestionTestCase } from "@/types/db";
import { supabaseAdmin } from "@/lib/supabase/admin";


export interface SubmittableQuestion {
  id: string;
  testCases: QuestionTestCase[];
  difficulty: string;
  tags: string[];
  category: string;
}

/** Fetch a published question's data needed to run + score a submission. */
export async function getSubmittableQuestion(
  questionId: string,
): Promise<SubmittableQuestion | null> {
    const { data } = await supabaseAdmin()
      .from("questions")
      .select("id,test_cases,difficulty,tags,category")
      .eq("id", questionId)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;
    const q = data as {
      id: string;
      test_cases: QuestionTestCase[] | null;
      difficulty: string;
      tags: string[] | null;
      category: string;
    };
    return {
      id: q.id,
      testCases: q.test_cases ?? [],
      difficulty: q.difficulty,
      tags: q.tags ?? [],
      category: q.category,
    };
}

/** Whether the user has an accepted submission for this question already. */
export async function hasPriorAccepted(
  userId: string,
  questionId: string,
): Promise<boolean> {
    const { data } = await supabaseAdmin()
      .from("submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .eq("status", "Accepted")
      .limit(1)
      .maybeSingle();
    return Boolean(data);
}

export interface StoredTestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  hidden: boolean;
  stderr: string;
  timeMs?: number;
}

export interface CreateDsaSubmission {
  userId: string;
  questionId: string;
  contestId?: string | null;
  language: string;
  code: string;
  status: string;
  testResults: StoredTestResult[];
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  memoryKb?: number;
}

/** Persist a DSA submission. Returns its id and the stored results. */
export async function createDsaSubmission(
  input: CreateDsaSubmission,
): Promise<{ id: string; testResults: StoredTestResult[] }> {
    const { data, error } = await supabaseAdmin()
      .from("submissions")
      .insert({
        user_id: input.userId,
        kind: "dsa",
        question_id: input.questionId,
        contest_id: input.contestId ?? null,
        language: input.language,
        code: input.code,
        status: input.status,
        test_results: input.testResults,
        passed_count: input.passedCount,
        total_count: input.totalCount,
        runtime_ms: input.runtimeMs,
        memory_kb: input.memoryKb ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: string }).id, testResults: input.testResults };
}

/** Atomically bump a question's submission/acceptance counters. */
export async function incrementQuestionStats(
  questionId: string,
  accepted: boolean,
): Promise<void> {
    const { error } = await supabaseAdmin().rpc("increment_question_stats", {
      p_question: questionId,
      p_submissions: 1,
      p_accepted: accepted ? 1 : 0,
    });
    if (error) throw new Error(error.message);
    return;
}

/** Recent DSA submissions with the question's category — for coaching/analytics. */
export async function getRecentDsaCategoryRows(
  userId: string,
  limit: number,
  opts: { acceptedOnly?: boolean } = {},
): Promise<{ category: string; status: string }[]> {
    const sb = supabaseAdmin();
    let q = sb
      .from("submissions")
      .select("question_id,status")
      .eq("user_id", userId)
      .eq("kind", "dsa")
      .not("question_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts.acceptedOnly) q = q.eq("status", "Accepted");
    const { data } = await q;
    const rows = (data ?? []) as { question_id: string; status: string }[];
    const ids = [...new Set(rows.map((r) => r.question_id))];
    const catMap = new Map<string, string>();
    if (ids.length) {
      const { data: qs } = await sb.from("questions").select("id,category").in("id", ids);
      for (const x of (qs ?? []) as { id: string; category: string }[]) catMap.set(x.id, x.category);
    }
    return rows
      .map((r) => ({ category: catMap.get(r.question_id) ?? "", status: r.status }))
      .filter((r) => r.category);
}

/** Whether the user has an accepted submission for this challenge already. */
export async function hasPriorAcceptedChallenge(
  userId: string,
  challengeId: string,
): Promise<boolean> {
    const { data } = await supabaseAdmin()
      .from("submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .eq("status", "Accepted")
      .limit(1)
      .maybeSingle();
    return Boolean(data);
}

export interface CreateFrontendSubmission {
  userId: string;
  challengeId: string;
  files: { path: string; code: string }[];
  status: string;
  passedCount: number;
  totalCount: number;
  aiReview: { score: number; feedback: string };
}

/** Persist a frontend-challenge submission. */
export async function createFrontendSubmission(
  input: CreateFrontendSubmission,
): Promise<void> {
    const { error } = await supabaseAdmin().from("submissions").insert({
      user_id: input.userId,
      kind: "frontend",
      challenge_id: input.challengeId,
      files: input.files,
      status: input.status,
      passed_count: input.passedCount,
      total_count: input.totalCount,
      ai_review: input.aiReview,
    });
    if (error) throw new Error(error.message);
    return;
}

export interface UserSubmissionItem {
  id: string;
  status: string;
  language: string | null;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  createdAt: string | Date;
  code: string | null;
}

/** List a user's recent submissions, optionally filtered to one question. */
export async function listUserSubmissions(
  userId: string,
  questionId?: string | null,
): Promise<UserSubmissionItem[]> {
    let q = supabaseAdmin()
      .from("submissions")
      .select("id,status,language,passed_count,total_count,runtime_ms,created_at,code")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (questionId) q = q.eq("question_id", questionId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (
      (data ?? []) as {
        id: string;
        status: string;
        language: string | null;
        passed_count: number;
        total_count: number;
        runtime_ms: number | null;
        created_at: string;
        code: string | null;
      }[]
    ).map((s) => ({
      id: s.id,
      status: s.status,
      language: s.language,
      passedCount: s.passed_count,
      totalCount: s.total_count,
      runtimeMs: s.runtime_ms,
      createdAt: s.created_at,
      code: s.code,
    }));
}
