import { cached } from "@/lib/redis";
import { totalXpForLevel } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";


export interface HeatmapDay {
  date: string;
  count: number;
}

export interface DashboardData {
  name: string;
  username: string;
  image: string | null;
  coverImage: string | null;
  joinedAt: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rank: number;
  streak: { current: number; longest: number };
  solved: { easy: number; medium: number; hard: number; total: number };
  totalQuestions: { easy: number; medium: number; hard: number; total: number };
  frontendCompleted: number;
  successRate: number | null;
  attempted: number;
  heatmap: HeatmapDay[];
  badges: { key: string; name: string; description: string; icon: string; tier: string; awardedAt: string }[];
  recentSubmissions: {
    id: string;
    title: string;
    slug: string;
    status: string;
    language: string | null;
    createdAt: string;
  }[];
  progress: { track: string; percent: number }[];
}

/** Normalized user shape buildStats needs, from either backend. */
interface StatsUser {
  id: string;
  name: string;
  username: string;
  image: string | null;
  coverImage: string | null;
  createdAt: Date;
  bio: string | null;
  location: string | null;
  website: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  stats: {
    xp: number;
    level: number;
    solved: { easy: number; medium: number; hard: number; total: number };
    streak: { current: number; longest: number };
    frontendCompleted: number;
  };
}

interface SbUserRow {
  id: string;
  name: string;
  username: string;
  image: string | null;
  cover_image: string | null;
  created_at: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  stats: StatsUser["stats"] | null;
}

const EMPTY_STATS: StatsUser["stats"] = {
  xp: 0,
  level: 1,
  solved: { easy: 0, medium: 0, hard: 0, total: 0 },
  streak: { current: 0, longest: 0 },
  frontendCompleted: 0,
};

function fromSbRow(row: SbUserRow): StatsUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    image: row.image ?? null,
    coverImage: row.cover_image ?? null,
    createdAt: new Date(row.created_at),
    bio: row.bio ?? null,
    location: row.location ?? null,
    website: row.website ?? null,
    githubUrl: row.github_url ?? null,
    linkedinUrl: row.linkedin_url ?? null,
    stats: { ...EMPTY_STATS, ...(row.stats ?? {}) },
  };
}

const SB_USER_COLS =
  "id,name,username,image,cover_image,created_at,bio,location,website,github_url,linkedin_url,stats";

