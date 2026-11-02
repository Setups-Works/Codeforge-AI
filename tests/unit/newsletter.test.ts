import {
  sanitizeNewsletterHtml,
  unsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
} from "@/lib/newsletter";
import { newsletterEmailHtml } from "@/lib/email-templates";

describe("sanitizeNewsletterHtml", () => {
  it("keeps allowlisted formatting tags", () => {
    const out = sanitizeNewsletterHtml("<p>Hi <strong>there</strong> and <em>welcome</em></p>");
    expect(out).toBe("<p>Hi <strong>there</strong> and <em>welcome</em></p>");
  });

  it("drops <script> along with its content", () => {
    const out = sanitizeNewsletterHtml("<p>ok</p><script>alert(1)</script>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>ok</p>");
  });

  it("unwraps disallowed tags but keeps their text", () => {
    expect(sanitizeNewsletterHtml("<marquee>hello</marquee>")).toBe("hello");
    expect(sanitizeNewsletterHtml('<img src=x onerror=alert(1)>caption')).toBe("caption");
  });

  it("strips event handlers and javascript: URLs", () => {
    const out = sanitizeNewsletterHtml('<a href="javascript:alert(1)" onclick="x()">link</a>');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("onclick");
    expect(out).toContain(">link</a>");
  });

  it("keeps only safe hrefs on links, with rel/target added", () => {
    const ok = sanitizeNewsletterHtml('<a href="https://labs.setups.works">go</a>');
    expect(ok).toContain('href="https://labs.setups.works"');
    expect(ok).toContain('rel="noopener noreferrer"');
    const bad = sanitizeNewsletterHtml('<a href="data:text/html,evil">x</a>');
    expect(bad).toBe("<a>x</a>");
  });
});

describe("unsubscribe tokens", () => {
  it("verifies its own token and rejects tampering", () => {
    const t = unsubscribeToken("user@example.com");
    expect(verifyUnsubscribeToken("user@example.com", t)).toBe(true);
    expect(verifyUnsubscribeToken("user@example.com", t.slice(0, -1) + "0")).toBe(false);
    expect(verifyUnsubscribeToken("other@example.com", t)).toBe(false);
  });

  it("is case- and whitespace-insensitive on the email", () => {
    const t = unsubscribeToken("User@Example.com");
    expect(verifyUnsubscribeToken("  user@example.com ", t)).toBe(true);
  });

  it("builds a URL carrying the email and token", () => {
    const url = unsubscribeUrl("https://labs.setups.works", "user@example.com");
    expect(url).toContain("/api/newsletter/unsubscribe?e=user%40example.com&t=");
  });
});

describe("newsletterEmailHtml", () => {
  it("embeds image, heading, body, CTA and unsubscribe link", () => {
    const html = newsletterEmailHtml({
      heading: "Big news",
      bodyHtml: "<p>Body copy</p>",
      imageUrl: "https://cdn.example/x.png",
      ctaLabel: "Open app",
      ctaUrl: "https://labs.setups.works",
      unsubscribeUrl: "https://labs.setups.works/api/newsletter/unsubscribe?e=a&t=b",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("https://cdn.example/x.png");
    expect(html).toContain("Big news");
    expect(html).toContain("<p>Body copy</p>");
    expect(html).toContain("Open app");
    expect(html).toContain("Unsubscribe");
  });

  it("omits the CTA when no label is given", () => {
    const html = newsletterEmailHtml({
      bodyHtml: "<p>x</p>",
      unsubscribeUrl: "u",
    });
    expect(html).not.toContain("target=\"_blank\"\n           style"); // no button block
    expect(html).toContain("<p>x</p>");
  });
});
