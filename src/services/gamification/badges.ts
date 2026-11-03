import { supabaseAdmin } from "@/lib/supabase/admin";


/** Stats fields badge criteria are evaluated against (backend-agnostic). */
export interface BadgeStats {
  solved: { easy: number; medium: number; hard: number; total: number };
  streak: { current: number };
  frontendCompleted: number;
  level: number;
}

/** Minimal user the badge engine needs, from either backend. */
export interface AwardUser {
  id: string;
  stats: BadgeStats;
}

/** Normalized earned-badge shape returned to callers. */
export interface EarnedBadge {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

interface BadgeCriteria {
  type: string;
  threshold: number;
}

export const DEFAULT_BADGES = [
  // solving
  { key: "first-blood", name: "First Blood", description: "Solve your first problem", icon: "sword", tier: "bronze", criteria: { type: "solved_total", threshold: 1 } },
  { key: "problem-solver", name: "Problem Solver", description: "Solve 10 problems", icon: "puzzle", tier: "bronze", criteria: { type: "solved_total", threshold: 10 } },
  { key: "half-century", name: "Half Century", description: "Solve 50 problems", icon: "medal", tier: "silver", criteria: { type: "solved_total", threshold: 50 } },
  { key: "centurion", name: "Centurion", description: "Solve 100 problems", icon: "crown", tier: "gold", criteria: { type: "solved_total", threshold: 100 } },
  { key: "easy-rider", name: "Easy Rider", description: "Solve 25 easy problems", icon: "leaf", tier: "bronze", criteria: { type: "solved_easy", threshold: 25 } },
  { key: "medium-rare", name: "Medium Rare", description: "Solve 25 medium problems", icon: "flame", tier: "silver", criteria: { type: "solved_medium", threshold: 25 } },
  { key: "hard-core", name: "Hard Core", description: "Solve 10 hard problems", icon: "skull", tier: "gold", criteria: { type: "solved_hard", threshold: 10 } },
  // streaks
  { key: "warming-up", name: "Warming Up", description: "3-day solve streak", icon: "thermometer", tier: "bronze", criteria: { type: "streak", threshold: 3 } },
  { key: "on-fire", name: "On Fire", description: "7-day solve streak", icon: "flame", tier: "silver", criteria: { type: "streak", threshold: 7 } },
  { key: "unstoppable", name: "Unstoppable", description: "30-day solve streak", icon: "rocket", tier: "gold", criteria: { type: "streak", threshold: 30 } },
  // frontend
  { key: "pixel-pusher", name: "Pixel Pusher", description: "Complete 5 frontend challenges", icon: "paintbrush", tier: "bronze", criteria: { type: "frontend_completed", threshold: 5 } },
  { key: "ui-artisan", name: "UI Artisan", description: "Complete 15 frontend challenges", icon: "palette", tier: "silver", criteria: { type: "frontend_completed", threshold: 15 } },
  // levels
  { key: "level-5", name: "Rising Star", description: "Reach level 5", icon: "star", tier: "bronze", criteria: { type: "level", threshold: 5 } },
  { key: "level-10", name: "Code Veteran", description: "Reach level 10", icon: "shield", tier: "silver", criteria: { type: "level", threshold: 10 } },
  { key: "level-20", name: "Forge Master", description: "Reach level 20", icon: "hammer", tier: "gold", criteria: { type: "level", threshold: 20 } },
] as const;

let badgesEnsured = false;

export async function ensureDefaultBadges(): Promise<void> {
  if (badgesEnsured) return;
    const sb = supabaseAdmin();
    const { count } = await sb
      .from("badges")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) === 0) {
      // ignoreDuplicates so a concurrent seed race is harmless (key is unique).
      await sb
        .from("badges")
        .upsert([...DEFAULT_BADGES], { onConflict: "key", ignoreDuplicates: true });
    }
    badgesEnsured = true;
    return;
}

function badgeMetric(stats: BadgeStats, type: string): number {
  switch (type) {
    case "solved_total":
      return stats.solved.total;
    case "solved_easy":
      return stats.solved.easy;
    case "solved_medium":
      return stats.solved.medium;
    case "solved_hard":
      return stats.solved.hard;
    case "streak":
      return stats.streak.current;
    case "frontend_completed":
      return stats.frontendCompleted;
    case "level":
      return stats.level;
    case "contest_participation":
      return 0; // awarded explicitly from the contest flow
    default:
      return 0;
  }
}

interface SbBadgeRow {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  criteria: BadgeCriteria;
}

/** Awards any badges the user now qualifies for. Returns newly earned badges. */
export async function checkAndAwardBadges(
  user: AwardUser,
): Promise<EarnedBadge[]> {
  await ensureDefaultBadges();
    const sb = supabaseAdmin();
    const [badgesRes, ownedRes] = await Promise.all([
      sb.from("badges").select("id,key,name,description,icon,tier,criteria"),
      sb.from("user_badges").select("badge_id").eq("user_id", user.id),
    ]);
    const allBadges = (badgesRes.data ?? []) as SbBadgeRow[];
    const ownedIds = new Set(
      ((ownedRes.data ?? []) as { badge_id: string }[]).map((e) => e.badge_id),
    );
    const earned = allBadges.filter(
      (badge) =>
        !ownedIds.has(badge.id) &&
        badge.criteria.type !== "contest_participation" &&
        badgeMetric(user.stats, badge.criteria.type) >= badge.criteria.threshold,
    );
    if (earned.length > 0) {
      await sb.from("user_badges").upsert(
        earned.map((badge) => ({ user_id: user.id, badge_id: badge.id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
    }
    return earned.map((b) => ({
      key: b.key,
      name: b.name,
      description: b.description,
      icon: b.icon,
      tier: b.tier,
    }));
}

const CONTENDER_BADGE = {
  key: "contender",
  name: "Contender",
  description: "Participate in a contest",
  icon: "trophy",
  tier: "bronze",
  criteria: { type: "contest_participation", threshold: 1 },
};

export async function awardContestBadge(
  userId: string,
): Promise<void> {
  await ensureDefaultBadges();
    const sb = supabaseAdmin();
    await sb
      .from("badges")
      .upsert([CONTENDER_BADGE], { onConflict: "key", ignoreDuplicates: true });
    const { data: badge } = await sb
      .from("badges")
      .select("id")
      .eq("key", "contender")
      .maybeSingle();
    if (badge) {
      await sb.from("user_badges").upsert(
        { user_id: String(userId), badge_id: (badge as { id: string }).id },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
    }
    return;
}
