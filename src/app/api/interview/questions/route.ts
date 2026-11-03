import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { requireFeature } from "@/services/feature-access";
import { DIFFICULTIES,type Difficulty } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Random question set for a mock interview session */
export async function GET(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;
  const gate = await requireFeature(session.user.plan, "mockInterview");
  if (gate) return gate;

  const params = req.nextUrl.searchParams;
  const category = params.get("category");
  const difficulty = params.get("difficulty");
  const count = Math.min(Math.max(Number(params.get("count")) || 2, 1), 5);

  interface InterviewQ {
    _id: { toString(): string };
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    description: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string[];
    starterCode: Record<string, string>;
    testCases: { input: string; expected: string; hidden: boolean }[];
  }

  let docs: InterviewQ[];
  {    const sb = supabaseAdmin();
    let q = sb.from("questions")
      .select("id,slug,title,difficulty,category,description,examples,constraints,starter_code,test_cases")
      .eq("is_published", true);
    if (category && category !== "any") q = q.eq("category", category);
    if (difficulty && DIFFICULTIES.includes(difficulty as Difficulty)) q = q.eq("difficulty", difficulty);
    const { data } = await q;
    const rows = (data ?? []) as (Omit<InterviewQ, "_id" | "starterCode" | "testCases"> & {
      id: string; starter_code: Record<string, string> | null; test_cases: InterviewQ["testCases"] | null;
    })[];
    // Random sample of `count` (mirrors Mongo $sample).
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    docs = rows.slice(0, count).map((r) => ({
      _id: { toString: () => r.id },
      slug: r.slug, title: r.title, difficulty: r.difficulty, category: r.category,
      description: r.description, examples: r.examples ?? [], constraints: r.constraints ?? [],
      starterCode: r.starter_code ?? {}, testCases: r.test_cases ?? [],
    }));}

  if (docs.length === 0) {
    return NextResponse.json(
      {
        error:
          "No published questions match those settings. Ask an admin to add questions first.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    questions: docs.map((doc) => ({
      id: doc._id.toString(),
      slug: doc.slug,
      title: doc.title,
      difficulty: doc.difficulty,
      category: doc.category,
      description: doc.description,
      examples: doc.examples.map((example) => ({
        input: example.input,
        output: example.output,
        explanation: example.explanation,
      })),
      constraints: doc.constraints,
      starterCode: doc.starterCode ?? {},
      sampleTests: doc.testCases
        .filter((testCase) => !testCase.hidden)
        .map((testCase) => ({
          input: testCase.input,
          expected: testCase.expected,
        })),
    })),
  });
}
