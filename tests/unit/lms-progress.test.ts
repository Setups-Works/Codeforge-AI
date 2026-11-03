import { summarize } from "@/services/lms-learn";

describe("summarize", () => {
  it("computes percent complete", () => {
    expect(summarize(["a", "b"], 4)).toMatchObject({ completed: 2, total: 4, percent: 50 });
  });
  it("is 0% for a course with no lessons", () => {
    expect(summarize([], 0)).toMatchObject({ completed: 0, total: 0, percent: 0 });
  });
  it("never reports more completed lessons than exist (e.g. after a lesson is deleted)", () => {
    expect(summarize(["a", "b", "c"], 2)).toMatchObject({ completed: 2, total: 2, percent: 100 });
  });
  it("rounds to a whole percent", () => {
    expect(summarize(["a"], 3).percent).toBe(33);
  });
});
