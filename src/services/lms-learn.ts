import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LessonKind } from "@/lib/lms/constants";
import type { VideoRef } from "@/lib/lms/video";
import { issueCertificate } from "@/services/lms-certificates";
import { canAccessLesson, computeGatedIds, type AccessDecision } from "@/lib/lms/access";
import { XP_COURSE_COMPLETE, XP_LESSON_COMPLETE } from "@/lib/lms/constants";
import { awardLearningXp } from "@/services/gamification";
import type { CourseCard } from "@/services/lms-catalog";

/**
 * Enrolled-learner reads and writes: entitlement rows, lesson progress, "my
 * courses" and "continue watching". This module is the only learner-side code
 * that reads the `video` column, and callers must run `canAccessLesson` before
 * handing a ref to a viewer.
 */

const sb = () => supabaseAdmin();

export interface Enrollment {
  id: string;
  courseId: string;
  source: string;
  enrolledAt: Date;
  expiresAt: Date | null;
  lastLessonId: string | null;
  lastAccessedAt: Date | null;
  completedAt: Date | null;
}

interface EnrollmentRow {
  id: string;
  course_id: string;
  source: string;
  enrolled_at: string;
  expires_at: string | null;
  last_lesson_id: string | null;
  last_accessed_at: string | null;
  completed_at: string | null;
}

const ENROLLMENT_COLS = "id,course_id,source,enrolled_at,expires_at,last_lesson_id,last_accessed_at,completed_at";

const d = (v: string | null) => (v ? new Date(v) : null);

const enrollmentFromRow = (r: EnrollmentRow): Enrollment => ({
  id: r.id,
  courseId: r.course_id,
  source: r.source,
  enrolledAt: new Date(r.enrolled_at),
  expiresAt: d(r.expires_at),
  lastLessonId: r.last_lesson_id,
  lastAccessedAt: d(r.last_accessed_at),
  completedAt: d(r.completed_at),
});

export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const { data, error } = await sb()
    .from("course_enrollments")
    .select(ENROLLMENT_COLS)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? enrollmentFromRow(data as EnrollmentRow) : null;
}

/** A lesson with everything the player needs. Only call after an access check. */
export interface LessonContent {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  kind: LessonKind;
  video: VideoRef | null;
  bodyMd: string | null;
  isFreePreview: boolean;
  dripDays: number | null;
  problemSlug: string | null;
  gateNext: boolean;
  passPercent: number;
}

export async function getLessonContent(courseId: string, lessonId: string): Promise<LessonContent | null> {
  const { data, error } = await sb()
    .from("course_lessons")
    .select("id,course_id,section_id,title,kind,video,body_md,is_free_preview,drip_days,problem_slug,gate_next,pass_percent")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as {
    id: string;
    course_id: string;
    section_id: string;
    title: string;
    kind: LessonKind;
    video: VideoRef | null;
    body_md: string | null;
    is_free_preview: boolean;
    drip_days: number | null;
    problem_slug: string | null;
    gate_next: boolean;
    pass_percent: number;
  };
  return {
    id: r.id,
    courseId: r.course_id,
    sectionId: r.section_id,
    title: r.title,
    kind: r.kind,
    video: r.video,
    bodyMd: r.body_md,
    isFreePreview: r.is_free_preview,
    dripDays: r.drip_days,
    problemSlug: r.problem_slug,
    gateNext: r.gate_next,
    passPercent: r.pass_percent,
  };
}

