import { canAccessLesson, type AccessInput } from "@/lib/lms/access";

const NOW = new Date("2026-11-03T12:00:00Z");
const DAY = 86_400_000;

const base = (over: Partial<AccessInput> = {}): AccessInput => ({
  course: { status: "published" },
  lesson: { isFreePreview: false, dripDays: null },
  user: { id: "u1", role: "user" },
  enrollment: { enrolledAt: new Date(NOW.getTime() - 10 * DAY), expiresAt: null },
  now: NOW,
  ...over,
});

describe("canAccessLesson", () => {
  it("lets an enrolled user watch a published lesson", () => {
    expect(canAccessLesson(base())).toEqual({ allowed: true, reason: "enrolled" });
  });

  it("lets admins watch anything, including drafts and un-enrolled", () => {
    const d = canAccessLesson(base({ user: { id: "a", role: "admin" }, enrollment: null, course: { status: "draft" } }));
    expect(d).toEqual({ allowed: true, reason: "admin" });
  });

  it("denies signed-out viewers on paid lessons", () => {
    expect(canAccessLesson(base({ user: null, enrollment: null })).reason).toBe("signed-out");
  });

  it("denies signed-in users without an enrollment", () => {
    const d = canAccessLesson(base({ enrollment: null }));
    expect(d).toMatchObject({ allowed: false, reason: "not-enrolled" });
  });

  it("allows free-preview lessons for signed-out viewers", () => {
    const d = canAccessLesson(base({ user: null, enrollment: null, lesson: { isFreePreview: true, dripDays: null } }));
    expect(d).toEqual({ allowed: true, reason: "free-preview" });
  });

  it("treats draft and archived courses as unpublished, even for previews", () => {
    for (const status of ["draft", "archived"] as const) {
      const d = canAccessLesson(base({ course: { status }, lesson: { isFreePreview: true, dripDays: null } }));
      expect(d).toMatchObject({ allowed: false, reason: "unpublished" });
    }
  });

  it("denies an expired enrollment and allows one expiring later", () => {
    const past = new Date(NOW.getTime() - 1000);
    const future = new Date(NOW.getTime() + DAY);
    expect(canAccessLesson(base({ enrollment: { enrolledAt: past, expiresAt: past } })).reason).toBe("expired");
    expect(canAccessLesson(base({ enrollment: { enrolledAt: past, expiresAt: future } })).allowed).toBe(true);
  });

  it("locks drip lessons until enrolledAt + dripDays and reports when", () => {
    const enrolledAt = new Date(NOW.getTime() - 3 * DAY);
    const d = canAccessLesson(base({ enrollment: { enrolledAt, expiresAt: null }, lesson: { isFreePreview: false, dripDays: 7 } }));
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("drip-locked");
    expect(d.unlocksAt?.getTime()).toBe(enrolledAt.getTime() + 7 * DAY);
  });

  it("opens a drip lesson once its delay has passed", () => {
    const d = canAccessLesson(base({ lesson: { isFreePreview: false, dripDays: 5 } }));
    expect(d).toEqual({ allowed: true, reason: "enrolled" });
  });

  it("does not drip-lock free previews", () => {
    const enrolledAt = new Date(NOW.getTime() - DAY);
    const d = canAccessLesson(base({ enrollment: { enrolledAt, expiresAt: null }, lesson: { isFreePreview: true, dripDays: 30 } }));
    expect(d.reason).toBe("free-preview");
  });
});
