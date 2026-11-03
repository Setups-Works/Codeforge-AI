/** Option lists for course authoring. Edit here, not in components. */
export const COURSE_STATUSES = ["draft", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"] as const;

export const LESSON_KINDS = ["video", "text"] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export const COURSE_LIMITS = {
  title: 160,
  subtitle: 200,
  description: 20_000,
  listItems: 20,
  listItemLength: 200,
  tags: 12,
  bulkLessons: 100,
} as const;

/** Days after payment during which a course can be refunded. */
export const COURSE_REFUND_DAYS = 14;
