import mongoose, { Schema, type Model } from "mongoose";

/**
 * One recorded crawler visit.
 *
 * `verified` is the point of this collection. A user-agent string proves
 * nothing — anyone can send "GPTBot" — so a hit is stored as *claimed* until
 * the source IP is matched against the publisher's own range list. Google,
 * Anthropic, OpenAI and Perplexity publish those; everyone else stays
 * unverified, which is honest rather than a gap.
 */
export interface CrawlerHitDoc {
  path: string;
  userAgent: string;
  ip: string;
  /** Resolved display name from lib/crawlers.ts, e.g. "GPTBot". */
  crawler: string;
  verified: boolean;
  method: "ip-range" | "dns" | "none";
  createdAt: Date;
}

const crawlerHitSchema = new Schema<CrawlerHitDoc>(
  {
    path: { type: String, required: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    crawler: { type: String, required: true, index: true },
    verified: { type: Boolean, default: false },
    method: { type: String, default: "none" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Crawl logs are only interesting recently, and an unbounded collection on a
// busy site is a liability. 90 days is well past any dashboard window.
crawlerHitSchema.index({ createdAt: -1 });
crawlerHitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const CrawlerHit =
  (mongoose.models.CrawlerHit as Model<CrawlerHitDoc>) ||
  mongoose.model<CrawlerHitDoc>("CrawlerHit", crawlerHitSchema);
