import { coursePatchSchema, lessonBulkSchema, lessonCreateSchema, reorderSchema } from "@/schemas/course";

const UUID = "0b9f7c5e-3b1a-4c1e-9a55-6d1f2b8a4c10";

describe("coursePatchSchema", () => {
  it("accepts a partial update", () => {
    expect(coursePatchSchema.safeParse({ title: "DSA Masterclass", priceInr: 499 }).success).toBe(true);
  });

  it("rejects unknown fields so clients can't write protected columns", () => {
    expect(coursePatchSchema.safeParse({ stats: { students: 9999 } }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ createdBy: "x" }).success).toBe(false);
  });

  it("rejects negative or fractional prices and bad slugs", () => {
    expect(coursePatchSchema.safeParse({ priceInr: -1 }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ priceInr: 9.5 }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ slug: "Not A Slug" }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ slug: "good-slug-1" }).success).toBe(true);
  });

  it("only allows known statuses and levels", () => {
    expect(coursePatchSchema.safeParse({ status: "live" }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ level: "Wizard" }).success).toBe(false);
  });
});

describe("lesson schemas", () => {
  it("requires a section id on create", () => {
    expect(lessonCreateSchema.safeParse({ title: "Intro" }).success).toBe(false);
    expect(lessonCreateSchema.safeParse({ title: "Intro", sectionId: UUID }).success).toBe(true);
  });

  it("caps bulk imports", () => {
    const entries = Array.from({ length: 101 }, () => "x");
    expect(lessonBulkSchema.safeParse({ sectionId: UUID, entries }).success).toBe(false);
    expect(lessonBulkSchema.safeParse({ sectionId: UUID, entries: [] }).success).toBe(false);
  });
});

describe("reorderSchema", () => {
  it("requires uuids and a section for lesson reorders", () => {
    expect(reorderSchema.safeParse({ type: "sections", ids: [UUID] }).success).toBe(true);
    expect(reorderSchema.safeParse({ type: "lessons", ids: [UUID] }).success).toBe(false);
    expect(reorderSchema.safeParse({ type: "sections", ids: ["nope"] }).success).toBe(false);
  });
});
