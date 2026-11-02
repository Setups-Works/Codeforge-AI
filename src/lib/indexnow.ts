/**
 * IndexNow — instantly notify participating search engines (Bing, Yandex,
 * Seznam, Naver, …) when a URL is created or updated so they crawl it right
 * away. Google does not consume IndexNow yet, but there is no downside to
 * pinging: it's a single best-effort request that never blocks or throws.
 *
 * Setup: the key is served as plain text at {keyLocation} so engines can
 * verify ownership. Override with the INDEXNOW_KEY env var if desired.
 */

const HOST = "labs.setups.works";
const BASE = `https://${HOST}`;

/** A stable, verifiable key (a–z, 0–9, 8–128 chars). */
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? "8f2c14a9d7b34e6f90a1c5b2e6d8f0a3";

export const INDEXNOW_KEY_LOCATION = `${BASE}/indexnow-key.txt`;

/** Best-effort ping. Accepts absolute or site-relative URLs. */
export async function pingIndexNow(urls: string | string[]): Promise<void> {
  const list = (Array.isArray(urls) ? urls : [urls])
    .filter(Boolean)
    .map((u) => (u.startsWith("http") ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`));
  if (list.length === 0) return;

  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList: list.slice(0, 10_000),
      }),
      // Never let a slow endpoint hold up the user's request for long.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Best-effort: indexing hints must never break the actual mutation.
  }
}
