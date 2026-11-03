import Link from "next/link";
import { BookOpen, Clock, GraduationCap, Star } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/plans";
import { discountPercent, formatDuration } from "@/lib/lms/format";
import type { CourseCard as CourseCardData } from "@/services/lms-catalog";

export function CourseCard({ course, href }: { course: CourseCardData; href: string }) {
  const off = discountPercent(course.priceInr, course.compareAtInr);
  const duration = formatDuration(course.durationS);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-video w-full bg-muted">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/40">
            <GraduationCap className="size-10" />
          </div>
        )}
        {off > 0 && <Badge className="absolute left-2 top-2">{off}% off</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          {course.level && <Badge variant="secondary">{course.level}</Badge>}
          {course.category && <Badge variant="outline">{course.category}</Badge>}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{course.title}</h3>
        {course.instructorName && <p className="text-xs text-muted-foreground">{course.instructorName}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          {course.ratingCount > 0 && course.ratingAvg != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 text-amber-500" /> {course.ratingAvg.toFixed(1)} ({course.ratingCount})
            </span>
          )}
          {course.lessonCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3" /> {course.lessonCount} lessons
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {duration}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold">{formatPrice(course.priceInr)}</span>
          {off > 0 && course.compareAtInr != null && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(course.compareAtInr)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CourseGrid({ courses, basePath }: { courses: CourseCardData[]; basePath: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} href={`${basePath}/${c.slug}`} />
      ))}
    </div>
  );
}
