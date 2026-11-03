import { supabaseAdmin } from "@/lib/supabase/admin";
import type { QuestionFilter } from "@/schemas/question";


/** Shape of the `stats` jsonb / Mongo subdoc used for acceptance rate. */
interface QStats {
  submissions?: number;
  accepted?: number;
}
function acceptanceRate(stats: QStats | null | undefined): number | null {
  const subs = stats?.submissions ?? 0;
  return subs > 0 ? Math.round(((stats?.accepted ?? 0) / subs) * 100) : null;
}

export interface QuestionListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  tags: string[];
  companies: string[];
  acceptanceRate: number | null;
  status: "solved" | "attempted" | "todo";
}

export interface QuestionListResult {
  items: QuestionListItem[];
  total: number;
  page: number;
  hasMore: boolean;
}

/** Published question slugs + last-modified (sitemap). */
export async function listPublishedQuestionSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    const { data } = await supabaseAdmin()
      .from("questions")
      .select("slug,updated_at")
      .eq("is_published", true);
    return ((data ?? []) as { slug: string; updated_at: string }[]).map((q) => ({
      slug: q.slug,
      updatedAt: new Date(q.updated_at),
    }));
}

/** Distinct question ids the user solved / attempted, as string sets */
export async function getUserQuestionStatuses(userId: string): Promise<{
  solved: Set<string>;
  attempted: Set<string>;
}> {
    const sb = supabaseAdmin();
    const [acc, att] = await Promise.all([
      sb
        .from("submissions")
        .select("question_id")
        .eq("user_id", userId)
        .eq("kind", "dsa")
        .eq("status", "Accepted")
        .not("question_id", "is", null),
      sb
        .from("submissions")
        .select("question_id")
        .eq("user_id", userId)
        .eq("kind", "dsa")
        .not("question_id", "is", null),
    ]);
    if (acc.error) throw new Error(acc.error.message);
    if (att.error) throw new Error(att.error.message);
    return {
      solved: new Set((acc.data ?? []).map((r) => String(r.question_id))),
      attempted: new Set((att.data ?? []).map((r) => String(r.question_id))),
    };
}

export async function listQuestions(
  filter: QuestionFilter,
  userId?: string,
): Promise<QuestionListResult> {
return listQuestionsSupabase(filter, userId);
}

interface SbQuestionRow {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  tags: string[] | null;
  companies: string[] | null;
  stats: QStats | null;
}

async function listQuestionsSupabase(
  filter: QuestionFilter,
  userId?: string,
): Promise<QuestionListResult> {
  const sb = supabaseAdmin();

  const statuses = userId
    ? await getUserQuestionStatuses(userId)
    : { solved: new Set<string>(), attempted: new Set<string>() };

  let q = sb
    .from("questions")
    .select("id,slug,title,difficulty,category,tags,companies,stats", {
      count: "exact",
    })
    .eq("is_published", true);

  if (filter.difficulty) q = q.eq("difficulty", filter.difficulty);
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.company) q = q.contains("companies", [filter.company]);
  if (filter.tag) q = q.contains("tags", [filter.tag]);
  if (filter.q) q = q.or(`title.ilike.%${filter.q}%,tags.cs.{${filter.q}}`);

  // Status filtering on ids so pagination stays correct
  if (filter.status && userId) {
    if (filter.status === "solved") {
      q = q.in("id", [...statuses.solved]);
    } else if (filter.status === "attempted") {
      const onlyAttempted = [...statuses.attempted].filter(
        (id) => !statuses.solved.has(id),
      );
      q = q.in("id", onlyAttempted);
    } else {
      // todo: not attempted — Postgres can't express NOT IN a JS array cheaply,
      // so exclude via a negated filter list when small, else post-filter.
      const attempted = [...statuses.attempted];
      if (attempted.length) q = q.not("id", "in", `(${attempted.join(",")})`);
    }
  }

  const skip = (filter.page - 1) * filter.limit;
  const { data, count, error } = await q
    .order("created_at", { ascending: true })
    .range(skip, skip + filter.limit - 1);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SbQuestionRow[];
  const items: QuestionListItem[] = rows.map((doc) => ({
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    difficulty: doc.difficulty,
    category: doc.category,
    tags: doc.tags ?? [],
    companies: doc.companies ?? [],
    acceptanceRate: acceptanceRate(doc.stats),
    status: statuses.solved.has(doc.id)
      ? "solved"
      : statuses.attempted.has(doc.id)
        ? "attempted"
        : "todo",
  }));

  const total = count ?? 0;
  return { items, total, page: filter.page, hasMore: skip + rows.length < total };
}

