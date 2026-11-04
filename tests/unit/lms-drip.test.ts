import { dueDripLessons } from "@/lib/lms/drip";

const DAY = 86_400_000;
const now = new Date("2026-11-10T12:00:00Z");
const lessons = [
  { lessonId: "l3", courseId: "c1", dripDays: 3 },
  { lessonId: "l7", courseId: "c1", dripDays: 7 },
  { lessonId: "x", courseId: "c2", dripDays: 1 },
];
const enrol = (daysAgo: number, over = {}) => ({ userId: "u", courseId: "c1", enrolledAt: new Date(now.getTime() - daysAgo * DAY), expiresAt: null, ...over });

describe("dueDripLessons", () => {
  it("returns lessons that unlocked inside the window", () => {
    expect(dueDripLessons(lessons, [enrol(3.5)], now, 26).map((d) => d.lessonId)).toEqual(["l3"]);
  });
  it("skips lessons not unlocked yet or unlocked before the window", () => {
    expect(dueDripLessons(lessons, [enrol(2)], now, 26)).toEqual([]);
    expect(dueDripLessons(lessons, [enrol(5)], now, 26)).toEqual([]);
  });
  it("only considers the enrolment's own course and active enrolments", () => {
    expect(dueDripLessons(lessons, [enrol(1.2, { courseId: "c2", userId: "v" })], now, 26).map((d) => d.lessonId)).toEqual(["x"]);
    expect(dueDripLessons(lessons, [enrol(3.5, { expiresAt: new Date(now.getTime() - 1) })], now, 26)).toEqual([]);
  });
  it("ignores lessons with no drip", () => {
    expect(dueDripLessons([{ lessonId: "n", courseId: "c1", dripDays: 0 }], [enrol(10)], now, 26)).toEqual([]);
  });
});
