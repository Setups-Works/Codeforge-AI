import { parseBulkEntry } from "@/services/lms-courses";

describe("parseBulkEntry", () => {
  it("splits an explicit title from the link", () => {
    expect(parseBulkEntry("Intro | https://drive.google.com/file/d/x/view", 1)).toEqual({
      title: "Intro",
      link: "https://drive.google.com/file/d/x/view",
    });
  });

  it("falls back to a numbered title for a bare link", () => {
    expect(parseBulkEntry("https://drive.google.com/file/d/x/view", 3)).toEqual({
      title: "Lesson 3",
      link: "https://drive.google.com/file/d/x/view",
    });
  });

  it("keeps pipes inside the title and uses the last one as the separator", () => {
    expect(parseBulkEntry("A | B | link", 1)).toEqual({ title: "A | B", link: "link" });
  });

  it("uses the fallback title when the title part is blank", () => {
    expect(parseBulkEntry(" | link", 2).title).toBe("Lesson 2");
  });
});
