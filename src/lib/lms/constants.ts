/** Option lists for course authoring. Edit here, not in components. */
export const COURSE_STATUSES = ["draft", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"] as const;

export const LESSON_KINDS = ["video", "text", "problem", "quiz"] as const;
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

/** Learning XP. Awarded once per lesson / course, never again on undo + redo. */
export const XP_LESSON_COMPLETE = 5;
export const XP_COURSE_COMPLETE = 50;

export const QUIZ_LIMITS = {
  questions: 50,
  options: { min: 2, max: 6 },
  prompt: 1000,
  option: 300,
  explanation: 1000,
} as const;

export const DEFAULT_PASS_PERCENT = 70;
