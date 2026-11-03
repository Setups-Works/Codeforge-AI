import { courseGraph, courseKeywords, courseListGraph, isoDuration, primaryNav } from "@/lib/seo";
import type { CourseDetail } from "@/services/lms-catalog";

const course = (over: Partial<CourseDetail> = {}): CourseDetail => ({
  id: "c1", slug: "dsa-masterclass", title: "DSA Masterclass", subtitle: "Crack interviews", thumbnailUrl: "https://img.example/t.png",
  level: "Intermediate", category: "Algorithms", language: "en", priceInr: 499, compareAtInr: 999, isFree: false,
  instructorName: "Asha Rao", lessonCount: 2, durationS: 4800, students: 12, ratingAvg: null, ratingCount: 0,
  status: "published", description: "# Learn\nSolve **hard** problems.", tags: ["arrays", "graphs"], outcomes: ["Solve DP"], requirements: ["Basic coding"],
  instructorBio: "Engineer", instructorImage: null, hasPromo: true, seoTitle: null, seoDescription: null, seoKeywords: "dsa course india",
  updatedAt: "2026-11-01T00:00:00.000Z",
  sections: [{ id: "s1", title: "Basics", lessons: [{ id: "l1", title: "Arrays", kind: "video", durationS: 600, isFreePreview: true }, { id: "l2", title: "Hashing", kind: "video", durationS: 900, isFreePreview: false }] }],
  ...over,
});

const find = (g: ReturnType<typeof courseGraph>, type: string) => (g["@graph"] as Record<string, unknown>[]).find((n) => n["@type"] === type) as Record<string, any>;

describe("isoDuration", () => {
  it.each([[0, null], [-1, null], [45, "PT45S"], [60, "PT1M"], [3600, "PT1H"], [4800, "PT1H20M"]])("%s -> %s", (s, out) => {
    expect(isoDuration(s)).toBe(out);
  });
});

describe("courseGraph", () => {
  it("emits a Course with a priced Offer, syllabus, instructor and breadcrumb", () => {
    const g = courseGraph(course());
    const c = find(g, "Course");
    expect(c.name).toBe("DSA Masterclass");
    expect(c.offers).toMatchObject({ price: "499", priceCurrency: "INR", category: "Paid" });
    expect(c.timeRequired).toBe("PT1H20M");
    expect(c.syllabusSections[0]).toMatchObject({ name: "Basics", description: "Arrays; Hashing" });
    expect(c.hasCourseInstance).toMatchObject({ courseMode: "online", instructor: { name: "Asha Rao" } });
    expect(c.teaches).toEqual(["Solve DP"]);
    expect(find(g, "BreadcrumbList").itemListElement.map((i: any) => i.name)).toEqual(["Home", "Courses", "DSA Masterclass"]);
  });

  it("only includes AggregateRating when real reviews exist", () => {
    expect(find(courseGraph(course()), "Course").aggregateRating).toBeUndefined();
    const rated = find(courseGraph(course({ ratingAvg: 4.6, ratingCount: 20 })), "Course");
    expect(rated.aggregateRating).toMatchObject({ ratingValue: 4.6, ratingCount: 20 });
  });

  it("adds Review nodes only alongside real ratings", () => {
    const reviews = [{ authorName: "Asha R.", rating: 5, body: "Great", createdAt: new Date("2026-10-01T00:00:00Z") }];
    expect(find(courseGraph(course(), reviews), "Course").review).toBeUndefined(); // no ratingCount yet
    const rated = find(courseGraph(course({ ratingAvg: 5, ratingCount: 1 }), reviews), "Course");
    expect(rated.review[0]).toMatchObject({ author: { name: "Asha R." }, reviewRating: { ratingValue: 5 }, reviewBody: "Great" });
  });

  it("marks free courses as free", () => {
    const c = find(courseGraph(course({ isFree: true, priceInr: 0, compareAtInr: null })), "Course");
    expect(c.isAccessibleForFree).toBe(true);
    expect(c.offers).toMatchObject({ price: "0", category: "Free" });
  });

  it("never serialises anything resembling a video reference", () => {
    const json = JSON.stringify(courseGraph(course()));
    expect(json).not.toMatch(/drive\.google|"video"|promo/i);
  });

  it("strips markdown from the description", () => {
    expect(find(courseGraph(course()), "Course").description).toBe("Learn Solve hard problems.");
  });
});

describe("courseKeywords", () => {
  it("merges admin keywords, title variants, topic and tags without duplicates", () => {
    const kw = courseKeywords(course());
    expect(kw).toEqual(expect.arrayContaining(["dsa course india", "DSA Masterclass course", "Algorithms course", "arrays course", "online course"]));
    expect(new Set(kw.map((k) => k.toLowerCase())).size).toBe(kw.length);
  });
});

describe("courseListGraph", () => {
  it("builds a CollectionPage with an ItemList of the courses", () => {
    const g = courseListGraph([{ ...course(), sections: undefined } as never], 7);
    const list = (g["@graph"] as Record<string, any>[]).find((n) => n["@type"] === "ItemList")!;
    expect(list.numberOfItems).toBe(7);
    expect(list.itemListElement[0].url).toBe("https://labs.setups.works/courses/dsa-masterclass");
  });
});

describe("primaryNav", () => {
  const OLD = process.env.NEXT_PUBLIC_LMS_ENABLED;
  afterEach(() => { process.env.NEXT_PUBLIC_LMS_ENABLED = OLD; });
  it("adds Courses only when the LMS is enabled", () => {
    process.env.NEXT_PUBLIC_LMS_ENABLED = "false";
    expect(primaryNav().some((n) => n.url === "/courses")).toBe(false);
    process.env.NEXT_PUBLIC_LMS_ENABLED = "true";
    expect(primaryNav().some((n) => n.url === "/courses")).toBe(true);
  });
});
