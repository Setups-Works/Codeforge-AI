import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CourseStatus, LessonKind } from "@/lib/lms/constants";

/**
 * Learner-facing course reads. Deliberately separate from the admin service:
 * nothing here selects the `video` columns, so a Drive file id cannot leak
 * through a shared mapper. Playback goes through the entitlement-checked
 * endpoint added in Phase 3.
 */

export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  level: string | null;
  category: string | null;
  language: string;
  priceInr: number;
  compareAtInr: number | null;
  isFree: boolean;
  instructorName: string | null;
  lessonCount: number;
  durationS: number;
  students: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface CatalogLesson {
  id: string;
  title: string;
  kind: LessonKind;
  durationS: number;
  isFreePreview: boolean;
  gateNext: boolean;
}

export interface CatalogSection {
  id: string;
  title: string;
  lessons: CatalogLesson[];
}

export interface CourseDetail extends CourseCard {
  status: CourseStatus;
  includedInPlans: string[];
  description: string;
  tags: string[];
  outcomes: string[];
  requirements: string[];
  instructorBio: string | null;
  instructorImage: string | null;
  hasPromo: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  publishedAt: string | null;
  updatedAt: string;
  sections: CatalogSection[];
}

export type CourseSort = "newest" | "price-asc" | "price-desc";

export interface CatalogQuery {
  q?: string;
  category?: string;
  level?: string;
  price?: "free" | "paid";
  sort?: CourseSort;
  page?: number;
  limit?: number;
}

interface CardRow {
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

const CARD_COLS =
  "id,slug,title,subtitle,thumbnail_url,level,category,language,price_inr,compare_at_inr,is_free,instructor_name,stats";

const cardFromRow = (r: CardRow): CourseCard => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  thumbnailUrl: r.thumbnail_url,
  level: r.level,
  category: r.category,
  language: r.language,
  priceInr: r.is_free ? 0 : r.price_inr,
  compareAtInr: r.is_free ? null : r.compare_at_inr,
  isFree: r.is_free,
  instructorName: r.instructor_name,
  lessonCount: r.stats?.lesson_count ?? 0,
  durationS: r.stats?.duration_s ?? 0,
  students: r.stats?.students ?? 0,
  ratingAvg: r.stats?.rating_avg ?? null,
  ratingCount: r.stats?.rating_count ?? 0,
});

/** Strip characters that would break PostgREST's `or()` filter syntax or act as wildcards. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[,()%*_\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const CATALOG_PAGE_SIZE = 12;

export async function listPublishedCourses(
  query: CatalogQuery = {},
): Promise<{ items: CourseCard[]; total: number; page: number; pages: number }> {
  const limit = Math.min(Math.max(query.limit ?? CATALOG_PAGE_SIZE, 1), 48);
  const page = Math.max(query.page ?? 1, 1);

  let q = supabaseAdmin().from("courses").select(CARD_COLS, { count: "exact" }).eq("status", "published");

  const search = query.q ? sanitizeSearch(query.q) : "";
  if (search) q = q.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%,category.ilike.%${search}%`);
  if (query.category) q = q.eq("category", query.category);
  if (query.level) q = q.eq("level", query.level);
  if (query.price === "free") q = q.eq("is_free", true);
  if (query.price === "paid") q = q.eq("is_free", false);

  if (query.sort === "price-asc") q = q.order("price_inr", { ascending: true });
  else if (query.sort === "price-desc") q = q.order("price_inr", { ascending: false });
  else q = q.order("published_at", { ascending: false, nullsFirst: false });

  const from = (page - 1) * limit;
  const { data, count, error } = await q.range(from, from + limit - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    items: ((data ?? []) as unknown as CardRow[]).map(cardFromRow),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  };
}

/** How many published courses are included with at least one subscription plan. */
export async function countPlanIncludedCourses(): Promise<number> {
  const { data, error } = await supabaseAdmin().from("courses").select("included_in_plans").eq("status", "published");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { included_in_plans: string[] | null }[]).filter((c) => (c.included_in_plans ?? []).length > 0).length;
}

/** Published course slugs + last-modified, for the sitemap. */
export async function listPublishedCourseSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const { data, error } = await supabaseAdmin().from("courses").select("slug,updated_at").eq("status", "published");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { slug: string; updated_at: string }[]).map((r) => ({ slug: r.slug, updatedAt: new Date(r.updated_at) }));
}

/** Distinct categories across published courses, for the filter control. */
export async function listCourseCategories(): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from("courses").select("category").eq("status", "published").not("category", "is", null);
  if (error) throw new Error(error.message);
  return [...new Set(((data ?? []) as { category: string }[]).map((r) => r.category))].sort((a, b) => a.localeCompare(b));
}

/**
 * One course with its curriculum outline. Non-admins only see published
 * courses; admins can preview drafts and archived ones.
 */
export async function getCourseBySlug(slug: string, opts: { isAdmin?: boolean } = {}): Promise<CourseDetail | null> {
  const client = supabaseAdmin();
  let q = client
    .from("courses")
    .select(
      `${CARD_COLS},status,included_in_plans,description,tags,outcomes,requirements,instructor_bio,instructor_image,promo_video,seo_title,seo_description,seo_keywords,published_at,updated_at`,
    )
    .eq("slug", slug);
  if (!opts.isAdmin) q = q.eq("status", "published");
  const { data: course, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) return null;

  const row = course as unknown as CardRow & {
    status: CourseStatus;
    included_in_plans: string[] | null;
    description: string;
    tags: string[];
    outcomes: string[];
    requirements: string[];
    instructor_bio: string | null;
    instructor_image: string | null;
    promo_video: unknown;
    seo_title: string | null;
    seo_description: string | null;
    seo_keywords: string | null;
    published_at: string | null;
    updated_at: string;
  };

  const [sections, lessons] = await Promise.all([
    client.from("course_sections").select("id,title,position").eq("course_id", row.id).order("position"),
    // No `video` column here, by design.
    client.from("course_lessons").select("id,section_id,title,kind,duration_s,is_free_preview,gate_next,position").eq("course_id", row.id).order("position"),
  ]);
  if (sections.error) throw new Error(sections.error.message);
  if (lessons.error) throw new Error(lessons.error.message);

  const lessonRows = (lessons.data ?? []) as {
    id: string;
    section_id: string;
    title: string;
    kind: LessonKind;
    duration_s: number;
    is_free_preview: boolean;
    gate_next: boolean;
  }[];

  return {
    ...cardFromRow(row),
    status: row.status,
    includedInPlans: row.included_in_plans ?? [],
    description: row.description,
    tags: row.tags ?? [],
    outcomes: row.outcomes ?? [],
    requirements: row.requirements ?? [],
    instructorBio: row.instructor_bio,
    instructorImage: row.instructor_image,
    hasPromo: Boolean(row.promo_video),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoKeywords: row.seo_keywords,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    sections: ((sections.data ?? []) as { id: string; title: string }[]).map((s) => ({
      id: s.id,
      title: s.title,
      lessons: lessonRows
        .filter((l) => l.section_id === s.id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          kind: l.kind,
          durationS: l.duration_s,
          isFreePreview: l.is_free_preview,
          gateNext: l.gate_next,
        })),
    })),
  };
}

/** Whether a user already owns a course (used to swap Buy for Continue). */
export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("course_enrollments")
    .select("id,expires_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { expires_at: string | null } | null;
  return Boolean(row && (!row.expires_at || new Date(row.expires_at) > new Date()));
}
