import type { MetadataRoute } from "next";
import { getEffectiveConfig } from "@/lib/site-config";
import { AI_CRAWLER_AGENTS } from "@/lib/crawlers";

/** Paths no crawler should fetch. */
const DISALLOW = ["/admin", "/dashboard", "/api/", "/settings"];

// Render at request time so the build never has to reach the DB to prerender.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const cfg = await getEffectiveConfig();
  const base = (cfg.siteUrl || "https://codeforgeai.io").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      /**
       * Answer-engine crawlers, named explicitly.
       *
       * A crawler obeys exactly one group — the most specific one matching its
       * token — and ignores every other, including `*`. So naming an agent
       * means repeating the disallow list for it; omitting that would grant it
       * the /admin and /dashboard access the wildcard group denies. Hence
       * DISALLOW is shared rather than written out per group.
       *
       * They already fall under `*` today, so this changes no behaviour — it
       * states the policy, and keeps a future tightening of `*` from silently
       * revoking access to the engines this product wants to be cited in.
       */
      ...AI_CRAWLER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
      {
        // Controls whether the site may be used to ground and train Gemini and
        // Vertex AI. Allowed on purpose: being quotable in AI answers is
        // distribution. Flip to `disallow: ["/"]` to opt out.
        userAgent: "Google-Extended",
        allow: "/",
        disallow: DISALLOW,
      },
      {
        // Search Console's URL Inspection fetcher, so a live test reflects what
        // Googlebot sees rather than a different ruleset.
        userAgent: "Google-InspectionTool",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
