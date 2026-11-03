import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentPeriod,monthlyAllowance } from "@/services/ai-credits";


const day = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

export interface AdminAnalytics {
  totals: {
    users: number; newUsers30d: number; questions: number; publishedQuestions: number;
    challenges: number; contests: number; submissions: number; acceptanceRate: number;
  };
  signupSeries: { date: string; signups: number }[];
  submissionSeries: { date: string; submissions: number; accepted: number }[];
  languageDistribution: { language: string; count: number }[];
  difficultyAcceptance: { difficulty: string; total: number; accepted: number; rate: number }[];
  revenue: { total: number; thisMonth: number; payments: number; payingUsers: number; currency: string };
}

/** Platform analytics dashboard. */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const monthStart = new Date(new Date().toISOString().slice(0, 7) + "-01T00:00:00.000Z");
    const sb = supabaseAdmin();
    // Minimal builder surface to sidestep Supabase's deeply-generic types.
    interface Filterable {
      gte(col: string, v: unknown): Filterable;
      eq(col: string, v: unknown): Filterable;
      in(col: string, v: unknown[]): Filterable;
    }
    const countOf = async (table: string, apply?: (q: Filterable) => Filterable): Promise<number> => {
      const base = sb.from(table).select("id", { count: "exact", head: true });
      const q = apply ? (apply(base as unknown as Filterable) as unknown as typeof base) : base;
      const { count } = await q;
      return count ?? 0;
    };

    const [
      totalUsers, newUsers30d, totalQuestions, publishedQuestions, totalChallenges, totalContests,
      totalSubmissions, acceptedSubmissions, payingUsers,
    ] = await Promise.all([
      countOf("users"),
      countOf("users", (q) => q.gte("created_at", thirtyDaysAgo.toISOString())),
      countOf("questions"),
      countOf("questions", (q) => q.eq("is_published", true)),
      countOf("frontend_challenges"),
      countOf("contests"),
      countOf("submissions"),
      countOf("submissions", (q) => q.eq("status", "Accepted")),
      countOf("users", (q) => q.in("plan", ["go", "plus"])),
    ]);

    const [signupRows, subRows, langRows, dsaRows, questionsForDiff, paidSubs] = await Promise.all([
      sb.from("users").select("created_at").gte("created_at", thirtyDaysAgo.toISOString()),
      sb.from("submissions").select("created_at,status").gte("created_at", thirtyDaysAgo.toISOString()),
      sb.from("submissions").select("language").not("language", "is", null),
      sb.from("submissions").select("question_id,status").eq("kind", "dsa").not("question_id", "is", null),
      sb.from("questions").select("id,difficulty"),
      sb.from("subscriptions").select("amount,currency,created_at").eq("status", "paid"),
    ]);

    // signup series
    const signupMap = new Map<string, number>();
    for (const r of (signupRows.data ?? []) as { created_at: string }[]) signupMap.set(day(r.created_at), (signupMap.get(day(r.created_at)) ?? 0) + 1);
    // submission series
    const subMap = new Map<string, { count: number; accepted: number }>();
    for (const r of (subRows.data ?? []) as { created_at: string; status: string }[]) {
      const k = day(r.created_at); const e = subMap.get(k) ?? { count: 0, accepted: 0 };
      e.count++; if (r.status === "Accepted") e.accepted++; subMap.set(k, e);
    }
    // language distribution
    const langMap = new Map<string, number>();
    for (const r of (langRows.data ?? []) as { language: string }[]) langMap.set(r.language, (langMap.get(r.language) ?? 0) + 1);
    // difficulty acceptance
    const diffOf = new Map<string, string>();
    for (const q of (questionsForDiff.data ?? []) as { id: string; difficulty: string }[]) diffOf.set(q.id, q.difficulty);
    const diffMap = new Map<string, { total: number; accepted: number }>();
    for (const r of (dsaRows.data ?? []) as { question_id: string; status: string }[]) {
      const d = diffOf.get(r.question_id); if (!d) continue;
      const e = diffMap.get(d) ?? { total: 0, accepted: 0 }; e.total++; if (r.status === "Accepted") e.accepted++; diffMap.set(d, e);
    }
    // revenue
    const paid = (paidSubs.data ?? []) as { amount: number; currency: string; created_at: string }[];
    const revenueTotal = paid.reduce((s, p) => s + (p.amount ?? 0), 0);
    const revenueMonth = paid.filter((p) => new Date(p.created_at) >= monthStart).reduce((s, p) => s + (p.amount ?? 0), 0);

    return buildAnalytics({
      totalUsers, newUsers30d, totalQuestions, publishedQuestions, totalChallenges, totalContests,
      totalSubmissions, acceptedSubmissions, payingUsers,
      signupSeries: [...signupMap.entries()].sort().map(([date, signups]) => ({ date, signups })),
      submissionSeries: [...subMap.entries()].sort().map(([date, v]) => ({ date, submissions: v.count, accepted: v.accepted })),
      languageDistribution: [...langMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([language, count]) => ({ language, count })),
      difficultyAcceptance: [...diffMap.entries()].map(([difficulty, v]) => ({ difficulty, total: v.total, accepted: v.accepted, rate: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : 0 })),
      revenueTotal, revenueMonth, revenuePayments: paid.length, currency: paid[paid.length - 1]?.currency ?? "INR",
    });
}

