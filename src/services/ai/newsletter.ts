import { complete } from "@/services/ai/groq";
import { sanitizeNewsletterHtml } from "@/lib/newsletter";

export interface GeneratedNewsletter {
  subject: string;
  body: string;
}

const SYSTEM = `You are the email marketing writer for Setups Works Lab, a platform for
practicing coding interviews (LeetCode-style problems, an online compiler, AI
tutoring, spaced repetition, contests). Write concise, warm, high-signal
newsletters that sound human, not corporate. Avoid hype and emoji spam.`;

/**
 * Draft a newsletter from a short admin prompt/topic.
 * Returns a subject line and an HTML body limited to simple formatting tags
 * (p, strong, em, ul/ol/li, a, h2, h3, blockquote). The body is sanitized
 * before return so it is always safe to place in the editor and email.
 *
 * @param prompt - What the newsletter should be about.
 * @returns `{ subject, body }` — body is sanitized HTML.
 */
export async function generateNewsletter(prompt: string): Promise<GeneratedNewsletter> {
  const raw = await complete(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Write a newsletter about: ${prompt}

Return ONLY JSON: {"subject": "...", "body": "..."}.
- "subject": a compelling line under 60 characters, no clickbait.
- "body": HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href>, <h2>, <h3>, <blockquote>. No inline styles, no <html>/<head>/<body>, no images. 120-220 words. End with a short call to action.`,
      },
    ],
    { json: true, temperature: 0.8, maxTokens: 1200 },
  );

  let parsed: { subject?: unknown; body?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned an unexpected format. Try again.");
  }

  const subject = typeof parsed.subject === "string" ? parsed.subject.trim().slice(0, 140) : "";
  const body = typeof parsed.body === "string" ? sanitizeNewsletterHtml(parsed.body) : "";
  if (!subject || !body) throw new Error("The AI response was incomplete. Try again.");
  return { subject, body };
}
