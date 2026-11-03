import { ChevronDown, Eye, FileText, Video } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/lms/format";
import type { CatalogSection } from "@/services/lms-catalog";

/** Read-only curriculum outline. Uses native <details> so it needs no client JS. */
export function Curriculum({ sections }: { sections: CatalogSection[] }) {
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
                {section.lessons.length} lessons{total > 0 ? ` · ${formatDuration(total)}` : ""}
              </span>
            </summary>
            <ul className="divide-y border-t bg-muted/20">
              {section.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {lesson.kind === "video" ? (
                    <Video className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                  {lesson.isFreePreview && (
                    <Badge variant="outline">
                      <Eye /> Preview
                    </Badge>
                  )}
                  {lesson.durationS > 0 && (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDuration(lesson.durationS)}</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
