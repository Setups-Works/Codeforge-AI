import type { LessonKind } from "@/lib/lms/constants";

/**
 * Colour tokens for the LMS screens. The look is deliberately restrained: flat
 * surfaces, hairline borders and a single accent, the brand blue the landing
 * page already uses. Tune the palette here, not in components.
 */

const ACCENT_SOFT = "border-[#006bff]/25 bg-[#006bff]/10 text-[#006bff]";

/** Primary call-to-action. */
export const CTA = "bg-[#006bff] text-white hover:bg-[#0058d6]";

/** Level pill: accent-tinted. (Kept as a function so a level-specific palette can return later.) */
export const levelStyle = () => ACCENT_SOFT;

/** Category pill: quiet and neutral so the level reads first. */
export const CATEGORY_STYLE = "border-border bg-muted/50 text-muted-foreground";
export const DISCOUNT_STYLE = "border-transparent bg-[#006bff] text-white";
export const PREVIEW_STYLE = ACCENT_SOFT;

/** Lesson-kind icon and its soft chip: one accent for every kind. */
const KIND = { icon: "text-[#006bff]", chip: "bg-[#006bff]/10" };
export const KIND_STYLE: Record<LessonKind, { icon: string; chip: string }> = {
  video: KIND,
  text: KIND,
  problem: KIND,
  quiz: KIND,
};

/** Progress bar: accent track and fill. */
export const PROGRESS_STYLE = "bg-[#006bff]/15 [&_[data-slot=progress-indicator]]:bg-[#006bff]";

/** Flat tinted placeholder for courses without a thumbnail. */
export const PLACEHOLDER_BG = "bg-[#006bff]/[0.07]";
