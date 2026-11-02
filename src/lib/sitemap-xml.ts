import { getEffectiveConfig } from "@/lib/site-config";

/** A single `<url>` entry in a urlset sitemap. */
export interface SitemapEntry {
  loc: string;
  lastmod?: Date;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Build a `<urlset>` sitemap document (one content type's URLs). */
export function urlset(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const parts = [`    <loc>${esc(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod.toISOString()}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

/** Build a `<sitemapindex>` referencing the per-type child sitemaps (Yoast-style). */
export function sitemapIndex(children: { loc: string; lastmod?: Date }[]): string {
  const body = children
    .map((c) => {
      const parts = [`    <loc>${esc(c.loc)}</loc>`];
      if (c.lastmod) parts.push(`    <lastmod>${c.lastmod.toISOString()}</lastmod>`);
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

/** XML response with sensible edge caching (1h fresh, 1d stale-while-revalidate). */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/** The configured site origin, without a trailing slash. */
export async function siteBase(): Promise<string> {
  const cfg = await getEffectiveConfig();
  return (cfg.siteUrl || "https://labs.setups.works").replace(/\/$/, "");
}
