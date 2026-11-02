import { siteBase, urlset, xmlResponse } from "@/lib/sitemap-xml";
import { allSitemapEntries } from "@/lib/sitemap-entries";

// Rendered per-request (edge-cached) so it never needs the DB at build time.
export const dynamic = "force-dynamic";

/** Single sitemap listing every public URL (well under the 50,000-URL limit). */
export async function GET() {
  const base = await siteBase();
  return xmlResponse(urlset(await allSitemapEntries(base)));
}
