import type { ReactNode } from "react";
import { BookOpen, Check, Clock, GraduationCap, Globe, Layers, Star, Users } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { Curriculum } from "@/features/lms/curriculum";
import { formatPrice } from "@/lib/plans";
import { discountPercent, formatDuration } from "@/lib/lms/format";
import type { CatalogLesson, CourseDetail } from "@/services/lms-catalog";

/**
 * The course product page body, shared by the in-app page (/learn/courses/[slug])
 * and the public SEO page (/courses/[slug]). The caller supplies the purchase
 * action and which lessons are linkable, so access rules stay in one place.
 */
export function CourseDetailView({
  course,
  action,
  hrefFor,
  extra,
}: {
  course: CourseDetail;
  /** Buy / Continue / Sign-in control for the price card. */
  action: ReactNode;
  hrefFor?: (lesson: CatalogLesson) => string | null;
  /** Extra sections rendered after the instructor, e.g. reviews. */
  extra?: ReactNode;
}) {
  const off = discountPercent(course.priceInr, course.compareAtInr);
  const duration = formatDuration(course.durationS);

  return (
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <header className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {course.level && <Badge variant="secondary">{course.level}</Badge>}
              {course.category && <Badge variant="outline">{course.category}</Badge>}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {course.ratingCount > 0 && course.ratingAvg != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 text-amber-500" /> {course.ratingAvg.toFixed(1)} ({course.ratingCount} reviews)
                </span>
              )}
              {course.students > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4" /> {course.students} learners
                </span>
              )}
              {course.instructorName && <span>By {course.instructorName}</span>}
            </div>
          </header>

          {course.outcomes.length > 0 && (
            <section className="rounded-xl border p-5">
              <h2 className="mb-3 text-lg font-semibold">What you&apos;ll learn</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Curriculum</h2>
            <Curriculum sections={course.sections} hrefFor={hrefFor} />
          </section>

          {course.requirements.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Requirements</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {course.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {course.description && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">About this course</h2>
              <Markdown>{course.description}</Markdown>
            </section>
          )}

          {(course.instructorName || course.instructorBio) && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Instructor</h2>
              <div className="flex gap-4">
                {course.instructorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.instructorImage} alt="" className="size-16 shrink-0 rounded-full border object-cover" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                    <GraduationCap className="size-6" />
                  </div>
                )}
                <div>
                  {course.instructorName && <p className="font-medium">{course.instructorName}</p>}
                  {course.instructorBio && <p className="mt-1 text-sm text-muted-foreground">{course.instructorBio}</p>}
                </div>
              </div>
            </section>
          )}

          {extra}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {course.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
            )}
            <div className="space-y-4 p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPrice(course.priceInr)}</span>
                {off > 0 && course.compareAtInr != null && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(course.compareAtInr)}</span>
                    <Badge>{off}% off</Badge>
                  </>
                )}
              </div>

              {action}

              <ul className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
                {course.lessonCount > 0 && (
                  <li className="flex items-center gap-2"><BookOpen className="size-4" /> {course.lessonCount} lessons</li>
                )}
                {duration && <li className="flex items-center gap-2"><Clock className="size-4" /> {duration} of content</li>}
                {course.level && <li className="flex items-center gap-2"><Layers className="size-4" /> {course.level}</li>}
                <li className="flex items-center gap-2"><Globe className="size-4" /> {course.language.toUpperCase()}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
  );
}