/** Lesson → course lookup for the progress API (which only receives a lesson id). */
export async function getLessonCourse(lessonId: string): Promise<{ courseId: string } | null> {
  const { data, error } = await sb().from("course_lessons").select("course_id").eq("id", lessonId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { courseId: (data as { course_id: string }).course_id } : null;
}

export interface CourseProgress {
  completedLessonIds: string[];
  completed: number;
  total: number;
  percent: number;
}

export async function getCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
  const client = sb();
  const [done, all] = await Promise.all([
    client.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("course_id", courseId).eq("status", "completed"),
    client.from("course_lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
  ]);
  if (done.error) throw new Error(done.error.message);
  if (all.error) throw new Error(all.error.message);
  const completedLessonIds = ((done.data ?? []) as { lesson_id: string }[]).map((r) => r.lesson_id);
  const total = all.count ?? 0;
  return summarize(completedLessonIds, total);
}

export function summarize(completedLessonIds: string[], total: number): CourseProgress {
  const completed = Math.min(completedLessonIds.length, total);
  return {
    completedLessonIds,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/** Remember where the learner is. Never downgrades a completed lesson. */
export async function recordLessonOpened(userId: string, courseId: string, lessonId: string): Promise<void> {
  const client = sb();
  const { data: existing } = await client
    .from("lesson_progress")
    .select("status")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!existing) {
    await client.from("lesson_progress").insert({ user_id: userId, lesson_id: lessonId, course_id: courseId, status: "started" });
  }
  await client
    .from("course_enrollments")
    .update({ last_lesson_id: lessonId, last_accessed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("course_id", courseId);
}

/** Mark a lesson completed (or revert it to started) and roll up course completion. */
export async function setLessonStatus(
  userId: string,
  courseId: string,
  lessonId: string,
  status: "started" | "completed",
): Promise<CourseProgress & { courseCompleted: boolean; xpEarned: number }> {
  const client = sb();
  const now = new Date().toISOString();
  const { error } = await client.from("lesson_progress").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      course_id: courseId,
      status,
      completed_at: status === "completed" ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) throw new Error(error.message);

  // XP is claimed atomically (the row flips xp_awarded false -> true once), so
  // undo + redo, or two concurrent completions, can only ever pay out once.
  let xp = 0;
  if (status === "completed") {
    const { data: claimed } = await client
      .from("lesson_progress")
      .update({ xp_awarded: true })
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .eq("xp_awarded", false)
      .select("lesson_id");
    if (claimed?.length) xp += XP_LESSON_COMPLETE;
  }

  const progress = await getCourseProgress(userId, courseId);
  const courseCompleted = progress.total > 0 && progress.completed >= progress.total;
  await client
    .from("course_enrollments")
    .update({ completed_at: courseCompleted ? now : null, last_lesson_id: lessonId, last_accessed_at: now })
    .eq("user_id", userId)
    .eq("course_id", courseId);
  if (courseCompleted) {
    // Certificates are earned, not revoked: undoing a lesson later keeps this one.
    const issued = await issueCertificate(userId, courseId).catch((e) => {
      console.error("[certificate]", e);
      return null;
    });
    if (issued?.created) xp += XP_COURSE_COMPLETE;
  }

  if (xp > 0) await awardLearningXp(userId, xp).catch((e) => console.error("[learning-xp]", e));
  return { ...progress, courseCompleted, xpEarned: xp };
}

/**
 * An accepted submission completes every "problem" lesson that points at that
 * problem, in each published course the user is actively enrolled in.
 */
export async function completeProblemLessons(userId: string, problemSlug: string): Promise<number> {
  const client = sb();
  const { data, error } = await client.from("course_lessons").select("id,course_id").eq("kind", "problem").eq("problem_slug", problemSlug);
  if (error) throw new Error(error.message);
  const lessons = (data ?? []) as { id: string; course_id: string }[];
  if (!lessons.length) return 0;

  const courseIds = [...new Set(lessons.map((l) => l.course_id))];
  const { data: published } = await client.from("courses").select("id").in("id", courseIds).eq("status", "published");
  const open = new Set(((published ?? []) as { id: string }[]).map((c) => c.id));

  let completed = 0;
  for (const lesson of lessons) {
    if (!open.has(lesson.course_id)) continue;
    const enrollment = await getEnrollment(userId, lesson.course_id);
    if (!enrollment || (enrollment.expiresAt && enrollment.expiresAt <= new Date())) continue;
    await setLessonStatus(userId, lesson.course_id, lesson.id, "completed");
    completed++;
  }
  return completed;
}

export async function isLessonCompleted(userId: string, lessonId: string): Promise<boolean> {
  const { data } = await sb().from("lesson_progress").select("status").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
  return (data as { status: string } | null)?.status === "completed";
}

/** Ids of lessons currently locked behind an unfinished "must complete" lesson, for one learner. */
export async function getGatedLessonIds(userId: string, courseId: string): Promise<Set<string>> {
  const client = sb();
  const [sections, lessons, done] = await Promise.all([
    client.from("course_sections").select("id,position").eq("course_id", courseId),
    client.from("course_lessons").select("id,section_id,position,gate_next").eq("course_id", courseId),
    client.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("course_id", courseId).eq("status", "completed"),
  ]);
  if (sections.error) throw new Error(sections.error.message);
  if (lessons.error) throw new Error(lessons.error.message);
  if (done.error) throw new Error(done.error.message);

  const sectionPos = new Map(((sections.data ?? []) as { id: string; position: number }[]).map((x) => [x.id, x.position]));
  const ordered = ((lessons.data ?? []) as { id: string; section_id: string; position: number; gate_next: boolean }[])
    .sort((a, b) => (sectionPos.get(a.section_id) ?? 0) - (sectionPos.get(b.section_id) ?? 0) || a.position - b.position)
    .map((l) => ({ id: l.id, gateNext: l.gate_next }));
  return computeGatedIds(ordered, new Set(((done.data ?? []) as { lesson_id: string }[]).map((r) => r.lesson_id)));
}

export interface ResolvedLesson {
  decision: AccessDecision;
  lesson: LessonContent | null;
  enrollment: Enrollment | null;
  courseStatus: "draft" | "published" | "archived" | null;
}

/**
 * Load a lesson plus the viewer's enrolment and run the access rules. This is
 * the one place a lesson's video ref should be gated: callers only use
 * `lesson.video` when `decision.allowed`.
 */
export async function resolveLessonAccess(
  user: { id: string; role?: string | null } | null,
  courseId: string,
  lessonId: string,
): Promise<ResolvedLesson> {
  const client = sb();
  const [lesson, course, enrollment] = await Promise.all([
    getLessonContent(courseId, lessonId),
    client.from("courses").select("status").eq("id", courseId).maybeSingle(),
    user ? getEnrollment(user.id, courseId) : Promise.resolve(null),
  ]);
  const courseStatus = (course.data as { status: "draft" | "published" | "archived" } | null)?.status ?? null;
  if (!lesson || !courseStatus) {
    return { decision: { allowed: false, reason: "unpublished" }, lesson: null, enrollment, courseStatus };
  }
  // Gating only applies to learners with progress to speak of: not admins or preview visitors.
  const gated = user && enrollment && user.role !== "admin" ? (await getGatedLessonIds(user.id, courseId)).has(lessonId) : false;
  const decision = canAccessLesson({
    course: { status: courseStatus },
    lesson: { isFreePreview: lesson.isFreePreview, dripDays: lesson.dripDays },
    user,
    enrollment: enrollment ? { enrolledAt: enrollment.enrolledAt, expiresAt: enrollment.expiresAt } : null,
    gated,
  });
  return { decision, lesson, enrollment, courseStatus };
}

/**
 * Gate for lesson-scoped community features (notes, Q&A): the viewer must be
 * able to watch the lesson and be a real learner or an admin, so free-preview
 * visitors can't post.
 */
export async function authorizeLessonParticipation(
  user: { id: string; role?: string | null },
  lessonId: string,
): Promise<{ ok: true; courseId: string } | { ok: false; status: number; error: string }> {
  const found = await getLessonCourse(lessonId);
  if (!found) return { ok: false, status: 404, error: "Lesson not found" };
  const { decision, enrollment } = await resolveLessonAccess(user, found.courseId, lessonId);
  if (!decision.allowed || (!enrollment && user.role !== "admin")) {
    return { ok: false, status: 403, error: "Enrol in this course to use this" };
  }
  return { ok: true, courseId: found.courseId };
}

// ── My courses / continue watching ──────────────────────────────────────

export interface MyCourse {
  course: CourseCard;
  enrollment: Enrollment;
  progress: { completed: number; total: number; percent: number };
  /** Where "Continue" should land: the last opened lesson, else the first. */
  resumeLessonId: string | null;
  resumeLessonTitle: string | null;
}

interface CourseJoinRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  level: string | null;
  category: string | null;
  language: string;
  price_inr: number;
  compare_at_inr: number | null;
  is_free: boolean;
  instructor_name: string | null;
  stats: Record<string, number> | null;
}

const COURSE_COLS =
  "id,slug,title,subtitle,thumbnail_url,level,category,language,price_inr,compare_at_inr,is_free,instructor_name,stats";

/** Courses the user can currently open (active enrolment, course published). */
export async function listMyCourses(userId: string): Promise<MyCourse[]> {
  const client = sb();
  const { data: enr, error } = await client
    .from("course_enrollments")
    .select(ENROLLMENT_COLS)
    .eq("user_id", userId)
    .order("last_accessed_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);

  const now = new Date();
  const enrollments = ((enr ?? []) as EnrollmentRow[]).map(enrollmentFromRow).filter((e) => !e.expiresAt || e.expiresAt > now);
  if (!enrollments.length) return [];

  const courseIds = enrollments.map((e) => e.courseId);
  const [courses, progress, lessons] = await Promise.all([
    client.from("courses").select(COURSE_COLS).in("id", courseIds).eq("status", "published"),
    client.from("lesson_progress").select("course_id").eq("user_id", userId).eq("status", "completed").in("course_id", courseIds),
    client.from("course_lessons").select("id,course_id,title,position,section_id").in("course_id", courseIds),
  ]);
  if (courses.error) throw new Error(courses.error.message);
  if (progress.error) throw new Error(progress.error.message);
  if (lessons.error) throw new Error(lessons.error.message);

  const doneByCourse = new Map<string, number>();
  for (const r of (progress.data ?? []) as { course_id: string }[]) {
    doneByCourse.set(r.course_id, (doneByCourse.get(r.course_id) ?? 0) + 1);
  }
  const lessonRows = (lessons.data ?? []) as { id: string; course_id: string; title: string }[];
  const totalByCourse = new Map<string, number>();
  for (const l of lessonRows) totalByCourse.set(l.course_id, (totalByCourse.get(l.course_id) ?? 0) + 1);
  const lessonById = new Map(lessonRows.map((l) => [l.id, l]));

  const byId = new Map(((courses.data ?? []) as unknown as CourseJoinRow[]).map((c) => [c.id, c]));

  // First lesson per course in curriculum order (section position, then lesson position).
  const firstByCourse = await firstLessons(courseIds);

  const result: MyCourse[] = [];
  for (const enrollment of enrollments) {
    const row = byId.get(enrollment.courseId);
    if (!row) continue;
    const total = totalByCourse.get(row.id) ?? 0;
    const completed = Math.min(doneByCourse.get(row.id) ?? 0, total);
    const resumeId =
      (enrollment.lastLessonId && lessonById.has(enrollment.lastLessonId) ? enrollment.lastLessonId : null) ??
      firstByCourse.get(row.id) ??
      null;
    result.push({
      course: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        thumbnailUrl: row.thumbnail_url,
        level: row.level,
        category: row.category,
        language: row.language,
        priceInr: row.is_free ? 0 : row.price_inr,
        compareAtInr: row.is_free ? null : row.compare_at_inr,
        isFree: row.is_free,
        instructorName: row.instructor_name,
        lessonCount: total,
        durationS: row.stats?.duration_s ?? 0,
        students: row.stats?.students ?? 0,
        ratingAvg: row.stats?.rating_avg ?? null,
        ratingCount: row.stats?.rating_count ?? 0,
      },
      enrollment,
      progress: { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) },
      resumeLessonId: resumeId,
      resumeLessonTitle: resumeId ? (lessonById.get(resumeId)?.title ?? null) : null,
    });
  }
  return result;
}

/** In-progress courses, most recently watched first. */
export async function listContinueWatching(userId: string, limit = 4): Promise<MyCourse[]> {
  const mine = await listMyCourses(userId);
  return mine.filter((m) => !m.enrollment.completedAt && m.resumeLessonId).slice(0, limit);
}

/** First lesson (curriculum order) for each course id. */
export async function firstLessons(courseIds: string[]): Promise<Map<string, string>> {
  const client = sb();
  const [sections, lessons] = await Promise.all([
    client.from("course_sections").select("id,position").in("course_id", courseIds),
    client.from("course_lessons").select("id,course_id,section_id,position").in("course_id", courseIds),
  ]);
  if (sections.error) throw new Error(sections.error.message);
  if (lessons.error) throw new Error(lessons.error.message);

  const sectionPos = new Map(((sections.data ?? []) as { id: string; position: number }[]).map((s) => [s.id, s.position]));
  const best = new Map<string, { id: string; key: [number, number] }>();
  for (const l of (lessons.data ?? []) as { id: string; course_id: string; section_id: string; position: number }[]) {
    const key: [number, number] = [sectionPos.get(l.section_id) ?? 0, l.position];
    const cur = best.get(l.course_id);
    if (!cur || key[0] < cur.key[0] || (key[0] === cur.key[0] && key[1] < cur.key[1])) best.set(l.course_id, { id: l.id, key });
  }
  return new Map([...best].map(([courseId, v]) => [courseId, v.id]));
}

// ── Admin: manual access ────────────────────────────────────────────────

export interface AdminEnrollment extends Enrollment {
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

export async function adminListEnrollments(courseId: string): Promise<AdminEnrollment[]> {
  const { data, error } = await sb()
    .from("course_enrollments")
    .select(`user_id,${ENROLLMENT_COLS}`)
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as (EnrollmentRow & { user_id: string })[];
  const ids = rows.map((r) => r.user_id);
  const { data: users } = ids.length ? await sb().from("users").select("id,name,email").in("id", ids) : { data: [] };
  const byId = new Map(((users ?? []) as { id: string; name: string | null; email: string | null }[]).map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...enrollmentFromRow(r),
    userId: r.user_id,
    userName: byId.get(r.user_id)?.name ?? null,
    userEmail: byId.get(r.user_id)?.email ?? null,
  }));
}

