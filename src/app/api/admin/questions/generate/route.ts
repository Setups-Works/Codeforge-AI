import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { aiGenerateRequestSchema } from "@/schemas/question";
import { isAiConfigured } from "@/services/ai/groq";
import { generateQuestionsFromPrompt } from "@/services/ai/generate-questions";

export const maxDuration = 120;

/** Admin: "Create 10 DSA Medium Array Questions" → validated drafts */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI generation requires GROQ_API_KEY (free key at console.groq.com).",
      },
      { status: 503 },
    );
  }

  const limited = await enforceRateLimit("aiGenerate", req, session.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = aiGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const outcome = await generateQuestionsFromPrompt(
      parsed.data.prompt,
      parsed.data.count,
      session.user.id,
    );
    return NextResponse.json(outcome, { status: 201 });
  } catch (generationError) {
    return NextResponse.json(
      {
        error:
          generationError instanceof Error
            ? generationError.message
            : "Generation failed",
      },
      { status: 502 },
    );
  }
}
