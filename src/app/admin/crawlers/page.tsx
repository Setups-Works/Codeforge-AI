import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { CrawlerHit } from "@/models/CrawlerHit";
import { crawlerKind } from "@/lib/crawlers";

export const metadata: Metadata = { title: "Admin · Crawlers" };
export const dynamic = "force-dynamic";

/**
 * Crawler activity — search engines and AI answer engines.
 *
 * Reads the collection directly rather than going through /api/crawler-log:
 * this is a server component inside the admin area, so a round-trip through
 * HTTP (and the shared secret) would buy nothing.
 */
export default async function AdminCrawlersPage() {
  const days = 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const match = { createdAt: { $gte: since } };

  await connectDB();
  const [items, byCrawler, topPaths, total] = await Promise.all([
    CrawlerHit.find(match).sort({ createdAt: -1 }).limit(50).lean(),
    CrawlerHit.aggregate<{ _id: string; hits: number; verified: number }>([
      { $match: match },
      { $group: { _id: "$crawler", hits: { $sum: 1 }, verified: { $sum: { $cond: ["$verified", 1, 0] } } } },
      { $sort: { hits: -1 } },
    ]),
    CrawlerHit.aggregate<{ _id: string; hits: number }>([
      { $match: match },
      { $group: { _id: "$path", hits: { $sum: 1 } } },
      { $sort: { hits: -1 } },
      { $limit: 10 },
    ]),
    CrawlerHit.countDocuments(match),
  ]);

  const aiHits = byCrawler
    .filter((c) => crawlerKind(c._id).startsWith("ai"))
    .reduce((n, c) => n + c.hits, 0);
  const verifiedHits = byCrawler.reduce((n, c) => n + c.verified, 0);

  const card = "rounded-2xl border bg-card p-5";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Crawlers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search-engine and AI answer-engine activity over the last {days} days.
          Verified means the source IP matched the publisher&apos;s own
          published range — a claimed user-agent alone proves nothing.
        </p>
      </div>

      {total === 0 ? (
        <div className={card}>
          <p className="text-sm text-muted-foreground">
            No crawler visits recorded yet. Hits appear once a crawler fetches a
            page — and only if <code className="text-xs">CRAWLER_LOG_KEY</code>{" "}
            is set in the environment.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total hits" value={total} />
            <Stat label="Verified" value={verifiedHits} />
            <Stat label="AI answer engines" value={aiHits} />
            <Stat label="Distinct crawlers" value={byCrawler.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={card}>
              <p className="text-sm font-semibold">By crawler</p>
              <div className="mt-3 space-y-2">
                {byCrawler.map((c) => {
                  const kind = crawlerKind(c._id);
                  return (
                    <div
                      key={c._id}
                      className="flex items-center justify-between rounded-xl border bg-background px-4 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {c._id}
                        {kind.startsWith("ai") && (
                          <span className="rounded-md bg-[#006bff]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#006bff]">
                            {kind === "ai-search" ? "AI search" : "AI training"}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {c.hits} hits
                        <span className={c.verified === c.hits ? "ml-2 text-emerald-500" : "ml-2 text-amber-500"}>
                          {c.verified}/{c.hits} verified
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={card}>
              <p className="text-sm font-semibold">Most crawled pages</p>
              <div className="mt-3 space-y-2">
                {topPaths.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl border bg-background px-4 py-2.5 text-sm"
                  >
                    <span className="truncate font-mono text-xs">{p._id}</span>
                    <span className="shrink-0 text-muted-foreground">{p.hits}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={card}>
            <p className="text-sm font-semibold">Recent activity</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">When</th>
                    <th className="pb-2 font-medium">Crawler</th>
                    <th className="pb-2 font-medium">Path</th>
                    <th className="pb-2 font-medium">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((h) => (
                    <tr key={String(h._id)}>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{h.crawler}</td>
                      <td className="max-w-60 truncate py-2.5 pr-4 font-mono text-xs">{h.path}</td>
                      <td className="py-2.5">
                        {h.verified ? (
                          <span className="text-emerald-500">{h.method}</span>
                        ) : (
                          <span
                            className="text-amber-500"
                            title="User-agent claimed a crawler but the IP could not be verified"
                          >
                            unverified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}