/** Whether a user id exists (so a grant can't point at a typo). */
export async function userExists(userId: string): Promise<boolean> {
  const { data } = await sb().from("users").select("id").eq("id", userId).maybeSingle();
  return Boolean(data);
}

/** Grant (or refresh) access. Idempotent; keeps the original enrolment date. */
export async function grantEnrollment(courseId: string, userId: string, grantedBy: string): Promise<"created" | "exists"> {
  const client = sb();
  const existing = await getEnrollment(userId, courseId);
  if (existing) {
    if (existing.expiresAt) await client.from("course_enrollments").update({ expires_at: null }).eq("id", existing.id);
    return "exists";
  }
  const { error } = await client
    .from("course_enrollments")
    .insert({ user_id: userId, course_id: courseId, source: "grant", granted_by: grantedBy });
  if (error) throw new Error(error.message);
  await refreshStudentCount(courseId);
  return "created";
}

export async function revokeEnrollment(courseId: string, userId: string): Promise<boolean> {
  const { data, error } = await sb().from("course_enrollments").delete().eq("course_id", courseId).eq("user_id", userId).select("id");
  if (error) throw new Error(error.message);
  if (data?.length) await refreshStudentCount(courseId);
  return Boolean(data?.length);
}

export async function refreshStudentCount(courseId: string): Promise<void> {
  const client = sb();
  const [{ count }, { data: course }] = await Promise.all([
    client.from("course_enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    client.from("courses").select("stats").eq("id", courseId).maybeSingle(),
  ]);
  const stats = { ...((course as { stats: Record<string, number> } | null)?.stats ?? {}), students: count ?? 0 };
  await client.from("courses").update({ stats }).eq("id", courseId);
}
