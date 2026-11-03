import { parseDriveLink, toEmbed } from "@/lib/lms/video";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("parseDriveLink", () => {
  it.each([
    ["view link", `https://drive.google.com/file/d/${ID}/view?usp=sharing`],
    ["preview link", `https://drive.google.com/file/d/${ID}/preview`],
    ["edit link", `https://drive.google.com/file/d/${ID}/edit`],
    ["multi-account link", `https://drive.google.com/file/u/1/d/${ID}/view`],
    ["open?id", `https://drive.google.com/open?id=${ID}`],
    ["uc?id download", `https://drive.google.com/uc?export=download&id=${ID}`],
    ["docs host", `https://docs.google.com/file/d/${ID}/edit`],
    ["bare id", ID],
    ["id with whitespace", `  ${ID}\n`],
  ])("extracts the file id from a %s", (_label, input) => {
    expect(parseDriveLink(input)).toEqual({ provider: "drive", ref: ID });
  });

  it.each([
    ["empty", ""],
    ["folder", `https://drive.google.com/drive/folders/${ID}`],
    ["non-Drive host", `https://evil.example.com/file/d/${ID}/view`],
    ["lookalike host", `https://drive.google.com.evil.example/file/d/${ID}/view`],
    ["http", `http://drive.google.com/file/d/${ID}/view`],
    ["YouTube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["short word", "hello"],
    ["id too short", "https://drive.google.com/file/d/abc/view"],
    ["javascript url", "javascript:alert(1)"],
  ])("rejects %s", (_label, input) => {
    expect(parseDriveLink(input)).toBeNull();
  });
});

describe("toEmbed", () => {
  it("builds the Drive preview iframe from a stored ref", () => {
    const embed = toEmbed({ provider: "drive", ref: ID });
    expect(embed.kind).toBe("iframe");
    expect(embed.src).toBe(`https://drive.google.com/file/d/${ID}/preview`);
  });
});
