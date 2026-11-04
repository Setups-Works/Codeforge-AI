import { Code2, FileText, ListChecks, Video } from "@/components/icons";
import type { LessonKind } from "@/lib/lms/constants";

/** One icon per lesson kind, shared by the curriculum outline and the player rail. */
export const LESSON_KIND_ICON = {
  video: Video,
  text: FileText,
  problem: Code2,
  quiz: ListChecks,
} satisfies Record<LessonKind, unknown>;
