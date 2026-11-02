/**
 * Seed the SiteConfig singleton in MongoDB with real project values.
 * Run: node scripts/seed-config.mjs
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local"), override: true });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1); }

const SiteConfigSchema = new mongoose.Schema(
  { _id: { type: String, required: true } },
  { strict: false, timestamps: true },
);
const SiteConfig =
  mongoose.models.SiteConfig ?? mongoose.model("SiteConfig", SiteConfigSchema);

await mongoose.connect(MONGODB_URI);

const data = {
  // ── SEO ─────────────────────────────────────────────────────────────────
  siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  siteName: "Setups Works Lab",
  siteDescription:
    "AI-powered coding interview preparation platform. Master DSA, build frontend projects, and ace your next interview with personalised AI coaching.",
  siteKeywords:
    "coding interview, DSA, LeetCode alternative, algorithm practice, AI mentor, competitive programming, data structures, interview prep, JavaScript, Python",
  ogImage: "",
  twitterHandle: "",

  // ── Analytics (fill these after setting up accounts) ────────────────────
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "",
  clarityId: process.env.NEXT_PUBLIC_CLARITY_ID ?? "",
  gscVerification: process.env.GOOGLE_SITE_VERIFICATION ?? "",

  // ── SMTP ─────────────────────────────────────────────────────────────────
  smtpHost: process.env.SMTP_HOST ?? "smtp.hostinger.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? "info@setups.works",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "Setups Works Lab <info@setups.works>",

  // ── AI ────────────────────────────────────────────────────────────────────
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",

  // ── Code Execution ────────────────────────────────────────────────────────
  executionProvider: process.env.EXECUTION_PROVIDER ?? "paiza",
  paizaUrl: process.env.PAIZA_URL ?? "https://api.paiza.io",
  paizaApiKey: process.env.PAIZA_API_KEY ?? "guest",
  judge0Url: process.env.JUDGE0_URL ?? "",
  judge0ApiKey: process.env.JUDGE0_API_KEY ?? "",
  pistonUrl: process.env.PISTON_URL ?? "https://emkc.org",

  // ── Redis ─────────────────────────────────────────────────────────────────
  redisUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  // ── OAuth ─────────────────────────────────────────────────────────────────
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",

  // ── Payments ──────────────────────────────────────────────────────────────
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
};

await SiteConfig.findByIdAndUpdate("global", { $set: data }, { upsert: true, new: true });
console.log("✅ SiteConfig seeded successfully.");
await mongoose.disconnect();
