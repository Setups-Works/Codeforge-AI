import { ipInPrefixes, type Prefix } from "@/lib/verify-google";

/**
 * Verifies that an AI crawler request genuinely came from the company it claims.
 *
 * The user-agent proves nothing — `curl -A ClaudeBot` is a one-liner — so every
 * AI hit was previously logged as "claimed" with no way to tell a real crawler
 * from someone forging one. Anthropic, OpenAI and Perplexity all publish their
 * crawler IP ranges in the same JSON shape Google uses, which makes the check
 * the same check: is the source IP inside a published prefix?
 *
 * Only IP ranges here, no DNS fallback. Google documents reverse-then-forward
 * DNS as a supported method and serves PTR records for it; these publishers
 * document the range lists and nothing else, so a DNS check would be inventing
 * a verification method they never promised to support.
 *
 * Crawlers absent from this map stay unverified on purpose. Applebot-Extended,
 * meta-externalagent, CCBot, Amazonbot, cohere-ai, DuckAssistBot and
 * MistralAI-User publish no list, and recording "unverified" is honest where
 * pretending to have checked would not be.
 */

/** Crawler display name (as resolved by lib/crawlers.ts) → publisher range list. */
const RANGE_SOURCES: Record<string, string> = {
  // One file covers every Anthropic crawler. Linked from Anthropic's own
  // support article on ClaudeBot rather than guessed at.
  ClaudeBot: "https://claude.com/crawling/bots.json",
  "Claude-User": "https://claude.com/crawling/bots.json",
  "Claude-SearchBot": "https://claude.com/crawling/bots.json",

  // OpenAI splits by purpose: training, search indexing, and user-triggered
  // fetches each get their own list.
  GPTBot: "https://openai.com/gptbot.json",
  "OAI-SearchBot": "https://openai.com/searchbot.json",
  "ChatGPT-User": "https://openai.com/chatgpt-user.json",

  PerplexityBot: "https://www.perplexity.ai/perplexitybot.json",
  "Perplexity-User": "https://www.perplexity.ai/perplexity-user.json",
};

/** Can this crawler be verified at all? */
export function isVerifiableCrawler(name: string): boolean {
  return name in RANGE_SOURCES;
}

// Same cadence as the Google range cache: these lists change rarely, and a day
// keeps this to one fetch per publisher per deployment per day.
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; prefixes: Prefix[] }>();

async function getPrefixes(url: string): Promise<Prefix[]> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.prefixes;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not fetch crawler ranges (${res.status})`);
  const json = (await res.json()) as { prefixes?: Prefix[] };
  const prefixes = json.prefixes ?? [];
  cache.set(url, { at: Date.now(), prefixes });
  return prefixes;
}

export interface CrawlerVerification {
  verified: boolean;
  method: "ip-range" | "none";
}

/**
 * Check `ip` against the published ranges for `name`.
 *
 * Returns `none` rather than throwing when the list is unreachable — a
 * publisher outage should leave the hit recorded as unproven, not lose it.
 */
export async function verifyAiCrawler(
  name: string,
  ip: string,
): Promise<CrawlerVerification> {
  const url = RANGE_SOURCES[name];
  if (!url || !ip) return { verified: false, method: "none" };

  try {
    const prefixes = await getPrefixes(url);
    if (ipInPrefixes(ip, prefixes)) return { verified: true, method: "ip-range" };
  } catch {
    // Fall through — unverified, not failed.
  }
  return { verified: false, method: "none" };
}
