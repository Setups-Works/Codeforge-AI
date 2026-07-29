import { connectDB } from "@/lib/mongodb";
import { CrawlerHit } from "@/models/CrawlerHit";
import { crawlerName } from "@/lib/crawlers";
import { verifyGoogleRequest } from "@/lib/verify-google";
import { isVerifiableCrawler, verifyAiCrawler } from "@/lib/verify-crawler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records a crawler visit. Called only by the middleware, gated on a shared
 * secret — without it anyone could POST fake crawl activity and make the log
 * worthless, which is worse than having no log at all.
 *
 * Claims are checked against the publisher's own IP ranges before `verified`
 * is set, so a spoofed user-agent shows up as an unverified hit rather than
 * being silently believed.
 */
export async function POST(req: Request) {
  const key = process.env.CRAWLER_LOG_KEY;
  if (!key || req.headers.get("x-crawler-log-key") !== key) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    path?: string;
    userAgent?: string;
    ip?: string;
  } | null;
  if (!body?.path) return Response.json({ error: "Bad payload" }, { status: 400 });

  const { path, userAgent = "", ip = "" } = body;
  const crawler = crawlerName(userAgent);

  let verified = false;
  let method: "ip-range" | "dns" | "none" = "none";
  if (ip) {
    if (crawler.startsWith("Google")) {
      // Google additionally documents reverse-then-forward DNS and serves PTR
      // records for it, so it gets the richer check.
      const res = await verifyGoogleRequest(ip).catch(() => null);
      if (res) {
        verified = res.verified;
        method = res.method;
      }
    } else if (isVerifiableCrawler(crawler)) {
      const res = await verifyAiCrawler(crawler, ip).catch(() => null);
      if (res) {
        verified = res.verified;
        method = res.method;
      }
    }
  }

  try {
    await connectDB();
    await CrawlerHit.create({ path, userAgent, ip, crawler, verified, method });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[crawler-log]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/** Summary for the admin dashboard. */
export async function GET(req: Request) {
  const key = process.env.CRAWLER_LOG_KEY;
  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get("days")) || 7, 90);

  // Same shared secret, so the summary is not a public endpoint.
  if (!key || req.headers.get("x-crawler-log-key") !== key) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const match = { createdAt: { $gte: since } };

    const [items, byCrawler, topPaths, total] = await Promise.all([
      CrawlerHit.find(match).sort({ createdAt: -1 }).limit(50).lean(),
      CrawlerHit.aggregate([
        { $match: match },
        { $group: { _id: "$crawler", hits: { $sum: 1 }, verified: { $sum: { $cond: ["$verified", 1, 0] } } } },
        { $sort: { hits: -1 } },
      ]),
      CrawlerHit.aggregate([
        { $match: match },
        { $group: { _id: "$path", hits: { $sum: 1 } } },
        { $sort: { hits: -1 } },
        { $limit: 10 },
      ]),
      CrawlerHit.countDocuments(match),
    ]);

    return Response.json({ days, total, items, byCrawler, topPaths });
  } catch (err) {
    console.error("[crawler-log.GET]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
