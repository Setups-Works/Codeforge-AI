import { formatTimestamp, parseTimestamp, publicName } from "@/lib/lms/format";
import { generateCertificateCode, normalizeCertificateCode } from "@/lib/lms/certificate";
import { noteSchema, questionSchema, reviewSchema } from "@/schemas/course";

describe("publicName", () => {
  it.each([["Asha Rao", "Asha R."], ["asha", "asha"], ["  Mary  Ann  Smith ", "Mary S."], ["", "Learner"], [null, "Learner"]])("%j -> %s", (i, o) => {
    expect(publicName(i as string | null)).toBe(o);
  });
});

describe("timestamps", () => {
  it.each([[0, "0:00"], [5, "0:05"], [125, "2:05"], [3725, "1:02:05"]])("formats %s", (s, out) => expect(formatTimestamp(s)).toBe(out));
  it.each([["2:05", 125], ["1:02:05", 3725], ["90", 90], ["0:00", 0], [" 3:00 ", 180]])("parses %j", (i, out) => expect(parseTimestamp(i)).toBe(out));
  it.each([["", null], ["abc", null], ["1:75", null], ["1:99:00", null], ["-5", null], ["1:2", null]])("rejects %j", (i, out) => expect(parseTimestamp(i)).toBe(out));
});

describe("certificate codes", () => {
  it("generates well-formed, unique codes", () => {
    const codes = new Set(Array.from({ length: 200 }, generateCertificateCode));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(normalizeCertificateCode(c)).toBe(c);
  });
  it("normalises case and whitespace, rejects junk", () => {
    const c = generateCertificateCode();
    expect(normalizeCertificateCode(` ${c.toLowerCase()} `)).toBe(c);
    expect(normalizeCertificateCode("SW-1111-2222-3333")).toBeNull(); // 1 is not in the alphabet
    expect(normalizeCertificateCode("nope")).toBeNull();
    expect(normalizeCertificateCode("")).toBeNull();
  });
});

describe("engagement schemas", () => {
  it("only accepts ratings 1-5", () => {
    for (const r of [0, 6, 2.5]) expect(reviewSchema.safeParse({ rating: r }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, body: "Great" }).success).toBe(true);
  });
  it("rejects empty notes/questions and unknown fields", () => {
    const id = "0b9f7c5e-3b1a-4c1e-9a55-6d1f2b8a4c10";
    expect(noteSchema.safeParse({ lessonId: id, body: "  " }).success).toBe(false);
    expect(noteSchema.safeParse({ lessonId: id, body: "x", atSeconds: -1 }).success).toBe(false);
    expect(questionSchema.safeParse({ lessonId: id, body: "why?", isStaff: true }).success).toBe(false);
    expect(questionSchema.safeParse({ lessonId: id, body: "why?" }).success).toBe(true);
  });
});