async function buildStats(user: StatsUser): Promise<DashboardData> {
  const oneYearAgo = new Date();
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  const sinceDate = oneYearAgo.toISOString().slice(0, 10);

  const totals = { easy: 0, medium: 0, hard: 0, total: 0 };
  let rankAbove = 0;
  let heatmap: HeatmapDay[] = [];
  let badges: DashboardData["badges"] = [];
  let recentSubmissions: DashboardData["recentSubmissions"] = [];
  let attempted = 0;
  let acceptedCount = 0;
  let submissionCount = 0;
  let progress: { track: string; percent: number }[] = [];

  {    const sb = supabaseAdmin();
    const [
      xpRows,
      activity,
      userBadges,
      recent,
      attemptedRows,
      acceptedRes,
      totalRes,
      progressRows,
      questionRows,
    ] = await Promise.all([
      sb.from("users").select("stats").eq("banned", false),
      sb
        .from("daily_activity")
        .select("date,accepted,submissions")
        .eq("user_id", user.id)
        .gte("date", sinceDate),
      sb
        .from("user_badges")
        .select("awarded_at,badges(key,name,description,icon,tier)")
        .eq("user_id", user.id),
      sb
        .from("submissions")
        .select("id,status,language,created_at,questions(title,slug)")
        .eq("user_id", user.id)
        .eq("kind", "dsa")
        .order("created_at", { ascending: false })
        .limit(8),
      sb
        .from("submissions")
        .select("question_id")
        .eq("user_id", user.id)
        .eq("kind", "dsa")
        .not("question_id", "is", null),
      sb
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "Accepted"),
      sb
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      sb.from("progress").select("track,percent").eq("user_id", user.id),
      sb.from("questions").select("difficulty").eq("is_published", true),
    ]);

    rankAbove = ((xpRows.data ?? []) as { stats: { xp?: number } | null }[]).filter(
      (u) => (u.stats?.xp ?? 0) > user.stats.xp,
    ).length;

    heatmap = ((activity.data ?? []) as { date: string; accepted: number }[]).map(
      (day) => ({ date: day.date, count: day.accepted }),
    );

    badges = (
      (userBadges.data ?? []) as unknown as {
        awarded_at: string;
        badges: { key: string; name: string; description: string; icon: string; tier: string } | null;
      }[]
    )
      .filter((entry) => entry.badges)
      .map((entry) => ({
        key: entry.badges!.key,
        name: entry.badges!.name,
        description: entry.badges!.description,
        icon: entry.badges!.icon,
        tier: entry.badges!.tier,
        awardedAt: new Date(entry.awarded_at).toISOString(),
      }));

    recentSubmissions = (
      (recent.data ?? []) as unknown as {
        id: string;
        status: string;
        language: string | null;
        created_at: string;
        questions: { title: string; slug: string } | null;
      }[]
    )
      .filter((s) => s.questions)
      .map((s) => ({
        id: s.id,
        title: s.questions!.title,
        slug: s.questions!.slug,
        status: s.status,
        language: s.language ?? null,
        createdAt: new Date(s.created_at).toISOString(),
      }));

    attempted = new Set(
      ((attemptedRows.data ?? []) as { question_id: string }[]).map(
        (r) => r.question_id,
      ),
    ).size;
    acceptedCount = acceptedRes.count ?? 0;
    submissionCount = totalRes.count ?? 0;
    progress = ((progressRows.data ?? []) as { track: string; percent: number }[]).map(
      (p) => ({ track: p.track, percent: p.percent }),
    );

    for (const row of (questionRows.data ?? []) as { difficulty: string }[]) {
      const key = row.difficulty.toLowerCase() as "easy" | "medium" | "hard";
      if (key in totals) {
        totals[key] += 1;
        totals.total += 1;
      }
    }}

  const currentLevelXp = totalXpForLevel(user.stats.level);
  const nextLevelXp = totalXpForLevel(user.stats.level + 1);

  return {
    name: user.name,
    username: user.username,
    image: user.image,
    coverImage: user.coverImage,
    joinedAt: user.createdAt.toISOString(),
    bio: user.bio,
    location: user.location,
    website: user.website,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    xp: user.stats.xp,
    level: user.stats.level,
    xpIntoLevel: user.stats.xp - currentLevelXp,
    xpForNextLevel: nextLevelXp - currentLevelXp,
    rank: rankAbove + 1,
    streak: {
      current: user.stats.streak.current,
      longest: user.stats.streak.longest,
    },
    solved: { ...user.stats.solved },
    totalQuestions: totals,
    frontendCompleted: user.stats.frontendCompleted,
    successRate:
      submissionCount > 0
        ? Math.round((acceptedCount / submissionCount) * 100)
        : null,
    attempted,
    heatmap,
    badges,
    recentSubmissions,
    progress,
  };
}

export async function getDashboardData(
  userId: string,
): Promise<DashboardData | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select(SB_USER_COLS)
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    return buildStats(fromSbRow(data as SbUserRow));
}

export async function getPublicProfile(
  username: string,
): Promise<DashboardData | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select(SB_USER_COLS)
      .eq("username", username.toLowerCase())
      .eq("banned", false)
      .maybeSingle();
    if (!data) return null;
    return buildStats(fromSbRow(data as SbUserRow));
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  username: string;
  image: string | null;
  xp: number;
  level: number;
  solvedTotal: number;
  streak: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  return cached(`leaderboard:top:${limit}`, 120, async () => {
      const { data } = await supabaseAdmin()
        .from("users")
        .select("name,username,image,stats")
        .eq("banned", false);
      const rows = ((data ?? []) as {
        name: string;
        username: string;
        image: string | null;
        stats: StatsUser["stats"] | null;
      }[])
        .map((u) => ({ ...u, stats: { ...EMPTY_STATS, ...(u.stats ?? {}) } }))
        .sort((a, b) => b.stats.xp - a.stats.xp)
        .slice(0, limit);
      return rows.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        username: user.username,
        image: user.image ?? null,
        xp: user.stats.xp,
        level: user.stats.level,
        solvedTotal: user.stats.solved.total,
        streak: user.stats.streak.current,
      }));
  });
}

export async function getUserRank(userId: string): Promise<number> {
    const sb = supabaseAdmin();
    const { data: me } = await sb
      .from("users")
      .select("stats")
      .eq("id", userId)
      .maybeSingle();
    if (!me) return 0;
    const myXp = (me as { stats: { xp?: number } | null }).stats?.xp ?? 0;
    const { data: all } = await sb
      .from("users")
      .select("stats")
      .eq("banned", false);
    const above = ((all ?? []) as { stats: { xp?: number } | null }[]).filter(
      (u) => (u.stats?.xp ?? 0) > myXp,
    ).length;
    return above + 1;
}
