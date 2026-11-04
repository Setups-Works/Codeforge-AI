export interface DripLesson {
  lessonId: string;
  courseId: string;
  dripDays: number;
}

export interface DripEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: Date;
  expiresAt: Date | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * (user, lesson) pairs whose drip delay elapsed within the last `windowHours`,
 * for enrolments that are still active. Pure, so the schedule logic is tested
 * without a database; the sender de-duplicates across overlapping windows.
 */
export function dueDripLessons(
  lessons: DripLesson[],
  enrollments: DripEnrollment[],
  now: Date,
  windowHours: number,
): { userId: string; courseId: string; lessonId: string }[] {
  const out: { userId: string; courseId: string; lessonId: string }[] = [];
  for (const e of enrollments) {
    if (e.expiresAt && e.expiresAt <= now) continue;
    for (const l of lessons) {
      if (l.courseId !== e.courseId || l.dripDays <= 0) continue;
      const unlockedAt = e.enrolledAt.getTime() + l.dripDays * DAY;
      if (unlockedAt <= now.getTime() && unlockedAt > now.getTime() - windowHours * HOUR) {
        out.push({ userId: e.userId, courseId: e.courseId, lessonId: l.lessonId });
      }
    }
  }
  return out;
}
