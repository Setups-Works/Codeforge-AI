import { supabaseAdmin } from "@/lib/supabase/admin";
import { publicName } from "@/lib/lms/format";
import type { CourseCard } from "@/services/lms-catalog";
import { getEnrollment } from "@/services/lms-learn";

/** Reviews, wishlist, lesson notes and lesson Q&A. */

const sb = () => supabaseAdmin();

type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

const nameMap = async (ids: string[]): Promise<Map<string, string | null>> => {
  if (!ids.length) return new Map();
  const { data } = await sb().from("users").select("id,name").in("id", [...new Set(ids)]);
  return new Map(((data ?? []) as { id: string; name: string | null }[]).map((u) => [u.id, u.name]));
};

// ── Reviews ─────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string | null;
  status: "visible" | "hidden";
  createdAt: Date;
}

interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  status: "visible" | "hidden";
  created_at: string;
}

const REVIEW_COLS = "id,user_id,rating,body,status,created_at";

const reviewFromRow = (r: ReviewRow, names: Map<string, string | null>): Review => ({
  id: r.id,
  userId: r.user_id,
  authorName: publicName(names.get(r.user_id)),
  rating: r.rating,
  body: r.body,
  status: r.status,
  createdAt: new Date(r.created_at),
});

/** Visible reviews for a course page, newest first. */
export async function listVisibleReviews(courseId: string, limit = 20): Promise<Review[]> {
  const { data, error } = await sb()
    .from("course_reviews")
    .select(REVIEW_COLS)
    .eq("course_id", courseId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ReviewRow[];
  const names = await nameMap(rows.map((r) => r.user_id));
  return rows.map((r) => reviewFromRow(r, names));
}

export async function getMyReview(userId: string, courseId: string): Promise<Review | null> {
  const { data, error } = await sb().from("course_reviews").select(REVIEW_COLS).eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return reviewFromRow(data as ReviewRow, await nameMap([userId]));
}

/** Recompute the rating shown on cards and in schema from visible reviews. */
export async function refreshRatingStats(courseId: string): Promise<void> {
  const client = sb();
  const [{ data: ratings }, { data: course }] = await Promise.all([
    client.from("course_reviews").select("rating").eq("course_id", courseId).eq("status", "visible"),
    client.from("courses").select("stats").eq("id", courseId).maybeSingle(),
  ]);
  const values = ((ratings ?? []) as { rating: number }[]).map((r) => r.rating);
  const stats = { ...((course as { stats: Record<string, number> } | null)?.stats ?? {}) };
  if (values.length) {
    stats.rating_count = values.length;
    stats.rating_avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  } else {
    delete stats.rating_count;
    delete stats.rating_avg;
  }
  await client.from("courses").update({ stats }).eq("id", courseId);
}

/** Only people who own the course can review it, one review each (editing replaces it). */
export async function saveReview(userId: string, courseId: string, input: { rating: number; body?: string | null }): Promise<{ ok: true } | Fail> {
  const enrollment = await getEnrollment(userId, courseId);
  if (!enrollment || (enrollment.expiresAt && enrollment.expiresAt <= new Date())) return fail(403, "Enrol in this course to review it");

  const { error } = await sb()
    .from("course_reviews")
    .upsert(
      { user_id: userId, course_id: courseId, rating: input.rating, body: input.body || null, updated_at: new Date().toISOString() },
      { onConflict: "user_id,course_id" },
    );
  if (error) throw new Error(error.message);
  await refreshRatingStats(courseId);
  return { ok: true };
}

export async function deleteMyReview(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await sb().from("course_reviews").delete().eq("user_id", userId).eq("course_id", courseId).select("id");
  if (error) throw new Error(error.message);
  if (data?.length) await refreshRatingStats(courseId);
  return Boolean(data?.length);
}

export async function adminListReviews(courseId: string): Promise<Review[]> {
  const { data, error } = await sb().from("course_reviews").select(REVIEW_COLS).eq("course_id", courseId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ReviewRow[];
  const names = await nameMap(rows.map((r) => r.user_id));
  return rows.map((r) => reviewFromRow(r, names));
}

export async function setReviewStatus(reviewId: string, status: "visible" | "hidden"): Promise<boolean> {
  const { data, error } = await sb().from("course_reviews").update({ status, updated_at: new Date().toISOString() }).eq("id", reviewId).select("course_id");
  if (error) throw new Error(error.message);
  const row = (data as { course_id: string }[] | null)?.[0];
  if (!row) return false;
  await refreshRatingStats(row.course_id);
  return true;
}

// ── Wishlist ────────────────────────────────────────────────────────────

export async function isWishlisted(userId: string, courseId: string): Promise<boolean> {
  const { data } = await sb().from("course_wishlist").select("course_id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  return Boolean(data);
}

export async function setWishlisted(userId: string, courseId: string, on: boolean): Promise<{ ok: true } | Fail> {
  const client = sb();
  if (!on) {
    await client.from("course_wishlist").delete().eq("user_id", userId).eq("course_id", courseId);
    return { ok: true };
  }
  const { data: course } = await client.from("courses").select("id").eq("id", courseId).eq("status", "published").maybeSingle();
  if (!course) return fail(404, "Course not found");
  const { error } = await client.from("course_wishlist").upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Saved courses that are still published, most recently saved first. */
export async function listWishlist(userId: string): Promise<CourseCard[]> {
  const client = sb();
  const { data, error } = await client.from("course_wishlist").select("course_id,created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as { course_id: string }[]).map((r) => r.course_id);
  if (!ids.length) return [];
  const { data: courses, error: cErr } = await client
    .from("courses")
    .select("id,slug,title,subtitle,thumbnail_url,level,category,language,price_inr,compare_at_inr,is_free,instructor_name,stats")
    .in("id", ids)
    .eq("status", "published");
  if (cErr) throw new Error(cErr.message);
  const byId = new Map(
    ((courses ?? []) as {
      id: string; slug: string; title: string; subtitle: string | null; thumbnail_url: string | null; level: string | null; category: string | null;
      language: string; price_inr: number; compare_at_inr: number | null; is_free: boolean; instructor_name: string | null; stats: Record<string, number> | null;
    }[]).map((r) => [r.id, r]),
  );
  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    return [{
      id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle, thumbnailUrl: r.thumbnail_url, level: r.level, category: r.category,
      language: r.language, priceInr: r.is_free ? 0 : r.price_inr, compareAtInr: r.is_free ? null : r.compare_at_inr, isFree: r.is_free,
      instructorName: r.instructor_name, lessonCount: r.stats?.lesson_count ?? 0, durationS: r.stats?.duration_s ?? 0, students: r.stats?.students ?? 0,
      ratingAvg: r.stats?.rating_avg ?? null, ratingCount: r.stats?.rating_count ?? 0,
    }];
  });
}

// ── Lesson notes ────────────────────────────────────────────────────────

export interface LessonNote {
  id: string;
  lessonId: string;
  atSeconds: number | null;
  body: string;
  createdAt: Date;
}

export async function listLessonNotes(userId: string, lessonId: string): Promise<LessonNote[]> {
  const { data, error } = await sb()
    .from("lesson_notes")
    .select("id,lesson_id,at_seconds,body,created_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("at_seconds", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; lesson_id: string; at_seconds: number | null; body: string; created_at: string }[]).map((r) => ({
    id: r.id, lessonId: r.lesson_id, atSeconds: r.at_seconds, body: r.body, createdAt: new Date(r.created_at),
  }));
}

export async function addLessonNote(userId: string, courseId: string, lessonId: string, input: { atSeconds?: number | null; body: string }): Promise<LessonNote> {
  const { data, error } = await sb()
    .from("lesson_notes")
    .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId, at_seconds: input.atSeconds ?? null, body: input.body })
    .select("id,lesson_id,at_seconds,body,created_at")
    .single();
  if (error) throw new Error(error.message);
  const r = data as { id: string; lesson_id: string; at_seconds: number | null; body: string; created_at: string };
  return { id: r.id, lessonId: r.lesson_id, atSeconds: r.at_seconds, body: r.body, createdAt: new Date(r.created_at) };
}

