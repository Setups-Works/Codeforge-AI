import crypto from "crypto";

/**
 * Newsletter body sanitizer and one-click unsubscribe tokens.
 *
 * The body is authored by admins in a rich-text editor and delivered as email
 * HTML. Even though email clients don't execute scripts, we allowlist a small
 * set of formatting tags and drop everything else as defense-in-depth (no
 * scripts, styles, iframes, event handlers, or `javascript:` URLs).
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "a", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "span", "div", "hr",
]);

// Elements whose *content* must go too, not just the tag.
const DANGEROUS_BLOCKS = /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1>/gi;

/** True for hrefs we allow in newsletter links. */
function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u) && !/[<>"]/.test(u)) return u;
  return null;
}

/**
 * Sanitize admin-authored newsletter HTML to a safe formatting subset.
 * @param html - Raw HTML from the editor.
 * @returns Sanitized HTML safe to embed in an email body.
 */
export function sanitizeNewsletterHtml(html: string): string {
  let out = String(html ?? "");
  // 1) Remove dangerous elements along with their content.
  out = out.replace(DANGEROUS_BLOCKS, "");
  // 2) Walk every tag: keep allowlisted ones (attribute-stripped), drop the rest
  //    (their text content survives). Links keep only a validated href.
  out = out.replace(/<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_m, slash: string, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return "";
    if (slash) return `</${t}>`;
    if (t === "a") {
      const raw = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const href = raw ? (raw[2] ?? raw[3] ?? raw[4] ?? "") : "";
      const safe = safeHref(href);
      return safe
        ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">`
        : "<a>";
    }
    return `<${t}>`;
  });
  // 3) Belt-and-suspenders: strip any stray handler/URI that slipped through.
  out = out.replace(/on\w+\s*=/gi, "").replace(/javascript:/gi, "");
  return out.trim();
}

function unsubscribeSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "setups-works-newsletter";
}

/** Deterministic, unguessable token that authorizes unsubscribing `email`. */
export function unsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", unsubscribeSecret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

/** Constant-time verification of an unsubscribe token. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  if (typeof token !== "string" || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** Full one-click unsubscribe URL for the email footer. */
export function unsubscribeUrl(appUrl: string, email: string): string {
  const e = encodeURIComponent(email.trim().toLowerCase());
  return `${appUrl}/api/newsletter/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`;
}
