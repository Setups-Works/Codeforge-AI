import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { CourseGrid } from "@/features/lms/course-card";
import { EnrolledCourseCard } from "@/features/lms/enrolled-course-card";
import { listPublishedCourses } from "@/services/lms-catalog";
import { listContinueWatching } from "@/services/lms-learn";

export const metadata: Metadata = { title: "Learn" };
export const dynamic = "force-dynamic";

export default async function LearnHomePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const firstName = (session.user.name ?? "there").split(" ")[0];
  const [latest, continuing] = await Promise.all([
    listPublishedCourses({ limit: 6 }).catch(() => ({ items: [], total: 0, page: 1, pages: 1 })),
    listContinueWatching(session.user.id).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to learn, <span className="text-[#006bff]">{firstName}</span>?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick up a course and build real skills.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/learn/courses">
            Browse all courses <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {continuing.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Continue watching</h2>
            <Link href="/learn/my-courses" className="text-sm text-primary hover:underline">All my courses</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {continuing.map((m) => <EnrolledCourseCard key={m.course.id} item={m} />)}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{latest.total > 0 ? "New courses" : "Courses"}</h2>
        {latest.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-muted-foreground">
            <GraduationCap className="size-8" />
            <p className="text-sm">Courses are on the way. Check back soon.</p>
          </div>
        ) : (
          <CourseGrid courses={latest.items} basePath="/learn/courses" />
        )}
      </section>
    </div>
  );
}
