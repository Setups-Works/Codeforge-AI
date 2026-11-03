import { cached,cache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardContestBadge } from "@/services/gamification/badges";


/** Embedded participant shape stored in the contests.participants jsonb. */
interface SbParticipant {
  user: string;
  joinedAt: string;
  score: number;
  penaltySeconds: number;
  solvedQuestionIds: string[];
  finished: boolean;
}
/** Embedded question entry stored in the contests.questions jsonb. */
interface SbContestQuestion {
  question: string;
  points: number;
}
interface SbContestRow {
  slug: string;
  title: string;
  description: string;
  type: string;
  starts_at: string;
  duration_minutes: number;
  participants: SbParticipant[] | null;
  questions: SbContestQuestion[] | null;
}

export type ContestStatus = "upcoming" | "live" | "ended";

export function contestStatus(
  startsAt: Date,
  durationMinutes: number,
  now = Date.now(),
): ContestStatus {
  const start = startsAt.getTime();
  const end = start + durationMinutes * 60_000;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "ended";
}

export interface ContestListItem {
  slug: string;
  title: string;
  type: string;
  startsAt: string;
  durationMinutes: number;
  status: ContestStatus;
  participantCount: number;
  questionCount: number;
  joined: boolean;
}

export async function listContests(
  userId?: string,
): Promise<ContestListItem[]> {
    const { data, error } = await supabaseAdmin()
      .from("contests")
      .select("slug,title,type,starts_at,duration_minutes,participants,questions")
      .eq("is_published", true)
      .order("starts_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as SbContestRow[]).map((contest) => {
      const participants = contest.participants ?? [];
      const startsAt = new Date(contest.starts_at);
      return {
        slug: contest.slug,
        title: contest.title,
        type: contest.type,
        startsAt: startsAt.toISOString(),
        durationMinutes: contest.duration_minutes,
        status: contestStatus(startsAt, contest.duration_minutes),
        participantCount: participants.length,
        questionCount: (contest.questions ?? []).length,
        joined: userId ? participants.some((p) => p.user === userId) : false,
      };
    });
}

export interface ContestDetail {
  slug: string;
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: ContestStatus;
  participantCount: number;
  joined: boolean;
  /** Question list only revealed to joined users during/after the contest */
  questions:
    | { slug: string; title: string; difficulty: string; points: number; solved: boolean }[]
    | null;
}

export async function getContestDetail(
  slug: string,
  userId?: string,
): Promise<ContestDetail | null> {
return getContestDetailSupabase(slug, userId);
}

