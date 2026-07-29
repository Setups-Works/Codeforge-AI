/**
 * The one crawler list.
 *
 * Three places need to agree about which bots exist: robots.txt (what we allow),
 * proxy.ts (what is worth logging), and /api/crawler-log (what to call it). They
 * used to be three separate literals, so an agent added to robots.txt silently
 * never showed up in the admin log. Everything derives from this array now.
 *
 * Order matters for `crawlerName` — the first matching token wins, so more
 * specific tokens must come before the substrings they contain
 * ("google-inspectiontool" before "googlebot", "claude-user" before "claude").
 */
export type CrawlerKind = "search" | "ai-training" | "ai-search";

export interface CrawlerDef {
  /** Display name, and the exact user-agent token used in robots.txt. */
  name: string;
  /** Lowercase substring matched against the User-Agent header. */
  token: string;
  kind: CrawlerKind;
}

export const CRAWLERS: CrawlerDef[] = [
  /* ---------------------------- search engines --------------------------- */
  { name: "Google-InspectionTool", token: "google-inspectiontool", kind: "search" },
  { name: "Google-Extended", token: "google-extended", kind: "search" },
  { name: "Googlebot", token: "googlebot", kind: "search" },
  { name: "Bingbot", token: "bingbot", kind: "search" },
  { name: "DuckDuckBot", token: "duckduckbot", kind: "search" },
  { name: "YandexBot", token: "yandex", kind: "search" },
  { name: "Yahoo Slurp", token: "slurp", kind: "search" },
  { name: "Baiduspider", token: "baiduspider", kind: "search" },
  { name: "PetalBot", token: "petalbot", kind: "search" },

  /* ------------------- AI: corpus and model training --------------------- */
  // Applebot-Extended must precede the plain Applebot search token below.
  { name: "Applebot-Extended", token: "applebot-extended", kind: "ai-training" },
  { name: "GPTBot", token: "gptbot", kind: "ai-training" },
  { name: "meta-externalagent", token: "meta-externalagent", kind: "ai-training" },
  { name: "CCBot", token: "ccbot", kind: "ai-training" },
  { name: "Amazonbot", token: "amazonbot", kind: "ai-training" },
  { name: "cohere-ai", token: "cohere-ai", kind: "ai-training" },

  /* ------------- AI: live retrieval, the ones that cite you -------------- */
  { name: "OAI-SearchBot", token: "oai-searchbot", kind: "ai-search" },
  { name: "ChatGPT-User", token: "chatgpt-user", kind: "ai-search" },
  { name: "Claude-SearchBot", token: "claude-searchbot", kind: "ai-search" },
  { name: "Claude-User", token: "claude-user", kind: "ai-search" },
  { name: "PerplexityBot", token: "perplexitybot", kind: "ai-search" },
  { name: "Perplexity-User", token: "perplexity-user", kind: "ai-search" },
  { name: "DuckAssistBot", token: "duckassistbot", kind: "ai-search" },
  { name: "MistralAI-User", token: "mistralai-user", kind: "ai-search" },

  // Plain Applebot last: it is a substring of Applebot-Extended, so it must not
  // shadow it during name resolution.
  { name: "Applebot", token: "applebot", kind: "search" },

  // ClaudeBot last for the same reason — "claude" appears inside the tokens of
  // Claude-User and Claude-SearchBot.
  { name: "ClaudeBot", token: "claudebot", kind: "ai-training" },
];

/** Agents named explicitly in robots.txt as AI crawlers. */
export const AI_CRAWLER_AGENTS = CRAWLERS.filter((c) => c.kind !== "search").map(
  (c) => c.name,
);

/**
 * Cheap pre-filter for the proxy: is this UA worth the cost of logging?
 * Matching the string proves nothing — anyone can send "GPTBot" — it only
 * decides what gets handed to the log endpoint for checking.
 */
export const CRAWLER_UA_RE = new RegExp(
  CRAWLERS.map((c) => c.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i",
);

/** Which crawler the user-agent claims to be. Claimed, not proven. */
export function crawlerName(ua: string): string {
  const u = ua.toLowerCase();
  return CRAWLERS.find((c) => u.includes(c.token))?.name ?? "other";
}

/** Bucket for a resolved crawler name, for grouping in the admin. */
export function crawlerKind(name: string): CrawlerKind | "unknown" {
  return CRAWLERS.find((c) => c.name === name)?.kind ?? "unknown";
}