/** Public view of a question — hidden test cases and solution stripped */
export async function getQuestionBySlug(slug: string) {
return getQuestionBySlugSupabase(slug);
}

interface SbExample {
  input: string;
  output: string;
  explanation?: string | null;
}
interface SbTestCase {
  input: string;
  expected: string;
  hidden?: boolean;
}
interface SbQuestionDetailRow {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  tags: string[] | null;
  companies: string[] | null;
  description: string;
  examples: SbExample[] | null;
  constraints: string[] | null;
  starter_code: Record<string, string> | null;
  test_cases: SbTestCase[] | null;
  hints: string[] | null;
  editorial: string | null;
  stats: QStats | null;
}

async function getQuestionBySlugSupabase(slug: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("questions")
    .select(
      "id,slug,title,difficulty,category,tags,companies,description,examples,constraints,starter_code,test_cases,hints,editorial,stats",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const doc = data as SbQuestionDetailRow;
  const testCases = doc.test_cases ?? [];

  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    difficulty: doc.difficulty,
    category: doc.category,
    tags: doc.tags ?? [],
    companies: doc.companies ?? [],
    description: doc.description,
    examples: (doc.examples ?? []).map((example) => ({
      input: example.input,
      output: example.output,
      explanation: example.explanation ?? null,
    })),
    constraints: doc.constraints ?? [],
    starterCode: doc.starter_code ?? {},
    sampleTests: testCases
      .filter((tc) => !tc.hidden)
      .map((tc) => ({ input: tc.input, expected: tc.expected })),
    hiddenTestCount: testCases.filter((tc) => tc.hidden).length,
    hints: doc.hints ?? [],
    editorial: doc.editorial ?? null,
    acceptanceRate: acceptanceRate(doc.stats),
  };
}

export type QuestionDetail = NonNullable<
  Awaited<ReturnType<typeof getQuestionBySlug>>
>;

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminQuestionListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  isPublished: boolean;
  source: string | null;
  submissions: number;
  createdAt: Date;
}

/** Admin: list all questions (drafts included), optional title search. */
export async function adminListQuestions(search?: string): Promise<AdminQuestionListItem[]> {
    let q = supabaseAdmin()
      .from("questions")
      .select("id,slug,title,difficulty,category,is_published,source,stats,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data } = await q;
    return ((data ?? []) as {
      id: string; slug: string; title: string; difficulty: string; category: string;
      is_published: boolean; source: string | null; stats: QStats | null; created_at: string;
    }[]).map((x) => ({
      id: x.id, slug: x.slug, title: x.title, difficulty: x.difficulty, category: x.category,
      isPublished: x.is_published, source: x.source, submissions: x.stats?.submissions ?? 0, createdAt: new Date(x.created_at),
    }));
}

/** Admin: full question detail for the edit dialog. */
export async function getAdminQuestion(id: string) {
    const { data } = await supabaseAdmin()
      .from("questions")
      .select("id,title,difficulty,category,tags,companies,description,examples,constraints,starter_code,test_cases,solution,editorial,hints,is_published")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const d = data as SbQuestionDetailRow & { solution: string | null; is_published: boolean };
    return {
      id: d.id, title: d.title, difficulty: d.difficulty, category: d.category, tags: d.tags ?? [],
      companies: d.companies ?? [], description: d.description,
      examples: (d.examples ?? []).map((e) => ({ input: e.input, output: e.output, explanation: e.explanation ?? null })),
      constraints: d.constraints ?? [], starterCode: d.starter_code ?? {},
      testCases: (d.test_cases ?? []).map((t) => ({ input: t.input, expected: t.expected, hidden: t.hidden })),
      solution: (d as { solution: string | null }).solution, editorial: d.editorial, hints: d.hints ?? [], isPublished: d.is_published,
    };
}

const Q_FIELD_MAP: Record<string, string> = {
  title: "title", difficulty: "difficulty", category: "category", tags: "tags", companies: "companies",
  description: "description", examples: "examples", constraints: "constraints", starterCode: "starter_code",
  testCases: "test_cases", solution: "solution", editorial: "editorial", hints: "hints", isPublished: "is_published",
};

/** Admin: update selected fields of a question. Returns the slug, or null. */
export async function updateQuestion(id: string, patch: Record<string, unknown>): Promise<string | null> {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (Q_FIELD_MAP[k]) row[Q_FIELD_MAP[k]] = v;
    if (!Object.keys(row).length) {
      const { data } = await supabaseAdmin().from("questions").select("slug").eq("id", id).maybeSingle();
      return (data as { slug: string } | null)?.slug ?? null;
    }
    const { data, error } = await supabaseAdmin().from("questions").update(row).eq("id", id).select("slug").maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { slug: string } | null)?.slug ?? null;
}

