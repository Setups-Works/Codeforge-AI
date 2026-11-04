import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildFunnel, percentOf, summariseRevenue, type FunnelStep, type OrderFact, type RevenueSummary } from "@/lib/lms/analytics";

/** Admin-only LMS reporting. Aggregation is done in code over bounded reads; the maths lives in lib/lms/analytics. */

const sb = () => supabaseAdmin();
const DAY = 86_400_000;
const ROW_CAP = 20_000;

export interface Overview {
  days: number;
  allTime: RevenueSummary;
  window: RevenueSummary;
  enrolments: { total: number; inWindow: number };
  completions: { total: number; inWindow: number };
  activeLearners7d: number;
  certificates: number;
  publishedCourses: number;
}

interface OrderRow {
  course_id: string | null;
  amount_inr: number;
  status: OrderFact["status"];
  paid_at: string | null;
  refunded_at: string | null;
}

const toFact = (r: OrderRow): OrderFact => ({
  amountInr: r.amount_inr,
  status: r.status,
  paidAt: r.paid_at ? new Date(r.paid_at) : null,
  refundedAt: r.refunded_at ? new Date(r.refunded_at) : null,
});

type CountQuery = ReturnType<ReturnType<ReturnType<typeof sb>["from"]>["select"]>;

async function count(table: string, filter?: (q: CountQuery) => CountQuery): Promise<number> {
  let q: CountQuery = sb().from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

export async function getOverview(days = 30): Promise<Overview> {
  const since = new Date(Date.now() - days * DAY);
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const sinceIso = since.toISOString();
  const client = sb();

  const [orders, enrolTotal, enrolWindow, doneTotal, doneWindow, certs, published, active] = await Promise.all([
    client.from("course_orders").select("course_id,amount_inr,status,paid_at,refunded_at").in("status", ["paid", "refunded"]).limit(ROW_CAP),
    count("course_enrollments"),
    count("course_enrollments", (q) => q.gte("enrolled_at", sinceIso)),
    count("course_enrollments", (q) => q.not("completed_at", "is", null)),
    count("course_enrollments", (q) => q.gte("completed_at", sinceIso)),
    count("course_certificates"),
    count("courses", (q) => q.eq("status", "published")),
    client.from("lesson_progress").select("user_id").gte("updated_at", weekAgo).limit(ROW_CAP),
  ]);
  if (orders.error) throw new Error(orders.error.message);
  if (active.error) throw new Error(active.error.message);

  const facts = ((orders.data ?? []) as OrderRow[]).map(toFact);
  return {
    days,
    allTime: summariseRevenue(facts, null),
    window: summariseRevenue(facts, since),
    enrolments: { total: enrolTotal, inWindow: enrolWindow },
    completions: { total: doneTotal, inWindow: doneWindow },
    activeLearners7d: new Set(((active.data ?? []) as { user_id: string }[]).map((r) => r.user_id)).size,
    certificates: certs,
    publishedCourses: published,
  };
}

export interface CourseStat {
  id: string;
  title: string;
  status: string;
  students: number;
  completed: number;
  completionRate: number;
  /** Net revenue from direct purchases of this course (bundle sales aren't attributed to one course). */
  netRevenueInr: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export async function getCourseStats(): Promise<CourseStat[]> {
  const client = sb();
  const [courses, enrolments, orders] = await Promise.all([
    client.from("courses").select("id,title,status,stats").order("created_at", { ascending: false }),
    client.from("course_enrollments").select("course_id,completed_at").limit(ROW_CAP),
    client.from("course_orders").select("course_id,amount_inr,status,paid_at,refunded_at").in("status", ["paid", "refunded"]).not("course_id", "is", null).limit(ROW_CAP),
  ]);
  for (const r of [courses, enrolments, orders]) if (r.error) throw new Error(r.error.message);

  const students = new Map<string, number>();
  const completed = new Map<string, number>();
  for (const e of (enrolments.data ?? []) as { course_id: string; completed_at: string | null }[]) {
    students.set(e.course_id, (students.get(e.course_id) ?? 0) + 1);
    if (e.completed_at) completed.set(e.course_id, (completed.get(e.course_id) ?? 0) + 1);
  }
  const net = new Map<string, number>();
  for (const o of (orders.data ?? []) as OrderRow[]) {
    const summary = summariseRevenue([toFact(o)], null);
    net.set(o.course_id!, (net.get(o.course_id!) ?? 0) + summary.net);
  }

  return ((courses.data ?? []) as { id: string; title: string; status: string; stats: Record<string, number> | null }[]).map((c) => {
    const s = students.get(c.id) ?? 0;
    const done = completed.get(c.id) ?? 0;
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      students: s,
      completed: done,
      completionRate: percentOf(done, s),
      netRevenueInr: net.get(c.id) ?? 0,
      ratingAvg: c.stats?.rating_avg ?? null,
      ratingCount: c.stats?.rating_count ?? 0,
    };
  });
}

/** Lesson-by-lesson completion for one course, in watch order. */
export async function getCourseFunnel(courseId: string): Promise<{ enrolled: number; steps: FunnelStep[] } | null> {
  const client = sb();
  const { data: course } = await client.from("courses").select("id").eq("id", courseId).maybeSingle();
  if (!course) return null;
  const [sections, lessons, progress, enrolled] = await Promise.all([
    client.from("course_sections").select("id,position").eq("course_id", courseId),
    client.from("course_lessons").select("id,title,section_id,position").eq("course_id", courseId),
    client.from("lesson_progress").select("lesson_id").eq("course_id", courseId).eq("status", "completed").limit(ROW_CAP),
    count("course_enrollments", (q) => q.eq("course_id", courseId)),
  ]);
  for (const r of [sections, lessons, progress]) if (r.error) throw new Error(r.error.message);

  const sectionPos = new Map(((sections.data ?? []) as { id: string; position: number }[]).map((s) => [s.id, s.position]));
  const ordered = ((lessons.data ?? []) as { id: string; title: string; section_id: string; position: number }[])
    .sort((a, b) => (sectionPos.get(a.section_id) ?? 0) - (sectionPos.get(b.section_id) ?? 0) || a.position - b.position)
    .map((l) => ({ id: l.id, title: l.title }));
  const done = new Map<string, number>();
  for (const p of (progress.data ?? []) as { lesson_id: string }[]) done.set(p.lesson_id, (done.get(p.lesson_id) ?? 0) + 1);
  return { enrolled, steps: buildFunnel(ordered, done, enrolled) };
}
