import { discountPercent, formatDuration, pluralize } from "@/lib/lms/format";

describe("formatDuration", () => {
  it.each([
    [0, ""],
    [30, "30s"],
    [60, "1m"],
    [2700, "45m"],
    [3600, "1h"],
    [4800, "1h 20m"],
    [-5, ""],
  ])("%s seconds -> %j", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe("discountPercent", () => {
  it("computes the percent saved", () => {
    expect(discountPercent(499, 999)).toBe(50);
  });
  it("is 0 without a higher compare-at price", () => {
    expect(discountPercent(499, null)).toBe(0);
    expect(discountPercent(499, 499)).toBe(0);
    expect(discountPercent(499, 100)).toBe(0);
  });
});

describe("pluralize", () => {
  it("uses the singular only for exactly one", () => {
    expect(pluralize(1, "lesson")).toBe("1 lesson");
    expect(pluralize(0, "lesson")).toBe("0 lessons");
    expect(pluralize(5, "lesson")).toBe("5 lessons");
  });
});
