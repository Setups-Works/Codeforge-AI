import { supabaseAdmin } from "@/lib/supabase/admin";
import { uniqueSlug } from "@/lib/slug";
import type { CourseStatus } from "@/lib/lms/constants";

/** Course bundles: several courses sold together at one price. */

const sb = () => supabaseAdmin();

type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

export interface Bundle {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  priceInr: number;
  status: CourseStatus;
  createdAt: Date;
}

export interface BundleCourse {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  priceInr: number;
}

export interface BundleDetail extends Bundle {
  courses: BundleCourse[];
  /** What the courses cost separately, and what buying the bundle saves. */
  valueInr: number;
  savingsInr: number;
}

interface BundleRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  price_inr: number;
  status: CourseStatus;
  created_at: string;
}

const COLS = "id,slug,title,description,thumbnail_url,price_inr,status,created_at";

const fromRow = (r: BundleRow): Bundle => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  thumbnailUrl: r.thumbnail_url,
  priceInr: r.price_inr,
  status: r.status,
  createdAt: new Date(r.created_at),
});

async function coursesOf(bundleIds: string[]): Promise<Map<string, BundleCourse[]>> {
  const out = new Map<string, BundleCourse[]>();
  if (!bundleIds.length) return out;
  const { data: items, error } = await sb().from("course_bundle_items").select("bundle_id,course_id,position").in("bundle_id", bundleIds).order("position");
  if (error) throw new Error(error.message);
  const rows = (items ?? []) as { bundle_id: string; course_id: string }[];
  const ids = [...new Set(rows.map((r) => r.course_id))];
  const { data: courses } = ids.length
    ? await sb().from("courses").select("id,slug,title,thumbnail_url,price_inr,is_free").in("id", ids)
    : { data: [] };
  const byId = new Map(
    ((courses ?? []) as { id: string; slug: string; title: string; thumbnail_url: string | null; price_inr: number; is_free: boolean }[]).map((c) => [
      c.id,
      { id: c.id, slug: c.slug, title: c.title, thumbnailUrl: c.thumbnail_url, priceInr: c.is_free ? 0 : c.price_inr },
    ]),
  );
  for (const r of rows) {
    const c = byId.get(r.course_id);
    if (c) out.set(r.bundle_id, [...(out.get(r.bundle_id) ?? []), c]);
  }
  return out;
}

const withValue = (b: Bundle, courses: BundleCourse[]): BundleDetail => {
  const valueInr = courses.reduce((sum, c) => sum + c.priceInr, 0);
  return { ...b, courses, valueInr, savingsInr: Math.max(0, valueInr - b.priceInr) };
};

export async function adminListBundles(): Promise<BundleDetail[]> {
  const { data, error } = await sb().from("course_bundles").select(COLS).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const bundles = ((data ?? []) as BundleRow[]).map(fromRow);
  const courses = await coursesOf(bundles.map((b) => b.id));
  return bundles.map((b) => withValue(b, courses.get(b.id) ?? []));
}

export async function adminGetBundle(id: string): Promise<BundleDetail | null> {
  const { data, error } = await sb().from("course_bundles").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const courses = await coursesOf([id]);
  return withValue(fromRow(data as BundleRow), courses.get(id) ?? []);
}

export async function createBundle(title: string): Promise<{ id: string; slug: string }> {
  const client = sb();
  const slug = await uniqueSlug(title, async (s) => Boolean((await client.from("course_bundles").select("id").eq("slug", s).maybeSingle()).data));
  const { data, error } = await client.from("course_bundles").insert({ title, slug }).select("id,slug").single();
  if (error) throw new Error(error.message);
  return data as { id: string; slug: string };
}

export interface BundlePatch {
  title?: string;
  slug?: string;
  description?: string;
  thumbnailUrl?: string | null;
  priceInr?: number;
  status?: CourseStatus;
  courseIds?: string[];
}

export async function updateBundle(id: string, patch: BundlePatch): Promise<{ ok: true } | Fail> {
  const client = sb();
  const current = await adminGetBundle(id);
  if (!current) return fail(404, "Bundle not found");

  const courseIds = patch.courseIds ?? current.courses.map((c) => c.id);
  if (patch.courseIds) {
    if (new Set(patch.courseIds).size !== patch.courseIds.length) return fail(400, "A course can only be in a bundle once");
    const { data } = patch.courseIds.length ? await client.from("courses").select("id").in("id", patch.courseIds) : { data: [] };
    if ((data ?? []).length !== patch.courseIds.length) return fail(400, "One of the selected courses doesn't exist");
  }

  if (patch.status === "published") {
    if (courseIds.length < 2) return fail(400, "A bundle needs at least two courses");
    const { data: pub } = await client.from("courses").select("id").in("id", courseIds).eq("status", "published");
    if ((pub ?? []).length !== courseIds.length) return fail(400, "Every course in a published bundle must itself be published");
    if ((patch.priceInr ?? current.priceInr) <= 0) return fail(400, "Set a price before publishing");
  }

  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.thumbnailUrl !== undefined) row.thumbnail_url = patch.thumbnailUrl;
  if (patch.priceInr !== undefined) row.price_inr = patch.priceInr;
  if (patch.status !== undefined) row.status = patch.status;
  if (Object.keys(row).length) {
    row.updated_at = new Date().toISOString();
    const { error } = await client.from("course_bundles").update(row).eq("id", id);
    if (error) return fail(error.code === "23505" ? 409 : 500, error.code === "23505" ? "That slug is already in use" : error.message);
  }
  if (patch.courseIds) {
    await client.from("course_bundle_items").delete().eq("bundle_id", id);
    if (patch.courseIds.length) {
      const { error } = await client.from("course_bundle_items").insert(patch.courseIds.map((course_id, position) => ({ bundle_id: id, course_id, position })));
      if (error) return fail(500, error.message);
    }
  }
  return { ok: true };
}

export async function deleteBundle(id: string): Promise<{ ok: true } | Fail> {
  const client = sb();
  const { count } = await client.from("course_orders").select("id", { count: "exact", head: true }).eq("bundle_id", id);
  if (count) return fail(409, "This bundle has orders on record. Archive it instead of deleting.");
  const { error } = await client.from("course_bundles").delete().eq("id", id);
  return error ? fail(500, error.message) : { ok: true };
}

export async function listPublishedBundles(): Promise<BundleDetail[]> {
  const { data, error } = await sb().from("course_bundles").select(COLS).eq("status", "published").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const bundles = ((data ?? []) as BundleRow[]).map(fromRow);
  const courses = await coursesOf(bundles.map((b) => b.id));
  return bundles.map((b) => withValue(b, courses.get(b.id) ?? []));
}

export async function getPublishedBundleBySlug(slug: string, opts: { isAdmin?: boolean } = {}): Promise<BundleDetail | null> {
  let q = sb().from("course_bundles").select(COLS).eq("slug", slug);
  if (!opts.isAdmin) q = q.eq("status", "published");
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const courses = await coursesOf([(data as BundleRow).id]);
  return withValue(fromRow(data as BundleRow), courses.get((data as BundleRow).id) ?? []);
}
