/**
 * The single source of truth for "may this viewer watch this lesson?".
 *
 * Every endpoint that returns a video ref or a lesson resource must call this;
 * the UI never decides access on its own. It is pure (no I/O) so the rules are
 * fully unit-testable — callers load the course, lesson and enrollment first.
 */

export type AccessReason =
  | "admin"
  | "free-preview"
  | "enrolled"
  | "signed-out"
  | "not-enrolled"
  | "expired"
  | "unpublished"
  | "drip-locked";

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
  /** Set when `reason` is "drip-locked": when the lesson opens. */
  unlocksAt?: Date;
}

export interface AccessInput {
  course: { status: "draft" | "published" | "archived" };
  lesson: { isFreePreview: boolean; dripDays: number | null };
  user: { id: string; role?: string | null } | null;
  enrollment: { enrolledAt: Date; expiresAt: Date | null } | null;
  now?: Date;
}

const DAY_MS = 86_400_000;

export function canAccessLesson({ course, lesson, user, enrollment, now = new Date() }: AccessInput): AccessDecision {
  if (user?.role === "admin") return { allowed: true, reason: "admin" };

  // Drafts and archived courses are never watchable by non-admins — not even
  // their free previews — so unpublishing is an immediate kill switch.
  if (course.status !== "published") return { allowed: false, reason: "unpublished" };

  if (lesson.isFreePreview) return { allowed: true, reason: "free-preview" };

  if (!user) return { allowed: false, reason: "signed-out" };
  if (!enrollment) return { allowed: false, reason: "not-enrolled" };
  if (enrollment.expiresAt && enrollment.expiresAt <= now) return { allowed: false, reason: "expired" };

  if (lesson.dripDays && lesson.dripDays > 0) {
    const unlocksAt = new Date(enrollment.enrolledAt.getTime() + lesson.dripDays * DAY_MS);
    if (unlocksAt > now) return { allowed: false, reason: "drip-locked", unlocksAt };
  }

  return { allowed: true, reason: "enrolled" };
}
