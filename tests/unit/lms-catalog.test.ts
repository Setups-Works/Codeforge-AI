import { sanitizeSearch } from "@/services/lms-catalog";

describe("sanitizeSearch", () => {
  it("removes characters that break PostgREST or() filters and act as wildcards", () => {
    expect(sanitizeSearch("a,b)(c%d*e_f")).toBe("a b c d e f");
    expect(sanitizeSearch(`x"y'z\\`)).toBe("x y z");
  });
  it("collapses whitespace and caps the length", () => {
    expect(sanitizeSearch("  data   structures ")).toBe("data structures");
    expect(sanitizeSearch("a".repeat(200))).toHaveLength(80);
  });
  it("cannot smuggle a second filter clause", () => {
    expect(sanitizeSearch("x,is_free.eq.true")).not.toContain(",");
  });
});
