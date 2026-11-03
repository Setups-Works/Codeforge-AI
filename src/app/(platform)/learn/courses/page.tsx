import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CourseGrid } from "@/features/lms/course-card";
import { CourseFilters } from "@/features/lms/course-filters";
import { COURSE_LEVELS } from "@/lib/lms/constants";
import { listCourseCategories, listPublishedCourses, type CourseSort } from "@/services/lms-catalog";

export const metadata: Metadata = { title: "Browse courses" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LearnCoursesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const sort = one(sp.sort);
  const level = one(sp.level);
  const price = one(sp.price);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);

  const query = {
    q: one(sp.q),
    category: one(sp.category),
    level: COURSE_LEVELS.find((l) => l === level),
    price: price === "free" || price === "paid" ? price : undefined,
    sort: (["price-asc", "price-desc"].includes(sort ?? "") ? sort : "newest") as CourseSort,
    page: Number.isFinite(page) ? page : 1,
  } as const;

  const [result, categories] = await Promise.all([
    listPublishedCourses(query),
    listCourseCategories().catch(() => []),
  ]);

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = one(v);
      if (val && k !== "page") next.set(k, val);
    }
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/learn/courses?${qs}` : "/learn/courses";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total} {result.total === 1 ? "course" : "courses"} available.
        </p>
      </div>

      <CourseFilters categories={categories} />

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-20 text-muted-foreground">
          <GraduationCap className="size-8" />
          <p className="text-sm">No courses match your filters.</p>
        </div>
      ) : (
        <CourseGrid courses={result.items} basePath="/learn/courses" />
      )}

      {result.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
            <Link href={pageHref(result.page - 1)} aria-disabled={result.page <= 1} className={result.page <= 1 ? "pointer-events-none opacity-50" : ""}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {result.page} of {result.pages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={result.page >= result.pages}>
            <Link href={pageHref(result.page + 1)} aria-disabled={result.page >= result.pages} className={result.page >= result.pages ? "pointer-events-none opacity-50" : ""}>
              Next
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
