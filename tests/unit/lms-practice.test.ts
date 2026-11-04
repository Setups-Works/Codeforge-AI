import { canAccessLesson, computeGatedIds } from "@/lib/lms/access";
import { gradeQuiz, validateQuiz } from "@/lib/lms/quiz";

describe("computeGatedIds", () => {
  const lessons = (gates: boolean[]) => gates.map((g, i) => ({ id: `l${i}`, gateNext: g }));
  it("locks everything after the first unfinished gate, not the gate itself", () => {
    expect([...computeGatedIds(lessons([false, true, false, true, false]), new Set(["l0"]))]).toEqual(["l2", "l3", "l4"]);
  });
  it("opens lessons once the gate is completed, up to the next gate", () => {
    expect([...computeGatedIds(lessons([false, true, false, true, false]), new Set(["l1"]))]).toEqual(["l4"]);
  });
  it("locks nothing when there are no gates or all are done", () => {
    expect(computeGatedIds(lessons([false, false]), new Set()).size).toBe(0);
    expect(computeGatedIds(lessons([true, true]), new Set(["l0", "l1"])).size).toBe(0);
  });
});

describe("canAccessLesson gating", () => {
  const base = {
    course: { status: "published" as const },
    lesson: { isFreePreview: false, dripDays: null },
    user: { id: "u", role: "user" },
    enrollment: { enrolledAt: new Date("2026-01-01"), expiresAt: null },
  };
  it("denies a gated lesson for a learner", () => {
    expect(canAccessLesson({ ...base, gated: true })).toEqual({ allowed: false, reason: "gated" });
  });
  it("never gates admins or free previews", () => {
    expect(canAccessLesson({ ...base, user: { id: "a", role: "admin" }, gated: true }).allowed).toBe(true);
    expect(canAccessLesson({ ...base, lesson: { isFreePreview: true, dripDays: null }, gated: true }).reason).toBe("free-preview");
  });
});

describe("gradeQuiz", () => {
  const qs = [{ correctIndex: 1, optionCount: 3 }, { correctIndex: 0, optionCount: 2 }, { correctIndex: 2, optionCount: 4 }];
  it("scores answers and applies the pass mark", () => {
    expect(gradeQuiz(qs, [1, 0, 2], 70)).toMatchObject({ score: 3, percent: 100, passed: true, correct: [true, true, true] });
    expect(gradeQuiz(qs, [1, 0, 0], 70)).toMatchObject({ score: 2, percent: 67, passed: false });
    expect(gradeQuiz(qs, [1, 0, 0], 67).passed).toBe(true);
  });
  it("treats missing, out-of-range and non-integer answers as wrong", () => {
    expect(gradeQuiz(qs, [null, 5, 1.5], 0).correct).toEqual([false, false, false]);
    expect(gradeQuiz(qs, [], 70).score).toBe(0);
  });
  it("never passes an empty quiz", () => {
    expect(gradeQuiz([], [], 1).passed).toBe(false);
  });
});

describe("validateQuiz", () => {
  const ok = { prompt: "2+2?", options: ["3", "4"], correctIndex: 1 };
  it("accepts a well-formed quiz", () => expect(validateQuiz([ok])).toBeNull());
  it.each([
    [[], /at least one/],
    [[{ ...ok, prompt: " " }], /prompt/],
    [[{ ...ok, options: ["only"] }], /options/],
    [[{ ...ok, options: ["a", " "] }], /empty option/],
    [[{ ...ok, options: ["a", "A"] }], /duplicate/],
    [[{ ...ok, correctIndex: 2 }], /correct answer/],
    [[{ ...ok, correctIndex: -1 }], /correct answer/],
  ])("rejects %j", (qs, msg) => expect(validateQuiz(qs as never)).toMatch(msg as RegExp));
});
