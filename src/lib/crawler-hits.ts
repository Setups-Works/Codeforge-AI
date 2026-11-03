import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CrawlerHitRow {
  id: string;
  path: string;
  crawler: string;
  verified: boolean;
  method: "ip-range" | "dns" | "none";
  createdAt: string;
}

export interface CrawlerSummary {
  total: number;
  byCrawler: { _id: string; hits: number; verified: number }[];
  topPaths: { _id: string; hits: number }[];
  items: CrawlerHitRow[];
}

export async function recordCrawlerHit(hit: {
  path: string;
  userAgent: string;
  ip: string;
  crawler: string;
  verified: boolean;
  method: "ip-range" | "dns" | "none";
}): Promise<void> {
  const { error } = await supabaseAdmin().from("crawler_hits").insert({
    path: hit.path,
    user_agent: hit.userAgent,
    ip: hit.ip,
    crawler: hit.crawler,
    verified: hit.verified,
    method: hit.method,
  });
  if (error) throw new Error(error.message);
}

/** Totals, per-crawler and top-path counts plus the 50 most recent hits. */
export async function crawlerSummary(days: number): Promise<CrawlerSummary> {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [summary, recent] = await Promise.all([
    sb.rpc("crawler_hit_summary", { since }),
    sb
      .from("crawler_hits")
      .select("id, path, crawler, verified, method, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (summary.error) throw new Error(summary.error.message);
  if (recent.error) throw new Error(recent.error.message);

  const agg = summary.data as Pick<CrawlerSummary, "total" | "byCrawler" | "topPaths">;
  const items = (recent.data ?? []).map((r) => ({
    id: r.id as string,
    path: r.path as string,
    crawler: r.crawler as string,
    verified: r.verified as boolean,
    method: r.method as CrawlerHitRow["method"],
    createdAt: r.created_at as string,
  }));
  return { total: agg.total, byCrawler: agg.byCrawler, topPaths: agg.topPaths, items };
}
