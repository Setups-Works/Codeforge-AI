import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EnrolledCourseCard } from "@/features/lms/enrolled-course-card";
import { getSession } from "@/lib/session";
import { listMyCourses } from "@/services/lms-learn";

export const metadata: Metadata = { title: "My courses" };
export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const mine = await listMyCourses(session.user.id);
  const active = mine.filter((m) => !m.enrollment.completedAt);
  const done = mine.filter((m) => m.enrollment.completedAt);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">My courses</h1>

      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-muted-foreground">
          <GraduationCap className="size-8" />
          <p className="text-sm">You haven&apos;t enrolled in any courses yet.</p>
          <Button asChild size="sm">
            <Link href="/learn/courses">Browse courses</Link>
          </Button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">In progress</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((m) => <EnrolledCourseCard key={m.course.id} item={m} />)}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Completed</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {done.map((m) => <EnrolledCourseCard key={m.course.id} item={m} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
