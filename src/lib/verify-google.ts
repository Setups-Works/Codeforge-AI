import { promises as dns } from "node:dns";

/**
 * Verifies that a request genuinely came from Google.
 *
 * The user-agent string proves nothing — anyone can send
 * "Googlebot/2.1". Google publishes two ways to check, and this implements
 * both:
 *
 *   1. Reverse-then-forward DNS. Resolve the IP to a hostname, confirm it sits
 *      under a Google domain, then resolve that hostname back and confirm it
 *      returns the original IP. The second step is what defeats spoofing — a
 *      forged PTR record is easy, but the attacker cannot also control
 *      Google's forward DNS.
 *   2. Matching the IP against Google's published CIDR ranges.
 *
 * DNS is authoritative but costs a lookup; the range list is fast but needs
 * refreshing. `verifyGoogleRequest` tries the ranges first and falls back to
 * DNS, so a stale cache can't produce a false negative.
 *
 * Docs: developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests
 */

/** Hostnames Google serves crawler PTR records under. */
const GOOGLE_DOMAINS = [".googlebot.com", ".google.com", ".googleusercontent.com"];

const RANGE_FILES = {
  /** Googlebot and the other common crawlers. */
  common: "https://developers.google.com/static/crawling/ipranges/common-crawlers.json",
  /** AdsBot and friends, which can ignore the wildcard robots.txt group. */
  special: "https://developers.google.com/static/crawling/ipranges/special-crawlers.json",
  /** Fetches a user action triggered, e.g. Site Verifier. */
  userTriggered:
    "https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers.json",
} as const;

export type GoogleRangeSet = keyof typeof RANGE_FILES;

export interface Prefix {
  ipv4Prefix?: string;
  ipv6Prefix?: string;
}

// Ranges change rarely; a day is well inside Google's own update cadence and
// keeps this to a single fetch per deployment per day.
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<GoogleRangeSet, { at: number; prefixes: Prefix[] }>();

async function getPrefixes(set: GoogleRangeSet): Promise<Prefix[]> {
  const hit = cache.get(set);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.prefixes;

  const res = await fetch(RANGE_FILES[set], { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not fetch ${set} ranges (${res.status})`);
  const json = (await res.json()) as { prefixes?: Prefix[] };
  const prefixes = json.prefixes ?? [];
  cache.set(set, { at: Date.now(), prefixes });
  return prefixes;
}

/* ----------------------------- CIDR matching ---------------------------- */

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
};

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(range);
  if (a === null || b === null || !Number.isInteger(bits)) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

/** Expand an IPv6 address to 8 fixed-width hextets so prefixes can be compared. */
function expandIpv6(ip: string): string | null {
  const plain = ip.replace(/^\[|\]$/g, "").split("%")[0];
  if (!plain.includes(":")) return null;
  const [head, tail] = plain.split("::");
  const h = head ? head.split(":").filter(Boolean) : [];
  const t = tail ? tail.split(":").filter(Boolean) : [];
  if (plain.includes("::")) {
    const fill = 8 - h.length - t.length;
    if (fill < 0) return null;
    return [...h, ...Array(fill).fill("0"), ...t]
      .map((x) => x.padStart(4, "0"))
      .join("");
  }
  const parts = plain.split(":");
  if (parts.length !== 8) return null;
  return parts.map((x) => x.padStart(4, "0")).join("");
}

function ipv6InCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const a = expandIpv6(ip);
  const b = expandIpv6(range);
  if (!a || !b || !Number.isInteger(bits)) return false;
  // Compare bit-by-bit over the prefix length, working in 4-bit nibbles.
  const fullNibbles = Math.floor(bits / 4);
  if (a.slice(0, fullNibbles) !== b.slice(0, fullNibbles)) return false;
  const rem = bits % 4;
  if (rem === 0) return true;
  const mask = (0xf << (4 - rem)) & 0xf;
  return (
    (parseInt(a[fullNibbles], 16) & mask) === (parseInt(b[fullNibbles], 16) & mask)
  );
}

/**
 * Is `ip` inside any of `prefixes`?
 *
 * Exported because Google is no longer the only publisher we check — OpenAI,
 * Anthropic and Perplexity all publish crawler ranges in this exact shape, so
 * verify-crawler.ts reuses this rather than reimplementing CIDR maths.
 */
export function ipInPrefixes(ip: string, prefixes: Prefix[]): boolean {
  const v6 = ip.includes(":");
  return prefixes.some((p) =>
    v6
      ? p.ipv6Prefix
        ? ipv6InCidr(ip, p.ipv6Prefix)
        : false
      : p.ipv4Prefix
        ? ipv4InCidr(ip, p.ipv4Prefix)
        : false,
  );
}

/** Is `ip` inside one of Google's published ranges for `set`? */
export async function isGoogleIp(
  ip: string,
  set: GoogleRangeSet = "common",
): Promise<boolean> {
  return ipInPrefixes(ip, await getPrefixes(set));
}

/* ------------------------------- DNS check ------------------------------ */

/**
 * Reverse-then-forward DNS check. Slower than the range list but authoritative,
 * and it needs no local data to stay current.
 */
export async function isGoogleByDns(ip: string): Promise<boolean> {
  try {
    const names = await dns.reverse(ip);
    const name = names.find((n) =>
      GOOGLE_DOMAINS.some((d) => n.endsWith(d)),
    );
    if (!name) return false;

    // Forward-confirm: the PTR alone is attacker-controllable, the A/AAAA is not.
    const forward = await Promise.allSettled([dns.resolve4(name), dns.resolve6(name)]);
    return forward.some(
      (r) => r.status === "fulfilled" && (r.value as string[]).includes(ip),
    );
  } catch {
    return false;
  }
}

export interface GoogleVerification {
  verified: boolean;
  method: "ip-range" | "dns" | "none";
  ip: string;
}

/**
 * Verify a request came from Google. Range match first (no network round-trip
 * once cached), DNS as the fallback so a stale range list cannot produce a
 * false negative.
 */
export async function verifyGoogleRequest(
  ip: string,
  set: GoogleRangeSet = "common",
): Promise<GoogleVerification> {
  if (!ip) return { verified: false, method: "none", ip };

  try {
    if (await isGoogleIp(ip, set)) return { verified: true, method: "ip-range", ip };
  } catch {
    // Range list unavailable — fall through to DNS rather than failing closed.
  }

  if (await isGoogleByDns(ip)) return { verified: true, method: "dns", ip };
  return { verified: false, method: "none", ip };
}

/** Client IP from the proxy headers Vercel sets. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}
