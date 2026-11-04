import { planCoversCourse } from "@/lib/lms/growth";

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

describe("planCoversCourse", () => {
  it("covers a course when the active plan is listed", () => {
    expect(planCoversCourse("plus", future, ["plus"])).toBe(true);
    expect(planCoversCourse("go", null, ["go", "plus"])).toBe(true);
  });
  it("does not cover free users, unlisted plans or empty lists", () => {
    expect(planCoversCourse("free", null, ["plus"])).toBe(false);
    expect(planCoversCourse(null, null, ["plus"])).toBe(false);
    expect(planCoversCourse("go", future, ["plus"])).toBe(false);
    expect(planCoversCourse("plus", future, [])).toBe(false);
  });
  it("stops covering once the plan has expired", () => {
    expect(planCoversCourse("plus", past, ["plus"])).toBe(false);
  });
});