async function getContestDetailSupabase(
  slug: string,
  userId?: string,
): Promise<ContestDetail | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contests")
    .select("slug,title,description,type,starts_at,duration_minutes,participants,questions")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const contest = data as SbContestRow;

  const startsAt = new Date(contest.starts_at);
  const status = contestStatus(startsAt, contest.duration_minutes);
  const participants = contest.participants ?? [];
  const participant = userId
    ? participants.find((p) => p.user === userId)
    : undefined;
  const joined = !!participant;
  const revealQuestions =
    status !== "upcoming" && (joined || status === "ended");

  let questions: ContestDetail["questions"] = null;
  if (revealQuestions) {
    const entries = contest.questions ?? [];
    const ids = entries.map((e) => e.question).filter(Boolean);
    const { data: qs } = ids.length
      ? await sb
          .from("questions")
          .select("id,slug,title,difficulty")
          .in("id", ids)
      : { data: [] };
    const qMap = new Map(
      ((qs ?? []) as { id: string; slug: string; title: string; difficulty: string }[]).map(
        (q) => [q.id, q],
      ),
    );
    questions = entries
      .map((entry) => {
        const q = qMap.get(entry.question);
        if (!q) return null;
        return {
          slug: q.slug,
          title: q.title,
          difficulty: q.difficulty,
          points: entry.points,
          solved: participant?.solvedQuestionIds.includes(q.id) ?? false,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  return {
    slug: contest.slug,
    title: contest.title,
    description: contest.description,
    type: contest.type,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(
      startsAt.getTime() + contest.duration_minutes * 60_000,
    ).toISOString(),
    durationMinutes: contest.duration_minutes,
    status,
    participantCount: participants.length,
    joined,
    questions,
  };
}

export async function joinContest(
  slug: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("contests")
      .select("id,starts_at,duration_minutes,participants")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return { ok: false, error: "Contest not found" };
    const row = data as {
      id: string;
      starts_at: string;
      duration_minutes: number;
      participants: SbParticipant[] | null;
    };
    const startsAt = new Date(row.starts_at);
    if (contestStatus(startsAt, row.duration_minutes) === "ended") {
      return { ok: false, error: "This contest has already ended" };
    }
    const participants = row.participants ?? [];
    if (participants.some((p) => p.user === userId)) return { ok: true };
    participants.push({
      user: userId,
      joinedAt: new Date().toISOString(),
      score: 0,
      penaltySeconds: 0,
      solvedQuestionIds: [],
      finished: false,
    });
    const { error } = await sb
      .from("contests")
      .update({ participants })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    await cache.del(`contest:lb:${slug}`);
    return { ok: true };
}

export interface ContestLeaderboardEntry {
  rank: number;
  name: string;
  username: string;
  image: string | null;
  score: number;
  penaltySeconds: number;
  solvedCount: number;
}

export async function getContestLeaderboard(
  slug: string,
): Promise<ContestLeaderboardEntry[] | null> {
  return cached(`contest:lb:${slug}`, 30, async () => {
      const sb = supabaseAdmin();
      const { data } = await sb
        .from("contests")
        .select("participants")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!data) return null;
      const participants =
        (data as { participants: SbParticipant[] | null }).participants ?? [];
      const userIds = participants.map((p) => p.user);
      const { data: users } = userIds.length
        ? await sb.from("users").select("id,name,username,image").in("id", userIds)
        : { data: [] };
      const userMap = new Map(
        ((users ?? []) as { id: string; name: string; username: string; image: string | null }[]).map(
          (u) => [u.id, u],
        ),
      );
      return participants
        .map((participant) => {
          const user = userMap.get(participant.user);
          return {
            name: user?.name ?? "Unknown",
            username: user?.username ?? "",
            image: user?.image ?? null,
            score: participant.score,
            penaltySeconds: participant.penaltySeconds,
            solvedCount: participant.solvedQuestionIds.length,
          };
        })
        .sort((a, b) => b.score - a.score || a.penaltySeconds - b.penaltySeconds)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
  });
}

/**
 * When a submission arrives from a live contest arena, link it to the contest
 * and (on first accept of a scored question) award points + penalty. Returns
 * the contest's native id to store on the submission, or null when the question
 * isn't part of a currently-live contest.
 */
export async function scoreContestSolve(opts: {
  slug: string;
  userId: string;
  questionId: string;
  accepted: boolean;
  now?: number;
}): Promise<string | null> {
  const now = opts.now ?? Date.now();
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("contests")
      .select("id,starts_at,duration_minutes,questions,participants")
      .eq("slug", opts.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;
    const row = data as {
      id: string;
      starts_at: string;
      duration_minutes: number;
      questions: SbContestQuestion[] | null;
      participants: SbParticipant[] | null;
    };
    const start = new Date(row.starts_at).getTime();
    const entry = (row.questions ?? []).find((q) => q.question === opts.questionId);
    if (!entry || now < start || now > start + row.duration_minutes * 60_000) {
      return null;
    }
    const participants = row.participants ?? [];
    const participant = participants.find((p) => p.user === opts.userId);
    if (
      participant &&
      opts.accepted &&
      !participant.solvedQuestionIds.includes(opts.questionId)
    ) {
      participant.solvedQuestionIds.push(opts.questionId);
      participant.score += entry.points;
      participant.penaltySeconds += Math.floor((now - start) / 1000);
      await sb.from("contests").update({ participants }).eq("id", row.id);
      await awardContestBadge(opts.userId);
    }
    return row.id;
}

/** Deterministic daily challenge: rotates through published questions by date */
export async function getDailyChallenge(): Promise<{
  id: string;
  slug: string;
  title: string;
  difficulty: string;
} | null> {
  return cached("daily-challenge", 600, async () => {
    const dayNumber = Math.floor(Date.now() / 86_400_000);
      const sb = supabaseAdmin();
      const { count } = await sb
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);
      if (!count) return null;
      const offset = dayNumber % count;
      const { data } = await sb
        .from("questions")
        .select("id,slug,title,difficulty")
        .eq("is_published", true)
        .order("created_at", { ascending: true })
        .range(offset, offset);
      const q = (data ?? [])[0] as
        | { id: string; slug: string; title: string; difficulty: string }
        | undefined;
      if (!q) return null;
      return { id: q.id, slug: q.slug, title: q.title, difficulty: q.difficulty };
  });
}

// ── Admin ────────────────────────────────────────────────────────────────
import { uniqueSlug } from "@/lib/slug";
import { toUuidOrNull } from "@/lib/data-backend";

export interface AdminContestListItem {
  id: string; slug: string; title: string; type: string; startsAt: Date;
  durationMinutes: number; isPublished: boolean; participantCount: number; questionCount: number;
}

/** Admin: list all contests (drafts included). */
export async function adminListContests(): Promise<AdminContestListItem[]> {
    const { data } = await supabaseAdmin()
      .from("contests")
      .select("id,slug,title,type,starts_at,duration_minutes,is_published,participants,questions")
      .order("starts_at", { ascending: false }).limit(100);
    return ((data ?? []) as {
      id: string; slug: string; title: string; type: string; starts_at: string; duration_minutes: number;
      is_published: boolean; participants: unknown[] | null; questions: unknown[] | null;
    }[]).map((c) => ({
      id: c.id, slug: c.slug, title: c.title, type: c.type, startsAt: new Date(c.starts_at),
      durationMinutes: c.duration_minutes, isPublished: c.is_published,
      participantCount: (c.participants ?? []).length, questionCount: (c.questions ?? []).length,
    }));
}

/** Count published questions among the given ids (contest validation). */
export async function countPublishedQuestions(ids: string[]): Promise<number> {
    const { count } = await supabaseAdmin()
      .from("questions").select("id", { count: "exact", head: true })
      .in("id", ids).eq("is_published", true);
    return count ?? 0;
}

export interface CreateContestInput {
  title: string; description: string; type: string; startsAt: Date; durationMinutes: number;
  questions: { questionId: string; points: number }[]; isPublished: boolean; createdBy: string;
}

/** Admin: create a contest. Returns id + slug. */
export async function createContest(input: CreateContestInput): Promise<{ id: string; slug: string }> {
    const sb = supabaseAdmin();
    const slug = await uniqueSlug(input.title, async (s) => {
      const { data } = await sb.from("contests").select("id").eq("slug", s).maybeSingle();
      return Boolean(data);
    });
    const { data, error } = await sb.from("contests").insert({
      slug, title: input.title, description: input.description, type: input.type,
      starts_at: input.startsAt.toISOString(), duration_minutes: input.durationMinutes,
      questions: input.questions.map((q) => ({ question: q.questionId, points: q.points })),
      participants: [], is_published: input.isPublished, created_by: toUuidOrNull(input.createdBy),
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: string }).id, slug };
}

export interface ContestPatch {
  isPublished?: boolean; title?: string; startsAt?: Date; durationMinutes?: number;
}
const CONTEST_FIELD_MAP: Record<keyof ContestPatch, string> = {
  isPublished: "is_published", title: "title", startsAt: "starts_at", durationMinutes: "duration_minutes",
};

/** Admin: update a contest. Returns false if not found. */
export async function updateContest(id: string, patch: ContestPatch): Promise<boolean> {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      row[CONTEST_FIELD_MAP[k as keyof ContestPatch]] = v instanceof Date ? v.toISOString() : v;
    }
    if (!Object.keys(row).length) return true;
    const { data, error } = await supabaseAdmin().from("contests").update(row).eq("id", id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
}

/** Admin: delete a contest. Returns false if not found. */
export async function deleteContest(id: string): Promise<boolean> {
    const { data } = await supabaseAdmin().from("contests").delete().eq("id", id).select("id").maybeSingle();
    return Boolean(data);
}
