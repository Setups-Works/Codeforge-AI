import { supabaseAdmin } from "@/lib/supabase/admin";
import { slugify, uniqueSlug } from "@/lib/slug";
import { parseDriveLink, toShareUrl, type VideoRef } from "@/lib/lms/video";
import type { CourseStatus, LessonKind } from "@/lib/lms/constants";
import type { CoursePatch } from "@/schemas/course";

/**
 * Admin-side course authoring (Supabase only — the LMS has no Mongo models).
 * Every function here is for trusted admin routes; learner-facing reads live in
 * a separate module so video refs can never leak through a shared mapper.
 */

export interface CourseStats {
  students?: number;
  ratingAvg?: number;
  ratingCount?: number;
  durationS?: number;
  lessonCount?: number;
}

export interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  thumbnailUrl: string | null;
  promoVideoUrl: string | null;
  level: string | null;
  language: string;
  category: string | null;
  tags: string[];
  priceInr: number;
  compareAtInr: number | null;
  isFree: boolean;
  status: CourseStatus;
  publishedAt: string | null;
  instructorName: string | null;
  instructorBio: string | null;
  instructorImage: string | null;
  outcomes: string[];
  requirements: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  stats: CourseStats;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLesson {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  position: number;
  kind: LessonKind;
  videoUrl: string;
  durationMin: number;
  bodyMd: string | null;
  isFreePreview: boolean;
  dripDays: number | null;
}

export interface AdminSection {
  id: string;
  title: string;
  position: number;
  lessons: AdminLesson[];
}

export interface AdminCourseDetail {
  course: AdminCourse;
  sections: AdminSection[];
}

export type ServiceResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({ ok: false, status, error });

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  thumbnail_url: string | null;
  promo_video: VideoRef | null;
  level: string | null;
  language: string;
  category: string | null;
  tags: string[];
  price_inr: number;
  compare_at_inr: number | null;
  is_free: boolean;
  status: CourseStatus;
  published_at: string | null;
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_image: string | null;
  outcomes: string[];
  requirements: string[];
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  stats: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

interface LessonRow {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  position: number;
  kind: LessonKind;
  video: VideoRef | null;
  duration_s: number;
  body_md: string | null;
  is_free_preview: boolean;
  drip_days: number | null;
}

interface SectionRow {
  id: string;
  title: string;
  position: number;
}

const COURSE_COLS =
  "id,slug,title,subtitle,description,thumbnail_url,promo_video,level,language,category,tags,price_inr,compare_at_inr,is_free,status,published_at,instructor_name,instructor_bio,instructor_image,outcomes,requirements,seo_title,seo_description,seo_keywords,stats,created_at,updated_at";
const LESSON_COLS = "id,course_id,section_id,title,position,kind,video,duration_s,body_md,is_free_preview,drip_days";

const courseFromRow = (r: CourseRow): AdminCourse => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  description: r.description,
  thumbnailUrl: r.thumbnail_url,
  promoVideoUrl: r.promo_video ? toShareUrl(r.promo_video) : null,
  level: r.level,
  language: r.language,
  category: r.category,
  tags: r.tags ?? [],
  priceInr: r.price_inr,
  compareAtInr: r.compare_at_inr,
  isFree: r.is_free,
  status: r.status,
  publishedAt: r.published_at,
  instructorName: r.instructor_name,
  instructorBio: r.instructor_bio,
  instructorImage: r.instructor_image,
  outcomes: r.outcomes ?? [],
  requirements: r.requirements ?? [],
  seoTitle: r.seo_title,
  seoDescription: r.seo_description,
  seoKeywords: r.seo_keywords,
  stats: {
    students: r.stats?.students,
    ratingAvg: r.stats?.rating_avg,
    ratingCount: r.stats?.rating_count,
    durationS: r.stats?.duration_s,
    lessonCount: r.stats?.lesson_count,
  },
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const lessonFromRow = (r: LessonRow): AdminLesson => ({
  id: r.id,
  courseId: r.course_id,
  sectionId: r.section_id,
  title: r.title,
  position: r.position,
  kind: r.kind,
  videoUrl: r.video ? toShareUrl(r.video) : "",
  durationMin: Math.round((r.duration_s / 60) * 10) / 10,
  bodyMd: r.body_md,
  isFreePreview: r.is_free_preview,
  dripDays: r.drip_days,
});

const sb = () => supabaseAdmin();

export async function adminListCourses(): Promise<AdminCourse[]> {
  const { data, error } = await sb().from("courses").select(COURSE_COLS).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CourseRow[]).map(courseFromRow);
}

