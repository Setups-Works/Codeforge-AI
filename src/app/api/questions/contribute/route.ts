import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  questionImportSchema,
  normalizeQuestionImport,
} from "@/schemas/question";
import { saveQuestionDraft } from "@/services/ai/generate-questions";
import { getPostHogServer } from "@/lib/posthog-server";

const MAX_USER_UPLOAD = 20;

/**
 * Signed-in users can contribute questions as JSON (single object or
 * array). Validated against the same schema as admin imports and
 * published immediately.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const limited = await enforceRateLimit("aiGenerate", req, session.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = questionImportSchema.safeParse(normalizeQuestionImport(body));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: `Validation failed at ${issue?.path.join(".") || "(root)"}: ${issue?.message}`,
      },
      { status: 400 },
    );
  }

  const items = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  if (items.length > MAX_USER_UPLOAD) {
    return NextResponse.json(
      { error: `Upload at most ${MAX_USER_UPLOAD} questions at a time` },
      { status: 400 },
    );
  }

  const created: Awaited<ReturnType<typeof saveQuestionDraft>>[] = [];
  const failed: { title: string; reason: string }[] = [];

  for (const item of items) {
    try {
      created.push(
        await saveQuestionDraft(
          { ...item, isPublished: true },
          session.user.id,
          "json-import",
        ),
      );
    } catch (saveError) {
      failed.push({
        title: item.title,
        reason: saveError instanceof Error ? saveError.message : "Save failed",
      });
    }
  }

  if (created.length > 0) {
    const posthog = getPostHogServer();
    posthog?.capture({
      distinctId: session.user.id,
      event: "question_contributed",
      properties: { created_count: created.length, failed_count: failed.length },
    });
  }

  return NextResponse.json({ created, failed }, { status: 201 });
}
