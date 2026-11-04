import Link from "next/link";
import { ChevronDown, Eye } from "@/components/icons";
import { LESSON_KIND_ICON } from "@/features/lms/lesson-kind";
import { KIND_STYLE, PREVIEW_STYLE } from "@/features/lms/colors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatDuration, pluralize } from "@/lib/lms/format";
import type { CatalogLesson, CatalogSection } from "@/services/lms-catalog";

/** Read-only curriculum outline. Uses native <details> so it needs no client JS. */
export function Curriculum({
  sections,
  hrefFor,
}: {
  sections: CatalogSection[];
  /** Return a link for lessons the viewer can open, or null to render them plain. */
  hrefFor?: (lesson: CatalogLesson) => string | null;
}) {
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">The curriculum will appear here soon.</p>;
  }

  return (
    <div className="divide-y rounded-xl border">
      {sections.map((section, i) => {
        const total = section.lessons.reduce((sum, l) => sum + l.durationS, 0);
        return (
          <details key={section.id} open={i === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {pluralize(section.lessons.length, "lesson")}{total > 0 ? ` · ${formatDuration(total)}` : ""}
              </span>
            </summary>
            <ul className="divide-y border-t bg-muted/20">
              {section.lessons.map((lesson) => {
                const href = hrefFor?.(lesson) ?? null;
                const cls = `flex items-center gap-3 px-4 py-2.5 text-sm ${href ? "hover:bg-accent/60" : ""}`;
                const row = (
                  <>
                    {(() => {
                      const Icon = LESSON_KIND_ICON[lesson.kind];
                      return <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", KIND_STYLE[lesson.kind].chip)}><Icon className={cn("size-4", KIND_STYLE[lesson.kind].icon)} /></span>;
                    })()}
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    {lesson.isFreePreview && (
                      <Badge variant="outline" className={PREVIEW_STYLE}>
                        <Eye /> Preview
                      </Badge>
                    )}
                    {lesson.durationS > 0 && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDuration(lesson.durationS)}</span>
                    )}
                  </>
                );
                return (
                  <li key={lesson.id}>
                    {href ? (
                      <Link href={href} className={cls}>{row}</Link>
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
    </div>
  );
}
