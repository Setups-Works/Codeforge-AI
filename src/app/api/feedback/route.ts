import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createFeedback } from "@/services/feedback-store";
import { sendEmail } from "@/lib/mailer";
import { serverLog, flushLogs } from "@/lib/otel-logger";
import { APP_NAME } from "@/lib/constants";
import { verifyRecaptcha } from "@/lib/recaptcha";

const feedbackSchema = z.object({
  type: z.enum(["feature", "bug", "issue"]),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  email: z.string().email().optional().or(z.literal("")),
});

const TYPE_LABELS: Record<string, string> = {
  feature: "Feature Request",
  bug: "Bug Report",
  issue: "Issue / Other",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = body && typeof body === "object" ? (body as Record<string, unknown>).recaptchaToken : undefined;
  const rc = await verifyRecaptcha(typeof token === "string" ? token : undefined, { action: "feedback" });
  if (!rc.ok) {
    return NextResponse.json({ error: "Couldn't verify you're human. Please try again." }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0];
    const messages: Record<string, string> = {
      type: "Please choose a feedback type.",
      title: "Title must be between 3 and 120 characters.",
      description: "Description must be at least 10 characters.",
      email: "Enter a valid email address or leave it blank.",
    };
    return NextResponse.json(
      { error: (field && messages[String(field)]) || issue?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const { type, title, description, email } = parsed.data;
  const typeLabel = TYPE_LABELS[type] ?? type;
  const from = email ? `from ${email}` : "anonymous";

  // Attach the signed-in user (if any) so admins can follow up.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const replyEmail = (email || session?.user?.email || "").trim();

  // Persist for the admin inbox (backend selected by DATA_BACKEND_FEEDBACK).
  try {
    await createFeedback({ type, title, description, email: replyEmail, userId });
  } catch (err) {
    console.error("[feedback] Could not save feedback:", err);
  }

  serverLog("Feedback submitted", { type, hasEmail: Boolean(replyEmail) });
  after(async () => {
    await flushLogs();
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#006bff;">[${typeLabel}] ${title}</h2>
      <p style="color:#6b7280;font-size:13px;">Submitted ${from} via ${APP_NAME} feedback form</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#111827;">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      ${email ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/><p style="font-size:13px;color:#6b7280;">Reply to: <a href="mailto:${email}">${email}</a></p>` : ""}
    </div>
  `;

  // Deliver the feedback via email.
  try {
    await sendEmail({
      to: process.env.FEEDBACK_EMAIL ?? process.env.SMTP_USER ?? "info@setups.works",
      subject: `[${APP_NAME} Feedback] [${typeLabel}] ${title}`,
      html,
    });
  } catch (err) {
    console.error("[feedback] Email notification failed:", err);
    return NextResponse.json(
      { error: "Could not submit feedback. Please try again later." },
      { status: 502 },
    );
  }

  // Confirmation email to the submitter (best-effort — never fail the request).
  if (replyEmail) {
    const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeDesc = description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const confirmHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827;">
        <h2 style="color:#006bff;margin:0 0 8px;">Thanks for your feedback 🙌</h2>
        <p style="font-size:14px;line-height:1.6;color:#374151;">
          We received your ${typeLabel.toLowerCase()} and our team will review it. If a reply is needed, we'll reach out to this address.
        </p>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin:0 0 6px;">${typeLabel}</p>
          <p style="font-weight:600;margin:0 0 8px;">${safeTitle}</p>
          <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151;">${safeDesc}</div>
        </div>
        <p style="font-size:13px;color:#6b7280;">— The ${APP_NAME} team · <a href="https://labs.setups.works" style="color:#006bff;text-decoration:none;">labs.setups.works</a></p>
      </div>
    `;
    try {
      await sendEmail({
        to: replyEmail,
        subject: `We received your feedback — ${APP_NAME}`,
        html: confirmHtml,
      });
    } catch (err) {
      console.error("[feedback] Confirmation email failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