function buildAnalytics(x: {
  totalUsers: number; newUsers30d: number; totalQuestions: number; publishedQuestions: number;
  totalChallenges: number; totalContests: number; totalSubmissions: number; acceptedSubmissions: number;
  payingUsers: number;
  signupSeries: { date: string; signups: number }[];
  submissionSeries: { date: string; submissions: number; accepted: number }[];
  languageDistribution: { language: string; count: number }[];
  difficultyAcceptance: { difficulty: string; total: number; accepted: number; rate: number }[];
  revenueTotal: number; revenueMonth: number; revenuePayments: number; currency: string;
}): AdminAnalytics {
  return {
    totals: {
      users: x.totalUsers, newUsers30d: x.newUsers30d, questions: x.totalQuestions,
      publishedQuestions: x.publishedQuestions, challenges: x.totalChallenges, contests: x.totalContests,
      submissions: x.totalSubmissions,
      acceptanceRate: x.totalSubmissions > 0 ? Math.round((x.acceptedSubmissions / x.totalSubmissions) * 100) : 0,
    },
    signupSeries: x.signupSeries,
    submissionSeries: x.submissionSeries,
    languageDistribution: x.languageDistribution,
    difficultyAcceptance: x.difficultyAcceptance,
    revenue: { total: x.revenueTotal, thisMonth: x.revenueMonth, payments: x.revenuePayments, payingUsers: x.payingUsers, currency: x.currency },
  };
}

// ── Billing dashboard ──────────────────────────────────────────────────────

export interface AdminBillingRow {
  id: string; name: string; username: string; email: string | null; image: string | null;
  plan: string; active: boolean; billingCycle: string | null; planExpiresAt: Date | null; trialEndsAt: Date | null;
  usage: { period: string; used: number; allowance: number | null; remaining: number | null; unlimited: boolean };
  revenue: number; payments: number; currency: string; lastPaymentAt: Date | null; createdAt: Date;
}
export interface AdminBilling {
  rows: AdminBillingRow[];
  period: string;
  summary: { totalRevenue: number; totalPayments: number; currency: string; payingUsers: number; creditsUsedThisMonth: number };
}

interface BillingUser {
  id: string; name: string; username: string; email: string | null; image: string | null;
  plan: string; planExpiresAt: Date | null; trialEndsAt: Date | null; billingCycle: string | null; createdAt: Date;
}

