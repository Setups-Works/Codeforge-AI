import Link from "next/link";
import { GraduationCap, Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MyCourse } from "@/services/lms-learn";

/** Courses the user owns, with progress and a resume link. Lives in Billing so purchases and access sit together. */
export function MyPurchases({ courses }: { courses: MyCourse[] }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <GraduationCap className="size-4.5 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">My courses</h3>
          <p className="text-xs text-muted-foreground">Courses you can open right now</p>
        </div>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <Link href="/learn/courses">Browse</Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          You haven&apos;t enrolled in any courses yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y overflow-hidden rounded-lg border">
          {courses.map((m) => (
            <li key={m.course.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="truncate text-sm font-medium">{m.course.title}</p>
                <div className="flex items-center gap-2">
                  <Progress value={m.progress.percent} className="h-1.5 max-w-40" />
                  <span className="text-xs text-muted-foreground">{m.progress.percent}%</span>
                </div>
              </div>
              {m.resumeLessonId && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/learn/watch/${m.course.slug}/${m.resumeLessonId}`}>
                    <Play className="size-3.5" /> {m.enrollment.completedAt ? "Watch again" : m.enrollment.lastLessonId ? "Continue" : "Start"}
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
