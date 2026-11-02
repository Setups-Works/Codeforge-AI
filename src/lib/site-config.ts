import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { SiteConfig, type SiteConfigDoc } from "@/models/SiteConfig";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { SITE_CONFIG_TAG, resolve } from "@/lib/site-config-shared";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { backendFor } from "@/lib/data-backend";

// Pure helpers/constants moved to the dependency-free `@/lib/site-config-shared`
// (unit-testable without pulling in `next/cache`); re-exported here so existing
// importers of `@/lib/site-config` keep working unchanged.
export { SITE_CONFIG_TAG, MASKED, SENSITIVE_FIELDS, resolve, maskConfig } from "@/lib/site-config-shared";

/** Fetch and cache the site config. Revalidated when admin saves settings. */
export const getSiteConfig = unstable_cache(
  async (): Promise<SiteConfigDoc> => {
    try {
      if (backendFor("site_config") === "supabase") {
        const { data } = await supabaseAdmin()
          .from("site_config")
          .select("config")
          .eq("id", "global")
          .maybeSingle();
        return ((data as { config?: SiteConfigDoc } | null)?.config ?? {}) as SiteConfigDoc;
      }
      await connectDB();
      const cfg = await SiteConfig.findById("global").lean<SiteConfigDoc>();
      return cfg ?? ({} as SiteConfigDoc);
    } catch (err) {
      // The DB may be unreachable during build/prerender (e.g. robots.txt,
      // sitemap.xml). Fall back to env-based config instead of crashing.
      console.error("[site-config] Could not load config from DB:", err);
      return {} as SiteConfigDoc;
    }
  },
  [SITE_CONFIG_TAG],
  { revalidate: 60, tags: [SITE_CONFIG_TAG] },
);

/** Canonical production domain — used when nothing better is configured and to
 *  override Vercel preview URLs that must never appear in canonical/sitemap/OG. */
const CANONICAL_SITE_URL = "https://labs.setups.works";

/** Merged config with env fallbacks — used for SEO metadata and scripts. */
export async function getEffectiveConfig() {
  const cfg = await getSiteConfig();
  const resolvedSiteUrl = resolve(
    cfg.siteUrl,
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL,
  );
  // Never advertise the Vercel preview domain (or an empty value) for SEO —
  // Search Console rejects cross-domain sitemap URLs, so pin the real domain.
  const siteUrl =
    !resolvedSiteUrl || resolvedSiteUrl.includes("vercel.app")
      ? CANONICAL_SITE_URL
      : resolvedSiteUrl.replace(/\/$/, "");
  return {
    siteUrl,
    siteName: resolve(cfg.siteName, APP_NAME),
    siteDescription: resolve(cfg.siteDescription, APP_DESCRIPTION),
    siteKeywords: cfg.siteKeywords ?? "",
    ogImage: cfg.ogImage ?? "",
    twitterHandle: cfg.twitterHandle ?? "",
    gaId: resolve(
      cfg.gaId,
      process.env.NEXT_PUBLIC_GA_ID ??
        (process.env.NODE_ENV === "production" ? "G-3QG2R8NKRC" : undefined),
    ),
    clarityId: resolve(cfg.clarityId, process.env.NEXT_PUBLIC_CLARITY_ID),
    gscVerification: resolve(cfg.gscVerification, process.env.GOOGLE_SITE_VERIFICATION),
  };
}
