import { completeVision } from "@/services/ai/groq";
import { APP_NAME } from "@/lib/constants";

export interface GeneratedBlog {
  title: string;
  description: string;
  tags: string[];
  content: string; // markdown
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

const SYSTEM = `You are the content marketer for ${APP_NAME} (labs.setups.works), an AI-powered
coding-interview preparation platform. You write clear, helpful, SEO-friendly
feature blog posts. You are shown a screenshot of a product feature and must
describe it accurately based ONLY on what is visible, never inventing details.`;

const INSTRUCTION = `Look at this product feature screenshot and write a blog post about the feature it shows.

Return STRICT JSON (no markdown fences) with exactly these keys:
{
  "title": "compelling, specific blog title (max ~70 chars)",
  "description": "1–2 sentence summary for the blog listing (max ~160 chars)",
  "tags": ["3-6 short lowercase tags"],
  "content": "the full blog post in MARKDOWN: an intro, a '## What it does' section, a '## How to use it' section with steps, and a short '## Why it matters' section. 250-450 words. Reference only what is visible in the screenshot.",
  "seoTitle": "SEO meta title (max ~60 chars)",
  "seoDescription": "SEO meta description (max ~155 chars)",
  "seoKeywords": "comma-separated keywords"
}`;

function parseJson(raw: string): Record<string, unknown> {
  let s = raw.trim();
  // Strip ```json fences if present.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Grab the outermost JSON object.
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

/** Generate a structured blog post from a feature screenshot (data URL). */
export async function generateBlogFromScreenshot(
  imageDataUrl: string,
  hint?: string,
): Promise<GeneratedBlog> {
  const instruction = hint
    ? `${INSTRUCTION}\n\nExtra context from the author: ${hint.slice(0, 500)}`
    : INSTRUCTION;

  const raw = await completeVision(SYSTEM, instruction, imageDataUrl, {
    temperature: 0.6,
    maxTokens: 2048,
    json: true,
  });

  const data = parseJson(raw);
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
  const title = str(data.title, "New feature");
  const description = str(data.description);

  return {
    title,
    description,
    tags: Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 6)
      : [],
    content: str(data.content),
    seoTitle: str(data.seoTitle, title).slice(0, 70),
    seoDescription: str(data.seoDescription, description).slice(0, 160),
    seoKeywords: str(data.seoKeywords),
  };
}
