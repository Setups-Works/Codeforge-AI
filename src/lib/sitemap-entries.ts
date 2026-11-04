import { CAREERS } from "@/content/careers";
import { DOC_ARTICLES } from "@/content/docs";
import { listPublishedQuestionSlugs } from "@/services/questions";
import { listPublishedSlugs } from "@/services/blog-store";
import { listDiscussionsForSitemap } from "@/services/discussions-store";
import type { SitemapEntry } from "@/lib/sitemap-xml";
import { lmsEnabled } from "@/lib/lms/flag";
import { listPublishedCourseSlugs } from "@/services/lms-catalog";
import { listPublishedBundleSlugs } from "@/services/lms-bundles";

/** Every public URL, in one list: static pages, help, careers, then DB-backed
 *  problems, blog posts and forum threads. DB failures drop just that section
 *  so the sitemap never errors. */
export async function allSitemapEntries(base: string): Promise<SitemapEntry[]> {
  const now = new Date();
  const pages: SitemapEntry[] = [
    { loc: base, lastmod: now, changefreq: "daily", priority: 1 },
    { loc: `${base}/problems`, lastmod: now, changefreq: "daily", priority: 0.9 },
    ...(lmsEnabled() ? [{ loc: `${base}/courses`, lastmod: now, changefreq: "daily" as const, priority: 0.8 }] : []),
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
    { loc: `${base}/verify`, lastmod: now, changefreq: "monthly", priority: 0.4 },
    { loc: `${base}/terms`, lastmod: now, changefreq: "yearly", priority: 0.3 },
    { loc: `${base}/privacy`, lastmod: now, changefreq: "yearly", priority: 0.3 },
    // Note: /login and /register are intentionally excluded — auth pages should
    // not be indexed and only hurt the site's indexed-page ratio.
  ];

  const help: SitemapEntry[] = DOC_ARTICLES.map((a) => ({
    loc: `${base}/help/${a.slug}`,
    lastmod: now,
    changefreq: "monthly",
    priority: 0.5,
  }));
  const careers: SitemapEntry[] = CAREERS.map((c) => ({
    loc: `${base}/careers/${c.slug}`,
    lastmod: now,
    changefreq: "monthly",
    priority: 0.5,
  }));

  const [problems, posts, threads, courses, bundles] = await Promise.all([
    listPublishedQuestionSlugs()
      .then((rows) =>
        rows.map((p): SitemapEntry => ({ loc: `${base}/problems/${p.slug}`, lastmod: p.updatedAt ?? now, changefreq: "weekly", priority: 0.7 })),
      )
      .catch(() => [] as SitemapEntry[]),
    listPublishedSlugs()
      .then((rows) =>
        rows.map((p): SitemapEntry => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updatedAt ?? now, changefreq: "monthly", priority: 0.6 })),
      )
      .catch(() => [] as SitemapEntry[]),
    listDiscussionsForSitemap()
      .then((rows) =>
        rows.map((t): SitemapEntry => ({ loc: `${base}/forum/${t.id}`, lastmod: t.updatedAt ?? now, changefreq: "weekly", priority: 0.5 })),
      )
      .catch(() => [] as SitemapEntry[]),
    lmsEnabled()
      ? listPublishedCourseSlugs()
          .then((rows) =>
            rows.map((c): SitemapEntry => ({ loc: `${base}/courses/${c.slug}`, lastmod: c.updatedAt, changefreq: "weekly", priority: 0.8 })),
          )
          .catch(() => [] as SitemapEntry[])
      : Promise.resolve([] as SitemapEntry[]),
    lmsEnabled()
      ? listPublishedBundleSlugs()
          .then((rows) =>
            rows.map((b): SitemapEntry => ({ loc: `${base}/bundles/${b.slug}`, lastmod: b.updatedAt, changefreq: "weekly", priority: 0.7 })),
          )
          .catch(() => [] as SitemapEntry[])
      : Promise.resolve([] as SitemapEntry[]),
  ]);

  return [...pages, ...problems, ...courses, ...bundles, ...posts, ...threads, ...help, ...careers];
}
