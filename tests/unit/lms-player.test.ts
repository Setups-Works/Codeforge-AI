import { SPEEDS, captionsToText, clamp, parseCaptionLines, resumePoint, shouldAutoComplete, stepSpeed } from "@/lib/lms/player";
import { hostAllowed, parseVideoLink, toEmbed, videoHosts } from "@/lib/lms/video";

describe("stepSpeed", () => {
  it("moves one step and stops at the ends", () => {
    expect(stepSpeed(1, 1)).toBe(1.25);
    expect(stepSpeed(1, -1)).toBe(0.75);
    expect(stepSpeed(2, 1)).toBe(2);
    expect(stepSpeed(0.5, -1)).toBe(0.5);
  });
  it("snaps an unknown speed to the nearest step first", () => {
    expect(stepSpeed(1.1, 1)).toBe(1.25);
    expect(SPEEDS).toContain(stepSpeed(3, -1));
  });
});

describe("watch tracking", () => {
  it("auto-completes at 90% and never without a duration", () => {
    expect(shouldAutoComplete(90, 100)).toBe(true);
    expect(shouldAutoComplete(89, 100)).toBe(false);
    expect(shouldAutoComplete(500, 0)).toBe(false);
  });
  it("resumes mid-video, but restarts when barely started or nearly finished", () => {
    expect(resumePoint(120.7, 600)).toBe(120);
    expect(resumePoint(3, 600)).toBe(0);
    expect(resumePoint(595, 600)).toBe(0);
    expect(resumePoint(50, 0)).toBe(50);
  });
  it("clamps", () => {
    expect([clamp(5, 0, 3), clamp(-1, 0, 3), clamp(2, 0, 3)]).toEqual([3, 0, 2]);
  });
});

describe("video hosts and links", () => {
  const OLD = process.env.NEXT_PUBLIC_VIDEO_HOSTS;
  afterEach(() => { process.env.NEXT_PUBLIC_VIDEO_HOSTS = OLD; });

  it("matches exact and wildcard hosts, never a lookalike", () => {
    const hosts = videoHosts("cdn.example.com, *.b-cdn.net");
    expect(hostAllowed("cdn.example.com", hosts)).toBe(true);
    expect(hostAllowed("videos.b-cdn.net", hosts)).toBe(true);
    expect(hostAllowed("b-cdn.net", hosts)).toBe(false);
    expect(hostAllowed("cdn.example.com.evil.io", hosts)).toBe(false);
    expect(hostAllowed("evilb-cdn.net", hosts)).toBe(false);
  });

  it("accepts a direct video file only on an allowed host over https", () => {
    process.env.NEXT_PUBLIC_VIDEO_HOSTS = "cdn.example.com";
    expect(parseVideoLink("https://cdn.example.com/v/intro.mp4")).toEqual({ provider: "file", ref: "https://cdn.example.com/v/intro.mp4" });
    expect(parseVideoLink("https://cdn.example.com/v/intro.webm?token=abc")?.provider).toBe("file");
    for (const bad of ["http://cdn.example.com/a.mp4", "https://other.com/a.mp4", "https://cdn.example.com/a.exe", "https://user:pw@cdn.example.com/a.mp4", "javascript:alert(1)"]) {
      expect(parseVideoLink(bad)).toBeNull();
    }
  });

  it("is disabled until hosts are configured, while Drive keeps working", () => {
    process.env.NEXT_PUBLIC_VIDEO_HOSTS = "";
    expect(parseVideoLink("https://cdn.example.com/a.mp4")).toBeNull();
    expect(parseVideoLink("https://drive.google.com/file/d/1kMc6pw5laK8fXl7JKG_PbYNdKzyODW4N/view")?.provider).toBe("drive");
  });

  it("builds a video embed with captions for file videos and an iframe for Drive", () => {
    const captions = [{ label: "English", lang: "en", url: "https://cdn.example.com/a.vtt" }];
    expect(toEmbed({ provider: "file", ref: "https://cdn.example.com/a.mp4", captions })).toEqual({ kind: "video", src: "https://cdn.example.com/a.mp4", mime: "video/mp4", captions });
    expect(toEmbed({ provider: "drive", ref: "1kMc6pw5laK8fXl7JKG_PbYNdKzyODW4N" }).kind).toBe("iframe");
  });
});

describe("caption lines", () => {
  const OLD = process.env.NEXT_PUBLIC_VIDEO_HOSTS;
  beforeAll(() => { process.env.NEXT_PUBLIC_VIDEO_HOSTS = "cdn.example.com"; });
  afterAll(() => { process.env.NEXT_PUBLIC_VIDEO_HOSTS = OLD; });

  it("parses good lines and reports each bad one", () => {
    const { captions, errors } = parseCaptionLines("English | en | https://cdn.example.com/en.vtt\nTamil | ta | https://cdn.example.com/ta.vtt\nBad | english | https://cdn.example.com/x.vtt\nNo host | en | https://evil.com/a.vtt\nNo url | en");
    expect(captions.map((c) => c.lang)).toEqual(["en", "ta"]);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/Line 3/);
  });
  it("round-trips through text", () => {
    const { captions } = parseCaptionLines("English | en | https://cdn.example.com/en.vtt");
    expect(parseCaptionLines(captionsToText(captions)).captions).toEqual(captions);
  });
});
