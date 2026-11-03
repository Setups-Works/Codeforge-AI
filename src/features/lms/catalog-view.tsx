import Link from "next/link";
import { GraduationCap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CourseGrid } from "@/features/lms/course-card";
import { CourseFilters } from "@/features/lms/course-filters";
import { COURSE_LEVELS } from "@/lib/lms/constants";
import { listCourseCategories, listPublishedCourses, type CourseSort } from "@/services/lms-catalog";

export type CatalogSearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filters + grid + paging shared by the in-app (/learn/courses) and public (/courses) catalogues. */
export async function CatalogView({ searchParams, basePath }: { searchParams: CatalogSearchParams; basePath: string }) {
  const sort = one(searchParams.sort);
  const level = one(searchParams.level);
  const price = one(searchParams.price);
  const page = Number.parseInt(one(searchParams.page) ?? "1", 10);

  const [result, categories] = await Promise.all([
    listPublishedCourses({
      q: one(searchParams.q),
      category: one(searchParams.category),
      level: COURSE_LEVELS.find((l) => l === level),
      price: price === "free" || price === "paid" ? price : undefined,
      sort: (["price-asc", "price-desc"].includes(sort ?? "") ? sort : "newest") as CourseSort,
      page: Number.isFinite(page) ? page : 1,
    }),
    listCourseCategories().catch(() => []),
  ]);

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      const val = one(v);
      if (val && k !== "page") next.set(k, val);
    }
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const prevOff = result.page <= 1;
  const nextOff = result.page >= result.pages;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {result.total} {result.total === 1 ? "course" : "courses"} available.
      </p>

      <CourseFilters categories={categories} />

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-20 text-muted-foreground">
          <GraduationCap className="size-8" />
          <p className="text-sm">No courses match your filters.</p>
        </div>
      ) : (
        <CourseGrid courses={result.items} basePath={basePath} />
      )}

      {result.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="outline" size="sm" disabled={prevOff}>
            <Link href={pageHref(result.page - 1)} aria-disabled={prevOff} className={prevOff ? "pointer-events-none opacity-50" : ""}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {result.page} of {result.pages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={nextOff}>
            <Link href={pageHref(result.page + 1)} aria-disabled={nextOff} className={nextOff ? "pointer-events-none opacity-50" : ""}>
              Next
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