export async function adminGetCourse(id: string): Promise<AdminCourseDetail | null> {
  const client = sb();
  const { data: course, error } = await client.from("courses").select(COURSE_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) return null;

  const [sections, lessons] = await Promise.all([
    client.from("course_sections").select("id,title,position").eq("course_id", id).order("position"),
    client.from("course_lessons").select(LESSON_COLS).eq("course_id", id).order("position"),
  ]);
  if (sections.error) throw new Error(sections.error.message);
  if (lessons.error) throw new Error(lessons.error.message);

  const lessonList = ((lessons.data ?? []) as unknown as LessonRow[]).map(lessonFromRow);
  return {
    course: courseFromRow(course as unknown as CourseRow),
    sections: ((sections.data ?? []) as SectionRow[]).map((s) => ({
      ...s,
      lessons: lessonList.filter((l) => l.sectionId === s.id),
    })),
  };
}

export async function createCourse(title: string, createdBy: string): Promise<{ id: string; slug: string }> {
  const client = sb();
  const slug = await uniqueSlug(title, async (candidate) => {
    const { data } = await client.from("courses").select("id").eq("slug", candidate).maybeSingle();
    return Boolean(data);
  });
  const { data, error } = await client
    .from("courses")
    .insert({ title, slug, created_by: createdBy })
    .select("id,slug")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; slug: string };
}

/** Recompute the denormalised lesson count / duration shown on cards. */
async function refreshStats(courseId: string): Promise<void> {
  const client = sb();
  const [{ data: lessons }, { data: course }] = await Promise.all([
    client.from("course_lessons").select("duration_s").eq("course_id", courseId),
    client.from("courses").select("stats").eq("id", courseId).maybeSingle(),
  ]);
  const rows = (lessons ?? []) as { duration_s: number }[];
  const stats = {
    ...((course as { stats: Record<string, number> } | null)?.stats ?? {}),
    lesson_count: rows.length,
    duration_s: rows.reduce((sum, r) => sum + r.duration_s, 0),
  };
  await client.from("courses").update({ stats }).eq("id", courseId);
}

export async function updateCourse(id: string, patch: CoursePatch): Promise<ServiceResult<AdminCourse>> {
  const client = sb();
  const { data: current } = await client.from("courses").select("id,status,published_at,is_free,price_inr").eq("id", id).maybeSingle();
  if (!current) return fail(404, "Course not found");
  const cur = current as { status: CourseStatus; published_at: string | null; is_free: boolean; price_inr: number };

  const row: Record<string, unknown> = {};
  const map: Record<string, string> = {
    title: "title",
    slug: "slug",
    subtitle: "subtitle",
    description: "description",
    thumbnailUrl: "thumbnail_url",
    level: "level",
    language: "language",
    category: "category",
    tags: "tags",
    priceInr: "price_inr",
    compareAtInr: "compare_at_inr",
    isFree: "is_free",
    status: "status",
    instructorName: "instructor_name",
    instructorBio: "instructor_bio",
    instructorImage: "instructor_image",
    outcomes: "outcomes",
    requirements: "requirements",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    seoKeywords: "seo_keywords",
  };
  for (const [key, col] of Object.entries(map)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) row[col] = value;
  }

  if (patch.slug !== undefined && patch.slug !== slugify(patch.slug)) return fail(400, "Invalid slug");

  if (patch.promoVideoUrl !== undefined) {
    if (!patch.promoVideoUrl) row.promo_video = null;
    else {
      const video = parseDriveLink(patch.promoVideoUrl);
      if (!video) return fail(400, "Promo video must be a Google Drive file link");
      row.promo_video = video;
    }
  }

  const isFree = patch.isFree ?? cur.is_free;
  const price = patch.priceInr ?? cur.price_inr;
  if (isFree) row.price_inr = 0;
  if (patch.compareAtInr != null && patch.compareAtInr <= (isFree ? 0 : price)) {
    return fail(400, "Compare-at price must be higher than the price");
  }

  if (patch.status === "published") {
    if (!isFree && price <= 0) return fail(400, "Set a price or mark the course free before publishing");
    const { count } = await client.from("course_lessons").select("id", { count: "exact", head: true }).eq("course_id", id);
    if (!count) return fail(400, "Add at least one lesson before publishing");
    if (!cur.published_at) row.published_at = new Date().toISOString();
  }

  if (!Object.keys(row).length) return fail(400, "Nothing to update");
  row.updated_at = new Date().toISOString();

  const { data, error } = await client.from("courses").update(row).eq("id", id).select(COURSE_COLS).single();
  if (error) return fail(error.code === "23505" ? 409 : 500, error.code === "23505" ? "That slug is already in use" : error.message);
  return { ok: true, data: courseFromRow(data as unknown as CourseRow) };
}

