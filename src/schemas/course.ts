import { z } from "zod";
import { COURSE_LEVELS, COURSE_LIMITS, COURSE_STATUSES, LESSON_KINDS } from "@/lib/lms/constants";

const L = COURSE_LIMITS;
const list = z.array(z.string().trim().min(1).max(L.listItemLength)).max(L.listItems);

export const courseCreateSchema = z.object({
  title: z.string().trim().min(3).max(L.title),
});

export const coursePatchSchema = z
  .object({
    title: z.string().trim().min(3).max(L.title),
    slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only"),
    subtitle: z.string().trim().max(L.subtitle).nullable(),
    description: z.string().max(L.description),
    thumbnailUrl: z.string().trim().url().max(1000).nullable(),
    promoVideoUrl: z.string().trim().max(1000).nullable(),
    level: z.enum(COURSE_LEVELS).nullable(),
    language: z.string().trim().min(2).max(10),
    category: z.string().trim().max(60).nullable(),
    tags: z.array(z.string().trim().min(1).max(40)).max(L.tags),
    priceInr: z.number().int().min(0).max(10_000_000),
    compareAtInr: z.number().int().min(0).max(10_000_000).nullable(),
    isFree: z.boolean(),
    status: z.enum(COURSE_STATUSES),
    instructorName: z.string().trim().max(120).nullable(),
    instructorBio: z.string().trim().max(2000).nullable(),
    instructorImage: z.string().trim().url().max(1000).nullable(),
    outcomes: list,
    requirements: list,
    seoTitle: z.string().trim().max(70).nullable(),
    seoDescription: z.string().trim().max(200).nullable(),
    seoKeywords: z.string().trim().max(300).nullable(),
  })
  .partial()
  .strict();

export type CoursePatch = z.infer<typeof coursePatchSchema>;

const lessonFields = {
  title: z.string().trim().min(1).max(L.title),
  kind: z.enum(LESSON_KINDS),
  /** Share link or bare id; empty string clears the video. */
  videoUrl: z.string().trim().max(1000),
  durationMin: z.number().min(0).max(1000),
  bodyMd: z.string().max(L.description).nullable(),
  isFreePreview: z.boolean(),
  dripDays: z.number().int().min(0).max(3650).nullable(),
};

export const lessonCreateSchema = z
  .object({ sectionId: z.uuid() })
  .extend({ ...lessonFields })
  .partial({ kind: true, videoUrl: true, durationMin: true, bodyMd: true, isFreePreview: true, dripDays: true })
  .strict();

export const lessonPatchSchema = z
  .object({ ...lessonFields, sectionId: z.uuid() })
  .partial()
  .strict();

/** Bulk import: each entry is a Drive link, optionally titled ("Title | link"). */
export const lessonBulkSchema = z
  .object({
    sectionId: z.uuid(),
    entries: z.array(z.string().trim().min(1).max(1200)).min(1).max(L.bulkLessons),
  })
  .strict();

export const sectionSchema = z.object({ title: z.string().trim().min(1).max(L.title) }).strict();

export const reorderSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sections"), ids: z.array(z.uuid()).min(1).max(200) }),
  z.object({ type: z.literal("lessons"), sectionId: z.uuid(), ids: z.array(z.uuid()).min(1).max(500) }),
]);
