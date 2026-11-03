import { QUESTION_CATEGORIES } from "@/lib/constants";
import { questionInputSchema,type QuestionInput } from "@/schemas/question";
import { uniqueSlug } from "@/lib/slug";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toUuidOrNull } from "@/lib/data-backend";
import { traceable } from "langsmith/traceable";
import { complete } from "./groq";
import { getPrompt } from "./prompts";

export interface GenerationOutcome {
  created: { slug: string; title: string }[];
  rejected: { title: string; reason: string }[];
}

/**
 * Generate questions from an admin prompt via Groq, validate each through
 * the same Zod schema as JSON imports, and save them as unpublished drafts.
 */
async function generateQuestionsImpl(
  request: string,
  count: number,
  creatorId: string,
  options: { publish?: boolean } = {},
): Promise<GenerationOutcome> {
  const prompt = await getPrompt("generate-questions", {
    request: `Create exactly ${count} question(s) based on this request: "${request}".`,
    categories: QUESTION_CATEGORIES.join(", "),
  });

  const raw = await complete(
    [
      { role: "system", content: prompt.text },
      {
        role: "user",
        content: `Generate the ${count} question(s) now as JSON.`,
      },
    ],
    {
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      json: true,
    },
  );

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned malformed JSON. Try again.");
  }

  const list = Array.isArray((payload as { questions?: unknown }).questions)
    ? ((payload as { questions: unknown[] }).questions)
    : Array.isArray(payload)
      ? (payload as unknown[])
      : [];

  if (list.length === 0) {
    throw new Error("The AI returned no questions. Try rephrasing the prompt.");
  }

  const outcome: GenerationOutcome = { created: [], rejected: [] };

  for (const candidate of list) {
    const title =
      typeof (candidate as { title?: unknown })?.title === "string"
        ? ((candidate as { title: string }).title)
        : "Untitled";

    const parsed = questionInputSchema.safeParse(candidate);
    if (!parsed.success) {
      outcome.rejected.push({
        title,
        reason: parsed.error.issues[0]?.message ?? "Schema validation failed",
      });
      continue;
    }

    try {
      const created = await saveQuestionDraft(
        options.publish
          ? { ...parsed.data, isPublished: true }
          : parsed.data,
        creatorId,
        "ai-generated",
      );
      outcome.created.push(created);
    } catch (saveError) {
      outcome.rejected.push({
        title,
        reason:
          saveError instanceof Error ? saveError.message : "Failed to save",
      });
    }
  }

  return outcome;
}

/** Generation pipeline as a single traced LangSmith run (prompt → LLM → parse). */
export const generateQuestionsFromPrompt = traceable(generateQuestionsImpl, {
  name: "generateQuestions",
});

export async function saveQuestionDraft(
  input: QuestionInput,
  creatorId: string,
  source: "manual" | "json-import" | "ai-generated",
): Promise<{ slug: string; title: string; category: string; difficulty: string }> {
    const sb = supabaseAdmin();
    const slug = await uniqueSlug(input.title, async (candidate) => {
      const { data } = await sb
        .from("questions")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      return Boolean(data);
    });
    const { error } = await sb.from("questions").insert({
      slug,
      title: input.title,
      difficulty: input.difficulty,
      category: input.category,
      tags: input.tags,
      companies: input.companies,
      description: input.description,
      examples: input.examples,
      constraints: input.constraints,
      starter_code: input.starterCode,
      test_cases: input.testCases,
      solution: input.solution,
      editorial: input.editorial,
      hints: input.hints,
      is_published: false,
      source,
      created_by: toUuidOrNull(creatorId),
    });
    if (error) throw new Error(error.message);
    return {
      slug,
      title: input.title,
      category: input.category,
      difficulty: input.difficulty,
    };
}