export async function deleteCourse(id: string): Promise<ServiceResult> {
  const client = sb();
  const { count } = await client.from("course_enrollments").select("id", { count: "exact", head: true }).eq("course_id", id);
  if (count) return fail(409, "This course has enrolled learners. Archive it instead of deleting.");
  const { error } = await client.from("courses").delete().eq("id", id);
  if (error) return fail(500, error.message);
  return { ok: true, data: undefined };
}

// ── Sections ────────────────────────────────────────────────────────────

async function nextPosition(table: "course_sections" | "course_lessons", scope: Record<string, string>): Promise<number> {
  let q = sb().from(table).select("position").order("position", { ascending: false }).limit(1);
  for (const [k, v] of Object.entries(scope)) q = q.eq(k, v);
  const { data } = await q;
  const top = (data as { position: number }[] | null)?.[0]?.position;
  return top === undefined ? 0 : top + 1;
}

export async function createSection(courseId: string, title: string): Promise<ServiceResult<AdminSection>> {
  const client = sb();
  const { data: course } = await client.from("courses").select("id").eq("id", courseId).maybeSingle();
  if (!course) return fail(404, "Course not found");
  const position = await nextPosition("course_sections", { course_id: courseId });
  const { data, error } = await client
    .from("course_sections")
    .insert({ course_id: courseId, title, position })
    .select("id,title,position")
    .single();
  if (error) return fail(500, error.message);
  return { ok: true, data: { ...(data as SectionRow), lessons: [] } };
}

export async function updateSection(courseId: string, sectionId: string, title: string): Promise<ServiceResult> {
  const { data, error } = await sb()
    .from("course_sections")
    .update({ title })
    .eq("id", sectionId)
    .eq("course_id", courseId)
    .select("id");
  if (error) return fail(500, error.message);
  if (!data?.length) return fail(404, "Section not found");
  return { ok: true, data: undefined };
}

export async function deleteSection(courseId: string, sectionId: string): Promise<ServiceResult> {
  const client = sb();
  const { data: existing } = await client.from("course_sections").select("id").eq("id", sectionId).eq("course_id", courseId).maybeSingle();
  if (!existing) return fail(404, "Section not found");
  const { error } = await client.from("course_sections").delete().eq("id", sectionId);
  if (error) return fail(500, error.message);
  await refreshStats(courseId);
  return { ok: true, data: undefined };
}

// ── Lessons ─────────────────────────────────────────────────────────────

export interface LessonInput {
  sectionId: string;
  title: string;
  kind?: LessonKind;
  videoUrl?: string;
  durationMin?: number;
  bodyMd?: string | null;
  isFreePreview?: boolean;
  dripDays?: number | null;
}

/** Empty input clears the video; anything else must be a valid Drive file link. */
function lessonVideo(videoUrl: string | undefined): ServiceResult<VideoRef | null> {
  if (!videoUrl) return { ok: true, data: null };
  const video = parseDriveLink(videoUrl);
  if (!video) return fail(400, "Video must be a Google Drive file link (not a folder)");
  return { ok: true, data: video };
}

async function sectionBelongs(courseId: string, sectionId: string): Promise<boolean> {
  const { data } = await sb().from("course_sections").select("id").eq("id", sectionId).eq("course_id", courseId).maybeSingle();
  return Boolean(data);
}

