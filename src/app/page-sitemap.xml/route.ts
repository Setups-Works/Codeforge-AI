import { CAREERS } from "@/content/careers";
import { siteBase, urlset, xmlResponse, type SitemapEntry } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";

/** Static marketing / info pages. */
export async function GET() {
  const base = await siteBase();
  const now = new Date();
  const entries: SitemapEntry[] = [
    { loc: base, lastmod: now, changefreq: "daily", priority: 1 },
    { loc: `${base}/problems`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${base}/compiler`, lastmod: now, changefreq: "monthly", priority: 0.7 },
    { loc: `${base}/pricing`, lastmod: now, changefreq: "weekly", priority: 0.8 },
    { loc: `${base}/join`, lastmod: now, changefreq: "weekly", priority: 0.7 },
    { loc: `${base}/blog`, lastmod: now, changefreq: "weekly", priority: 0.7 },
    { loc: `${base}/help`, lastmod: now, changefreq: "weekly", priority: 0.7 },
    { loc: `${base}/forum`, lastmod: now, changefreq: "daily", priority: 0.6 },
    { loc: `${base}/careers`, lastmod: now, changefreq: "weekly", priority: 0.6 },
    // /about carries the founder + organisation entity (also in site-wide JSON-LD).
    { loc: `${base}/about`, lastmod: now, changefreq: "monthly", priority: 0.6 },
    // The founder's own page — the one whose title and H1 are his name, which
    // is what a name query actually matches on.
    { loc: `${base}/about/nitheesh-rajendran`, lastmod: now, changefreq: "monthly", priority: 0.6 },
    { loc: `${base}/contact`, lastmod: now, changefreq: "monthly", priority: 0.5 },
    { loc: `${base}/changelog`, lastmod: now, changefreq: "weekly", priority: 0.6 },
    { loc: `${base}/status`, lastmod: now, changefreq: "daily", priority: 0.4 },
    { loc: `${base}/design-guidelines`, lastmod: now, changefreq: "monthly", priority: 0.4 },
    { loc: `${base}/feedback`, lastmod: now, changefreq: "monthly", priority: 0.4 },
    { loc: `${base}/terms`, lastmod: now, changefreq: "yearly", priority: 0.3 },
    { loc: `${base}/privacy`, lastmod: now, changefreq: "yearly", priority: 0.3 },
    // Note: /login and /register are intentionally excluded — auth pages should
    // not be indexed and only hurt the site's indexed-page ratio.
  ];
  return xmlResponse(urlset(entries));
}
