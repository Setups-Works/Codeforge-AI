import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceAiCredit } from "@/services/ai-credits";
import { isAiConfigured } from "@/services/ai/groq";
import { generateRunVisualization } from "@/services/ai/visualize";
import { getQuestionBySlug } from "@/services/questions";
import type { RunVizResponse } from "@/lib/visualization";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  code?: string;
  language?: string;
  test?: { input?: string; expected?: string | null; actual?: string; passed?: boolean };
}

/**
 * Visualize a user's run of their code on a test case. `verdict` comes from the
 * real run result; the AI produces the animation frames + what's right/wrong.
 * Requires a signed-in user (AI cost) and is rate-limited.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { session, error } = await requireUser();
  if (error) return error;

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const limited = await enforceRateLimit("aiGenerate", req, session.user.id);
  if (limited) return limited;

  const { slug } = await params;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const test = body.test;
  if (!code) return NextResponse.json({ error: "Run your code first." }, { status: 400 });
  if (!test || typeof test.input !== "string") {
    return NextResponse.json({ error: "No test result to visualize." }, { status: 400 });
  }

  const question = await getQuestionBySlug(slug).catch(() => null);
  if (!question) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  const credit = await enforceAiCredit(session.user.id, session.user.plan);
  if (credit) return credit;

  const passed = test.passed === true;
  try {
    const { feedback, visualization } = await generateRunVisualization({
      title: question.title,
      description: question.description,
      code,
      language: (body.language ?? "").slice(0, 20) || "code",
      input: test.input,
      expected: test.expected ?? null,
      actual: test.actual ?? "",
      passed,
    });
    const res: RunVizResponse = { verdict: passed ? "correct" : "wrong", feedback, visualization };
    return NextResponse.json(res);
  } catch (e) {
    console.error("[problems/visualize]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Visualization failed" },
      { status: 502 },
    );
  }
}