export async function createLesson(courseId: string, input: LessonInput): Promise<ServiceResult<AdminLesson>> {
  if (!(await sectionBelongs(courseId, input.sectionId))) return fail(404, "Section not found");
  const kind = input.kind ?? "video";
  const video = lessonVideo(input.videoUrl);
  if (!video.ok) return video;

  const position = await nextPosition("course_lessons", { section_id: input.sectionId });
  const { data, error } = await sb()
    .from("course_lessons")
    .insert({
      course_id: courseId,
      section_id: input.sectionId,
      title: input.title,
      position,
      kind,
      video: video.data,
      duration_s: Math.round((input.durationMin ?? 0) * 60),
      body_md: input.bodyMd ?? null,
      is_free_preview: input.isFreePreview ?? false,
      drip_days: input.dripDays ?? null,
    })
    .select(LESSON_COLS)
    .single();
  if (error) return fail(500, error.message);
  await refreshStats(courseId);
  return { ok: true, data: lessonFromRow(data as unknown as LessonRow) };
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  patch: Partial<LessonInput>,
): Promise<ServiceResult<AdminLesson>> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.bodyMd !== undefined) row.body_md = patch.bodyMd;
  if (patch.isFreePreview !== undefined) row.is_free_preview = patch.isFreePreview;
  if (patch.dripDays !== undefined) row.drip_days = patch.dripDays;
  if (patch.durationMin !== undefined) row.duration_s = Math.round(patch.durationMin * 60);
  if (patch.videoUrl !== undefined) {
    const video = lessonVideo(patch.videoUrl);
    if (!video.ok) return video;
    row.video = video.data;
  }
  if (patch.sectionId !== undefined) {
    if (!(await sectionBelongs(courseId, patch.sectionId))) return fail(404, "Section not found");
    row.section_id = patch.sectionId;
    row.position = await nextPosition("course_lessons", { section_id: patch.sectionId });
  }
  if (!Object.keys(row).length) return fail(400, "Nothing to update");
  row.updated_at = new Date().toISOString();

  const { data, error } = await sb()
    .from("course_lessons")
    .update(row)
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .select(LESSON_COLS)
    .maybeSingle();
  if (error) return fail(500, error.message);
  if (!data) return fail(404, "Lesson not found");
  await refreshStats(courseId);
  return { ok: true, data: lessonFromRow(data as unknown as LessonRow) };
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<ServiceResult> {
  const { data, error } = await sb().from("course_lessons").delete().eq("id", lessonId).eq("course_id", courseId).select("id");
  if (error) return fail(500, error.message);
  if (!data?.length) return fail(404, "Lesson not found");
  await refreshStats(courseId);
  return { ok: true, data: undefined };
}

/** Parse one bulk-import line: `Title | link` or just `link`. */
export function parseBulkEntry(entry: string, fallbackIndex: number): { title: string; link: string } {
  const sep = entry.lastIndexOf("|");
  if (sep === -1) return { title: `Lesson ${fallbackIndex}`, link: entry.trim() };
  return { title: entry.slice(0, sep).trim() || `Lesson ${fallbackIndex}`, link: entry.slice(sep + 1).trim() };
}

/**
 * Create many video lessons from pasted links. Validates every line first and
 * creates nothing if any are bad, so a typo can't leave a half-imported section.
 */
export async function bulkCreateLessons(
  courseId: string,
  sectionId: string,
  entries: string[],
): Promise<ServiceResult<AdminLesson[]>> {
  if (!(await sectionBelongs(courseId, sectionId))) return fail(404, "Section not found");

  const parsed = entries.map((entry, i) => {
    const { title, link } = parseBulkEntry(entry, i + 1);
    return { title, video: parseDriveLink(link), line: i + 1 };
  });
  const bad = parsed.filter((p) => !p.video);
  if (bad.length) return fail(400, `Line ${bad.map((b) => b.line).join(", ")}: not a valid Google Drive file link`);

  const start = await nextPosition("course_lessons", { section_id: sectionId });
  const { data, error } = await sb()
    .from("course_lessons")
    .insert(
      parsed.map((p, i) => ({
        course_id: courseId,
        section_id: sectionId,
        title: p.title,
        position: start + i,
        kind: "video",
        video: p.video,
      })),
    )
    .select(LESSON_COLS);
  if (error) return fail(500, error.message);
  await refreshStats(courseId);
  return { ok: true, data: ((data ?? []) as unknown as LessonRow[]).map(lessonFromRow) };
}

export async function reorder(
  courseId: string,
  input: { type: "sections"; ids: string[] } | { type: "lessons"; sectionId: string; ids: string[] },
): Promise<ServiceResult> {
  const client = sb();
  const table = input.type === "sections" ? "course_sections" : "course_lessons";
  let q = client.from(table).select("id").eq("course_id", courseId);
  if (input.type === "lessons") q = q.eq("section_id", input.sectionId);
  const { data, error } = await q;
  if (error) return fail(500, error.message);

  // The submitted order must be a permutation of exactly the rows that exist.
  const existing = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
  if (existing.size !== input.ids.length || input.ids.some((id) => !existing.has(id)) || new Set(input.ids).size !== input.ids.length) {
    return fail(400, "Order does not match the current items — reload and try again");
  }

  const results = await Promise.all(input.ids.map((id, position) => client.from(table).update({ position }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(500, failed.error.message);
  return { ok: true, data: undefined };
}
