import Link from "next/link";
import { GraduationCap, Play } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MyCourse } from "@/services/lms-learn";

/** A purchased course with its progress bar and a resume button. */
export function EnrolledCourseCard({ item }: { item: MyCourse }) {
  const { course, progress, resumeLessonId, resumeLessonTitle, enrollment } = item;
  const finished = Boolean(enrollment.completedAt);
  const started = Boolean(enrollment.lastLessonId);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <Link href={`/learn/courses/${course.slug}`} className="relative aspect-video bg-muted">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/40">
            <GraduationCap className="size-10" />
          </div>
        )}
        {finished && <Badge className="absolute left-2 top-2">Completed</Badge>}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={`/learn/courses/${course.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">
          {course.title}
        </Link>
        <div className="space-y-1.5">
          <Progress value={progress.percent} />
          <p className="text-xs text-muted-foreground">
            {progress.completed} of {progress.total} lessons · {progress.percent}%
          </p>
        </div>
        {resumeLessonId && (
          <Button asChild size="sm" className="mt-auto">
            <Link href={`/learn/watch/${course.slug}/${resumeLessonId}`}>
              <Play className="size-4" />
              {finished ? "Watch again" : started ? "Continue" : "Start"}
              {!finished && started && resumeLessonTitle ? <span className="max-w-32 truncate font-normal opacity-80">· {resumeLessonTitle}</span> : null}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
