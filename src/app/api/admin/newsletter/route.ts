import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { countNewsletterRecipients, listNewsletterRecipients } from "@/services/user-store";
import { sendEmail } from "@/lib/mailer";
import { newsletterEmailHtml } from "@/lib/email-templates";
import { sanitizeNewsletterHtml, unsubscribeUrl } from "@/lib/newsletter";

export const runtime = "nodejs";
// Bulk sends can take a while; give the function room (Vercel Pro allows 300s).
export const maxDuration = 300;

const APP_URL =
  process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

/** Number of concurrent SMTP sends. Kept modest to stay under provider limits. */
const CONCURRENCY = 8;

interface Recipient {
  email: string;
  name?: string;
}

/** Run `task` over `items` with bounded concurrency; returns sent/failed counts. */
async function sendPool(
  items: Recipient[],
  task: (r: Recipient) => Promise<void>,
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0, cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const r = items[cursor++];
      try {
        await task(r);
        sent++;
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return { sent, failed };
}

/** GET → how many opted-in users a broadcast would reach. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const total = await countNewsletterRecipients();
  return NextResponse.json({ recipients: total });
}

interface SendBody {
  mode?: "all" | "single" | "test";
  email?: string;
  subject?: string;
  heading?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/** POST → send a newsletter to all opted-in users, one address, or a test to self. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  let b: SendBody;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = (b.subject ?? "").trim().slice(0, 200);
  const bodyHtml = sanitizeNewsletterHtml(b.body ?? "");
  if (!subject) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
  if (!bodyHtml) return NextResponse.json({ error: "The body is empty" }, { status: 400 });

  const imageUrl = typeof b.imageUrl === "string" && /^https?:\/\//.test(b.imageUrl) ? b.imageUrl : undefined;
  const ctaLabel = (b.ctaLabel ?? "").trim().slice(0, 40) || undefined;
  const ctaUrl = typeof b.ctaUrl === "string" && /^https?:\/\//.test(b.ctaUrl) ? b.ctaUrl : undefined;
  const heading = (b.heading ?? "").trim().slice(0, 140) || undefined;

  const render = (to: string) =>
    newsletterEmailHtml({
      heading,
      bodyHtml,
      imageUrl,
      ctaLabel,
      ctaUrl: ctaLabel ? ctaUrl : undefined,
      unsubscribeUrl: unsubscribeUrl(APP_URL, to),
    });

  // ── Single / test: one recipient, awaited so the admin sees the result. ──
  if (b.mode === "single" || b.mode === "test") {
    const to =
      b.mode === "test"
        ? session.user.email ?? ""
        : (b.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ error: "A valid recipient email is required" }, { status: 400 });
    }
    try {
      await sendEmail({ to, subject, html: render(to) });
      return NextResponse.json({ ok: true, sent: 1, failed: 0, mode: b.mode, to });
    } catch (e) {
      console.error("[newsletter/send:single]", e);
      return NextResponse.json({ error: "Failed to send. Check SMTP settings." }, { status: 502 });
    }
  }

  // ── Broadcast: every opted-in, non-banned user. ──
  const recipients = await listNewsletterRecipients();
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0 });
  }

  const { sent, failed } = await sendPool(recipients, (r) =>
    sendEmail({ to: r.email, subject, html: render(r.email) }),
  );
  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}