export async function deleteLessonNote(userId: string, noteId: string): Promise<boolean> {
  const { data, error } = await sb().from("lesson_notes").delete().eq("id", noteId).eq("user_id", userId).select("id");
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export interface CourseNotes {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  notes: (LessonNote & { lessonTitle: string })[];
}

/** All of a user's notes grouped by course, for /learn/notes. */
export async function listAllNotes(userId: string): Promise<CourseNotes[]> {
  const client = sb();
  const { data, error } = await client
    .from("lesson_notes")
    .select("id,course_id,lesson_id,at_seconds,body,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; course_id: string; lesson_id: string; at_seconds: number | null; body: string; created_at: string }[];
  if (!rows.length) return [];

  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const lessonIds = [...new Set(rows.map((r) => r.lesson_id))];
  const [courses, lessons] = await Promise.all([
    client.from("courses").select("id,title,slug").in("id", courseIds),
    client.from("course_lessons").select("id,title").in("id", lessonIds),
  ]);
  const courseById = new Map(((courses.data ?? []) as { id: string; title: string; slug: string }[]).map((c) => [c.id, c]));
  const lessonTitle = new Map(((lessons.data ?? []) as { id: string; title: string }[]).map((l) => [l.id, l.title]));

  const groups = new Map<string, CourseNotes>();
  for (const r of rows) {
    const c = courseById.get(r.course_id);
    if (!c) continue;
    const g = groups.get(r.course_id) ?? { courseId: c.id, courseTitle: c.title, courseSlug: c.slug, notes: [] };
    g.notes.push({ id: r.id, lessonId: r.lesson_id, atSeconds: r.at_seconds, body: r.body, createdAt: new Date(r.created_at), lessonTitle: lessonTitle.get(r.lesson_id) ?? "Lesson" });
    groups.set(r.course_id, g);
  }
  return [...groups.values()];
}

// ── Lesson Q&A ──────────────────────────────────────────────────────────

export interface Question {
  id: string;
  userId: string;
  authorName: string;
  isStaff: boolean;
  body: string;
  createdAt: Date;
  replies: Omit<Question, "replies">[];
}

interface QRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  is_staff: boolean;
  created_at: string;
}

/** Questions for a lesson with their replies (one level), oldest question first. */
export async function listLessonQuestions(lessonId: string): Promise<Question[]> {
  const { data, error } = await sb()
    .from("lesson_questions")
    .select("id,user_id,parent_id,body,is_staff,created_at")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as QRow[];
  const names = await nameMap(rows.map((r) => r.user_id));

  const shape = (r: QRow) => ({
    id: r.id,
    userId: r.user_id,
    authorName: r.is_staff ? "Instructor" : publicName(names.get(r.user_id)),
    isStaff: r.is_staff,
    body: r.body,
    createdAt: new Date(r.created_at),
  });
  const replies = new Map<string, Omit<Question, "replies">[]>();
  for (const r of rows) {
    if (r.parent_id) replies.set(r.parent_id, [...(replies.get(r.parent_id) ?? []), shape(r)]);
  }
  return rows.filter((r) => !r.parent_id).map((r) => ({ ...shape(r), replies: replies.get(r.id) ?? [] }));
}

export async function addLessonQuestion(
  user: { id: string; role?: string | null },
  courseId: string,
  lessonId: string,
  input: { body: string; parentId?: string },
): Promise<{ ok: true } | Fail> {
  if (input.parentId) {
    const { data: parent } = await sb().from("lesson_questions").select("id,lesson_id,parent_id").eq("id", input.parentId).maybeSingle();
    const p = parent as { lesson_id: string; parent_id: string | null } | null;
    if (!p || p.lesson_id !== lessonId) return fail(404, "Question not found");
    if (p.parent_id) return fail(400, "Reply to the question, not to a reply");
  }
  const { error } = await sb().from("lesson_questions").insert({
    course_id: courseId,
    lesson_id: lessonId,
    user_id: user.id,
    parent_id: input.parentId ?? null,
    body: input.body,
    is_staff: user.role === "admin",
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Authors can delete their own posts; admins can delete any. Deleting a question removes its replies. */
export async function deleteLessonQuestion(user: { id: string; role?: string | null }, id: string): Promise<boolean> {
  let q = sb().from("lesson_questions").delete().eq("id", id);
  if (user.role !== "admin") q = q.eq("user_id", user.id);
  const { data, error } = await q.select("id");
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}
