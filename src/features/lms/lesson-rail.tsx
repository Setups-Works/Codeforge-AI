import Link from "next/link";
import { Check, ChevronDown, Lock } from "@/components/icons";
import { LESSON_KIND_ICON } from "@/features/lms/lesson-kind";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/lms/format";
import type { CatalogSection } from "@/services/lms-catalog";

interface Props {
  courseSlug: string;
  sections: CatalogSection[];
  currentLessonId: string;
  completedIds: Set<string>;
  /** Lessons this viewer may open (enrolled, preview or admin). */
  openableIds: Set<string>;
}

/** Curriculum sidebar for the player: progress ticks, locks and the current lesson. */
export function LessonRail({ courseSlug, sections, currentLessonId, completedIds, openableIds }: Props) {
  return (
    <nav aria-label="Course content" className="divide-y rounded-xl border">
      {sections.map((section) => {
        const hasCurrent = section.lessons.some((l) => l.id === currentLessonId);
        return (
          <details key={section.id} open={hasCurrent} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
            </summary>
            <ul className="border-t bg-muted/20">
              {section.lessons.map((lesson) => {
                const current = lesson.id === currentLessonId;
                const done = completedIds.has(lesson.id);
                const openable = openableIds.has(lesson.id);
                const Icon = LESSON_KIND_ICON[lesson.kind];
                const row = (
                  <>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-3" /> : !openable ? <Lock className="size-3" /> : <Icon className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    {lesson.durationS > 0 && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDuration(lesson.durationS)}</span>
                    )}
                  </>
                );
                const cls = cn(
                  "flex items-center gap-2 px-3 py-2 text-sm",
                  current && "bg-accent font-medium",
                  openable ? "hover:bg-accent/60" : "cursor-not-allowed opacity-60",
                );
                return (
                  <li key={lesson.id}>
                    {openable ? (
                      <Link href={`/learn/watch/${courseSlug}/${lesson.id}`} className={cls} aria-current={current ? "page" : undefined}>
                        {row}
                      </Link>
                    ) : (
                      <div className={cls}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}