/** Admin: delete a question and its submissions. Returns false if not found. */
export async function deleteQuestionCascade(id: string): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data } = await sb.from("questions").delete().eq("id", id).select("id").maybeSingle();
    if (!data) return false;
    await sb.from("submissions").delete().eq("question_id", id);
    return true;
}

/** Admin: bulk publish/unpublish/delete. Returns the affected count. */
export async function bulkQuestions(ids: string[], action: "publish" | "unpublish" | "delete"): Promise<number> {
    const sb = supabaseAdmin();
    if (action === "delete") {
      const { data } = await sb.from("questions").delete().in("id", ids).select("id");
      await sb.from("submissions").delete().in("question_id", ids);
      return (data ?? []).length;
    }
    const { data } = await sb.from("questions").update({ is_published: action === "publish" }).in("id", ids).select("id");
    return (data ?? []).length;
}

/** Admin: every question in import-file shape (backup export). */
export async function exportQuestions(): Promise<Record<string, unknown>[]> {
  const shape = (q: {
    title: string; difficulty: string; category: string; tags: string[]; companies: string[];
    description: string; examples: { input: string; output: string; explanation?: string | null }[];
    constraints: string[]; starterCode: Record<string, string>;
    testCases: { input: string; expected: string; hidden: boolean }[];
    solution?: string | null; editorial?: string | null; hints: string[]; isPublished: boolean;
  }) => ({
    title: q.title, difficulty: q.difficulty, category: q.category, tags: q.tags, companies: q.companies,
    description: q.description,
    examples: q.examples.map((e) => ({ input: e.input, output: e.output, ...(e.explanation ? { explanation: e.explanation } : {}) })),
    constraints: q.constraints, starterCode: q.starterCode,
    testCases: q.testCases.map((t) => ({ input: t.input, expected: t.expected, hidden: t.hidden })),
    ...(q.solution ? { solution: q.solution } : {}), ...(q.editorial ? { editorial: q.editorial } : {}),
    hints: q.hints, isPublished: q.isPublished,
  });
    const { data } = await supabaseAdmin()
      .from("questions")
      .select("title,difficulty,category,tags,companies,description,examples,constraints,starter_code,test_cases,solution,editorial,hints,is_published")
      .order("created_at", { ascending: true });
    return ((data ?? []) as Record<string, unknown>[]).map((q) => shape({
      title: q.title as string, difficulty: q.difficulty as string, category: q.category as string,
      tags: (q.tags as string[]) ?? [], companies: (q.companies as string[]) ?? [], description: q.description as string,
      examples: (q.examples as { input: string; output: string; explanation?: string }[]) ?? [],
      constraints: (q.constraints as string[]) ?? [], starterCode: (q.starter_code as Record<string, string>) ?? {},
      testCases: (q.test_cases as { input: string; expected: string; hidden: boolean }[]) ?? [],
      solution: q.solution as string | null, editorial: q.editorial as string | null,
      hints: (q.hints as string[]) ?? [], isPublished: q.is_published as boolean,
    }));
}
