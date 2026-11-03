import { supabaseAdmin } from "@/lib/supabase/admin";
import { toUuidOrNull } from "@/lib/data-backend";
import { uniqueSlug } from "@/lib/slug";


/** Stored file array -> path->code record used by the sandbox/admin UIs */
export function filesToRecord(
  files: { path: string; code: string }[] | undefined,
): Record<string, string> {
  return Object.fromEntries((files ?? []).map((file) => [file.path, file.code]));
}

/** path->code record (authoring format) -> stored file array */
export function recordToFiles(
  record: Record<string, string>,
): { path: string; code: string }[] {
  return Object.entries(record).map(([path, code]) => ({ path, code }));
}

export interface ChallengeListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  tech: string;
  tags: string[];
  brief: string;
  completed: boolean;
}

export async function listChallenges(
  filters: { tech?: string; difficulty?: string },
  userId?: string,
): Promise<ChallengeListItem[]> {
    const sb = supabaseAdmin();
    let q = sb
      .from("frontend_challenges")
      .select("id,slug,title,difficulty,tech,tags,brief")
      .eq("is_published", true)
      .order("created_at", { ascending: true });
    if (filters.tech) q = q.eq("tech", filters.tech);
    if (filters.difficulty) q = q.eq("difficulty", filters.difficulty);
    const [listRes, doneRes] = await Promise.all([
      q,
      userId
        ? sb
            .from("submissions")
            .select("challenge_id")
            .eq("user_id", userId)
            .eq("kind", "frontend")
            .eq("status", "Accepted")
            .not("challenge_id", "is", null)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (listRes.error) throw new Error(listRes.error.message);
    if (doneRes.error) throw new Error(doneRes.error.message);
    const completed = new Set(
      (doneRes.data ?? []).map((r) => String(r.challenge_id)),
    );
    return (listRes.data ?? []).map((doc) => ({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      difficulty: doc.difficulty,
      tech: doc.tech,
      tags: doc.tags ?? [],
      brief: doc.brief,
      completed: completed.has(doc.id),
    }));
}

interface SbChallengeDetailRow {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  tech: string;
  tags: string[] | null;
  brief: string;
  description: string;
  checklist: string[] | null;
  starter_files: { path: string; code: string }[] | null;
}

export async function getChallengeBySlug(slug: string) {
    const { data, error } = await supabaseAdmin()
      .from("frontend_challenges")
      .select(
        "id,slug,title,difficulty,tech,tags,brief,description,checklist,starter_files",
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const doc = data as SbChallengeDetailRow;
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      difficulty: doc.difficulty,
      tech: doc.tech,
      tags: doc.tags ?? [],
      brief: doc.brief,
      description: doc.description,
      checklist: doc.checklist ?? [],
      starterFiles: filesToRecord(doc.starter_files ?? []),
    };
}

export type ChallengeDetail = NonNullable<
  Awaited<ReturnType<typeof getChallengeBySlug>>
>;

export interface SubmittableChallenge {
  id: string;
  title: string;
  difficulty: string;
  tech: string;
  designSpec: string;
  checklist: string[];
  tags: string[];
}

/** Fetch a published challenge's data needed to grade a submission. */
export async function getSubmittableChallenge(
  challengeId: string,
): Promise<SubmittableChallenge | null> {
    const { data } = await supabaseAdmin()
      .from("frontend_challenges")
      .select("id,title,difficulty,tech,design_spec,checklist,tags")
      .eq("id", challengeId)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;
    const c = data as {
      id: string; title: string; difficulty: string; tech: string;
      design_spec: string | null; checklist: string[] | null; tags: string[] | null;
    };
    return {
      id: c.id, title: c.title, difficulty: c.difficulty, tech: c.tech,
      designSpec: c.design_spec ?? "", checklist: c.checklist ?? [], tags: c.tags ?? [],
    };
}

/** Atomically bump a challenge's attempt/completion counters. */
export async function incrementChallengeStats(
  challengeId: string,
  accepted: boolean,
): Promise<void> {
    const { error } = await supabaseAdmin().rpc("increment_challenge_stats", {
      p_challenge: challengeId,
      p_attempts: 1,
      p_completed: accepted ? 1 : 0,
    });
    if (error) throw new Error(error.message);
    return;
}

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminChallengeListItem {
  id: string; slug: string; title: string; difficulty: string; tech: string;
  isPublished: boolean; attempts: number; createdAt: Date;
}

/** Admin: list all challenges (drafts included). */
export async function adminListChallenges(): Promise<AdminChallengeListItem[]> {
    const { data } = await supabaseAdmin()
      .from("frontend_challenges")
      .select("id,slug,title,difficulty,tech,is_published,stats,created_at")
      .order("created_at", { ascending: false }).limit(200);
    return ((data ?? []) as {
      id: string; slug: string; title: string; difficulty: string; tech: string;
      is_published: boolean; stats: { attempts?: number } | null; created_at: string;
    }[]).map((c) => ({
      id: c.id, slug: c.slug, title: c.title, difficulty: c.difficulty, tech: c.tech,
      isPublished: c.is_published, attempts: c.stats?.attempts ?? 0, createdAt: new Date(c.created_at),
    }));
}

export interface CreateChallengeInput {
  title: string; difficulty: string; tech: string; tags: string[]; brief: string;
  description: string; designSpec: string; starterFiles: { path: string; code: string }[];
  checklist: string[]; isPublished: boolean; createdBy: string;
}

/** Admin: create a challenge. Returns id + slug. */
export async function createChallenge(input: CreateChallengeInput): Promise<{ id: string; slug: string }> {
    const sb = supabaseAdmin();
    const slug = await uniqueSlug(input.title, async (s) => {
      const { data } = await sb.from("frontend_challenges").select("id").eq("slug", s).maybeSingle();
      return Boolean(data);
    });
    const { data, error } = await sb.from("frontend_challenges").insert({
      slug, title: input.title, difficulty: input.difficulty, tech: input.tech, tags: input.tags,
      brief: input.brief, description: input.description, design_spec: input.designSpec,
      starter_files: input.starterFiles, checklist: input.checklist, is_published: input.isPublished,
      created_by: toUuidOrNull(input.createdBy),
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: string }).id, slug };
}

/** Admin: full challenge detail for the edit dialog. */
export async function getAdminChallenge(id: string) {
    const { data } = await supabaseAdmin()
      .from("frontend_challenges")
      .select("id,title,difficulty,tech,tags,brief,description,design_spec,starter_files,checklist,is_published")
      .eq("id", id).maybeSingle();
    if (!data) return null;
    const c = data as {
      id: string; title: string; difficulty: string; tech: string; tags: string[] | null; brief: string;
      description: string; design_spec: string | null; starter_files: { path: string; code: string }[] | null;
      checklist: string[] | null; is_published: boolean;
    };
    return {
      id: c.id, title: c.title, difficulty: c.difficulty, tech: c.tech, tags: c.tags ?? [], brief: c.brief,
      description: c.description, designSpec: c.design_spec ?? "", starterFiles: filesToRecord(c.starter_files ?? []),
      checklist: c.checklist ?? [], isPublished: c.is_published,
    };
}

const C_FIELD_MAP: Record<string, string> = {
  title: "title", difficulty: "difficulty", tech: "tech", tags: "tags", brief: "brief",
  description: "description", designSpec: "design_spec", starterFiles: "starter_files",
  checklist: "checklist", isPublished: "is_published",
};

/** Admin: update a challenge. `starterFiles` is a path→code record. Returns slug. */
export async function updateChallenge(id: string, patch: Record<string, unknown>): Promise<string | null> {
  const mapped: Record<string, unknown> = { ...patch };
  if ("starterFiles" in mapped && mapped.starterFiles) {
    mapped.starterFiles = recordToFiles(mapped.starterFiles as Record<string, string>);
  }
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(mapped)) if (C_FIELD_MAP[k]) row[C_FIELD_MAP[k]] = v;
    if (!Object.keys(row).length) {
      const { data } = await supabaseAdmin().from("frontend_challenges").select("slug").eq("id", id).maybeSingle();
      return (data as { slug: string } | null)?.slug ?? null;
    }
    const { data, error } = await supabaseAdmin().from("frontend_challenges").update(row).eq("id", id).select("slug").maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { slug: string } | null)?.slug ?? null;
}

/** Admin: delete a challenge and its submissions. Returns false if not found. */
export async function deleteChallengeCascade(id: string): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data } = await sb.from("frontend_challenges").delete().eq("id", id).select("id").maybeSingle();
    if (!data) return false;
    await sb.from("submissions").delete().eq("challenge_id", id);
    return true;
}