/** Admin billing dashboard: per-user plan, AI usage, revenue. */
export async function getAdminBilling(filter: { q?: string; plan?: string }): Promise<AdminBilling> {
  const period = currentPeriod();
  const now = Date.now();

  let users: BillingUser[];
  const usageByUser = new Map<string, number>();
  const payByUser = new Map<string, { total: number; count: number; lastPaymentAt: Date; currency: string }>();
  let summary: AdminBilling["summary"];

  {    const sb = supabaseAdmin();
    let uq = sb.from("users")
      .select("id,name,username,email,image,plan,plan_expires_at,trial_ends_at,billing_cycle,created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (filter.q) { const like = `%${filter.q}%`; uq = uq.or(`name.ilike.${like},email.ilike.${like},username.ilike.${like}`); }
    if (filter.plan && filter.plan !== "all") uq = uq.eq("plan", filter.plan);
    const { data: uData } = await uq;
    users = ((uData ?? []) as Record<string, unknown>[]).map((u) => ({
      id: u.id as string, name: u.name as string, username: u.username as string, email: (u.email as string) ?? null,
      image: (u.image as string) ?? null, plan: (u.plan as string) ?? "free",
      planExpiresAt: u.plan_expires_at ? new Date(u.plan_expires_at as string) : null,
      trialEndsAt: u.trial_ends_at ? new Date(u.trial_ends_at as string) : null,
      billingCycle: (u.billing_cycle as string) ?? null, createdAt: new Date(u.created_at as string),
    }));
    const ids = users.map((u) => u.id);
    if (ids.length) {
      const [{ data: usage }, { data: subs }] = await Promise.all([
        sb.from("ai_usage").select("user_id,used").in("user_id", ids).eq("period", period),
        sb.from("subscriptions").select("user_id,amount,currency,created_at").in("user_id", ids).eq("status", "paid"),
      ]);
      for (const u of (usage ?? []) as { user_id: string; used: number }[]) usageByUser.set(u.user_id, u.used);
      for (const p of (subs ?? []) as { user_id: string; amount: number; currency: string; created_at: string }[]) {
        const e = payByUser.get(p.user_id) ?? { total: 0, count: 0, lastPaymentAt: new Date(0), currency: "INR" };
        e.total += p.amount ?? 0; e.count++; e.currency = p.currency ?? "INR";
        const at = new Date(p.created_at); if (at > e.lastPaymentAt) e.lastPaymentAt = at;
        payByUser.set(p.user_id, e);
      }
    }
    const [{ data: allPaid }, { data: allUsage }, payingUsersRes] = await Promise.all([
      sb.from("subscriptions").select("amount,currency").eq("status", "paid"),
      sb.from("ai_usage").select("used").eq("period", period),
      sb.from("users").select("id", { count: "exact", head: true }).in("plan", ["go", "plus"]),
    ]);
    const paidArr = (allPaid ?? []) as { amount: number; currency: string }[];
    summary = {
      totalRevenue: paidArr.reduce((s, p) => s + (p.amount ?? 0), 0),
      totalPayments: paidArr.length,
      currency: paidArr[paidArr.length - 1]?.currency ?? "INR",
      payingUsers: payingUsersRes.count ?? 0,
      creditsUsedThisMonth: ((allUsage ?? []) as { used: number }[]).reduce((s, u) => s + (u.used ?? 0), 0),
    };}

  const rows: AdminBillingRow[] = users.map((u) => {
    const used = usageByUser.get(u.id) ?? 0;
    const allowance = monthlyAllowance(u.plan);
    const unlimited = !Number.isFinite(allowance);
    const pay = payByUser.get(u.id);
    const active = u.plan !== "free" && (!u.planExpiresAt || u.planExpiresAt.getTime() > now);
    return {
      id: u.id, name: u.name, username: u.username, email: u.email, image: u.image,
      plan: u.plan, active, billingCycle: u.billingCycle, planExpiresAt: u.planExpiresAt, trialEndsAt: u.trialEndsAt,
      usage: { period, used, allowance: unlimited ? null : allowance, remaining: unlimited ? null : Math.max(0, allowance - used), unlimited },
      revenue: pay?.total ?? 0, payments: pay?.count ?? 0, currency: pay?.currency ?? "INR",
      lastPaymentAt: pay && pay.lastPaymentAt.getTime() > 0 ? pay.lastPaymentAt : null, createdAt: u.createdAt,
    };
  });

  return { rows, period, summary };
}

// ── Key metrics (Growth · Retention · Learning · Business) ──────────────────

export interface AdminMetrics {
  growth: {
    totalUsers: number;
    newUsers: { today: number; week: number; month: number };
    activeUsers: { dau: number; wau: number; mau: number };
  };
  retention: {
    /** % of a cohort that came back the next day (null = not enough data). */
    day1: number | null;
    day7: number | null;
    /** Average session length in minutes — not instrumented yet (null). */
    avgSessionMinutes: number | null;
  };
  learning: {
    problemsSolved: number;
    aiMentorUsage: number;
    resumeReviews: number;
    courseCompletions: number;
  };
  business: {
    trialUsers: number;
    paidUsers: number;
    mrr: number;
    currency: string;
    conversionRate: number;
    /** 30-day approximation (null = no paid users yet). */
    churnRate: number | null;
  };
}

const DAY = 86_400_000;
const dayStr = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Raw rows both backends fetch; the pure computer below turns them into metrics. */
interface MetricsRaw {
  now: number;
  totalUsers: number;
  newToday: number;
  newWeek: number;
  newMonth: number;
  acceptedSubs: number;
  aiChats: number;
  resumeReviews: number;
  courseCompletions: number;
  trialUsers: number;
  paidUsers: number;
  expiredLast30: number;
  activity: { user: string; date: string }[]; // last 31 days
  cohortUsers: { id: string; createdAt: number }[]; // signups in last 31 days
  activePaid: { id: string; billingCycle: string | null; planExpiresAt: number | null }[];
  paidSubs: { user: string; amount: number; currency: string; billingCycle: string | null; createdAt: number }[];
}

function computeMetrics(raw: MetricsRaw): AdminMetrics {
  const todayStr = dayStr(raw.now);
  const wauFrom = dayStr(raw.now - 6 * DAY);
  const mauFrom = dayStr(raw.now - 29 * DAY);

  // Active users + a membership set for retention lookups.
  const active = new Set<string>(); // "user|date"
  const dau = new Set<string>();
  const wau = new Set<string>();
  const mau = new Set<string>();
  for (const a of raw.activity) {
    active.add(`${a.user}|${a.date}`);
    if (a.date >= mauFrom) mau.add(a.user);
    if (a.date >= wauFrom) wau.add(a.user);
    if (a.date === todayStr) dau.add(a.user);
  }

  // Cohort retention: of users who signed up ≥ dayN days ago (within 30d),
  // what share had activity on their signup-day + dayN?
  const retentionAt = (dayN: number): number | null => {
    const oldest = raw.now - 30 * DAY;
    const newest = raw.now - dayN * DAY;
    let cohort = 0;
    let returned = 0;
    for (const u of raw.cohortUsers) {
      if (u.createdAt < oldest || u.createdAt >= newest) continue;
      cohort++;
      const signup = new Date(`${dayStr(u.createdAt)}T00:00:00.000Z`).getTime();
      if (active.has(`${u.id}|${dayStr(signup + dayN * DAY)}`)) returned++;
    }
    return cohort > 0 ? Math.round((returned / cohort) * 100) : null;
  };

  // MRR: latest paid subscription per active paid user, normalized to monthly.
  const latestAt = new Map<string, number>();
  const latest = new Map<string, { amount: number; currency: string; cycle: string | null }>();
  for (const s of raw.paidSubs) {
    if ((latestAt.get(s.user) ?? -1) < s.createdAt) {
      latestAt.set(s.user, s.createdAt);
      latest.set(s.user, { amount: s.amount, currency: s.currency, cycle: s.billingCycle });
    }
  }
  let mrr = 0;
  const curCount = new Map<string, number>();
  for (const u of raw.activePaid) {
    if (u.planExpiresAt !== null && u.planExpiresAt < raw.now) continue; // lapsed
    const sub = latest.get(u.id);
    if (!sub) continue;
    const cycle = (sub.cycle ?? u.billingCycle ?? "monthly").toLowerCase();
    mrr += /year|annual/.test(cycle) ? sub.amount / 12 : sub.amount;
    curCount.set(sub.currency, (curCount.get(sub.currency) ?? 0) + 1);
  }
  const currency = [...curCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "INR";

  const churnBase = raw.paidUsers + raw.expiredLast30;

  return {
    growth: {
      totalUsers: raw.totalUsers,
      newUsers: { today: raw.newToday, week: raw.newWeek, month: raw.newMonth },
      activeUsers: { dau: dau.size, wau: wau.size, mau: mau.size },
    },
    retention: {
      day1: retentionAt(1),
      day7: retentionAt(7),
      avgSessionMinutes: null,
    },
    learning: {
      problemsSolved: raw.acceptedSubs,
      aiMentorUsage: raw.aiChats,
      resumeReviews: raw.resumeReviews,
      courseCompletions: raw.courseCompletions,
    },
    business: {
      trialUsers: raw.trialUsers,
      paidUsers: raw.paidUsers,
      mrr: Math.round(mrr),
      currency,
      conversionRate: raw.totalUsers > 0 ? Math.round((raw.paidUsers / raw.totalUsers) * 1000) / 10 : 0,
      churnRate: churnBase > 0 ? Math.round((raw.expiredLast30 / churnBase) * 1000) / 10 : null,
    },
  };
}

/** Growth / retention / learning / business KPIs for the admin dashboard. */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const startTodayIso = new Date(`${dayStr(now)}T00:00:00.000Z`).toISOString();
  const weekAgoIso = new Date(now - 7 * DAY).toISOString();
  const monthAgoIso = new Date(now - 30 * DAY).toISOString();
  const activityFrom = dayStr(now - 31 * DAY);
    const sb = supabaseAdmin();
    interface Filterable {
      gte(col: string, v: unknown): Filterable;
      gt(col: string, v: unknown): Filterable;
      lt(col: string, v: unknown): Filterable;
      eq(col: string, v: unknown): Filterable;
      in(col: string, v: unknown[]): Filterable;
    }
    const countOf = async (table: string, apply?: (q: Filterable) => Filterable): Promise<number> => {
      const base = sb.from(table).select("id", { count: "exact", head: true });
      const q = apply ? (apply(base as unknown as Filterable) as unknown as typeof base) : base;
      const { count } = await q;
      return count ?? 0;
    };
    // Paginated fetch (Supabase caps a single response at ~1000 rows).
    const fetchAll = async <T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown[] | null }> }): Promise<T[]> => {
      const out: T[] = [];
      const size = 1000;
      for (let from = 0; from < 40_000; from += size) {
        const { data } = await build().range(from, from + size - 1);
        const rows = (data ?? []) as T[];
        out.push(...rows);
        if (rows.length < size) break;
      }
      return out;
    };

    const [
      totalUsers, newToday, newWeek, newMonth, acceptedSubs, aiChats, resumeReviews,
      courseCompletions, trialUsers, paidUsers, expiredLast30,
    ] = await Promise.all([
      countOf("users"),
      countOf("users", (q) => q.gte("created_at", startTodayIso)),
      countOf("users", (q) => q.gte("created_at", weekAgoIso)),
      countOf("users", (q) => q.gte("created_at", monthAgoIso)),
      countOf("submissions", (q) => q.eq("status", "Accepted")),
      countOf("ai_chats"),
      countOf("ai_tool_runs", (q) => q.eq("tool", "resume")),
      countOf("progress", (q) => q.gte("percent", 100)),
      countOf("users", (q) => q.gt("trial_ends_at", nowIso)),
      countOf("users", (q) => q.in("plan", ["go", "plus"])),
      countOf("users", (q) => q.gte("plan_expires_at", monthAgoIso).lt("plan_expires_at", nowIso)),
    ]);

    const [activityRows, cohortRows, activePaidRows, paidSubRows] = await Promise.all([
      fetchAll<{ user_id: string; date: string }>(() =>
        sb.from("daily_activity").select("user_id,date").gte("date", activityFrom) as never),
      fetchAll<{ id: string; created_at: string }>(() =>
        sb.from("users").select("id,created_at").gte("created_at", new Date(now - 31 * DAY).toISOString()) as never),
      fetchAll<{ id: string; billing_cycle: string | null; plan_expires_at: string | null }>(() =>
        sb.from("users").select("id,billing_cycle,plan_expires_at").in("plan", ["go", "plus"]) as never),
      fetchAll<{ user_id: string; amount: number; currency: string; billing_cycle: string | null; created_at: string }>(() =>
        sb.from("subscriptions").select("user_id,amount,currency,billing_cycle,created_at").eq("status", "paid") as never),
    ]);

    return computeMetrics({
      now, totalUsers, newToday, newWeek, newMonth, acceptedSubs, aiChats, resumeReviews,
      courseCompletions, trialUsers, paidUsers, expiredLast30,
      activity: activityRows.map((r) => ({ user: r.user_id, date: r.date })),
      cohortUsers: cohortRows.map((r) => ({ id: r.id, createdAt: new Date(r.created_at).getTime() })),
      activePaid: activePaidRows.map((r) => ({ id: r.id, billingCycle: r.billing_cycle, planExpiresAt: r.plan_expires_at ? new Date(r.plan_expires_at).getTime() : null })),
      paidSubs: paidSubRows.map((r) => ({ user: r.user_id, amount: r.amount ?? 0, currency: r.currency ?? "INR", billingCycle: r.billing_cycle, createdAt: new Date(r.created_at).getTime() })),
    });
}
