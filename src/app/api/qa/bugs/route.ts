import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { sendEmail } from "@/lib/mailer";
import { APP_NAME } from "@/lib/constants";
import { getContributorStatus, createBugReport } from "@/services/qa-store";
import { getUserBillingFields } from "@/services/billing-store";

export const runtime = "nodejs";

const optStr = (max: number) => z.string().max(max).optional().or(z.literal(""));

const schema = z.object({
  title: z.string().min(5).max(160),
  area: z.string().max(60).default("Other"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  steps: z.string().min(10).max(4000),
  expected: optStr(2000),
  actual: optStr(2000),
  environment: optStr(300),
  url: z.string().url().max(500).optional().or(z.literal("")),
  screenshotUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  // Only approved QA contributors can file bugs.
  const status = await getContributorStatus(session.user.id);
  if (status !== "approved") {
    return NextResponse.json({ error: "You must be an approved QA contributor to report bugs." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg =
      issue?.path?.[0] === "title"
        ? "Give the bug a short, clear title (at least 5 characters)."
        : issue?.path?.[0] === "steps"
          ? "Describe the steps to reproduce (at least 10 characters)."
          : issue?.message || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const u = await getUserBillingFields(session.user.id);
  const d = parsed.data;

  const bugId = await createBugReport({
    userId: session.user.id,
    reporterName: u?.name || session.user.name || "QA contributor",
    title: d.title,
    area: d.area,
    severity: d.severity,
    steps: d.steps,
    expected: d.expected || "",
    actual: d.actual || "",
    environment: d.environment || "",
    url: d.url || "",
    screenshotUrl: d.screenshotUrl || "",
  });

  // Notify the team (best-effort).
  const esc = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  sendEmail({
    to: process.env.FEEDBACK_EMAIL ?? process.env.SMTP_USER ?? "info@setups.works",
    subject: `[${APP_NAME} QA] ${d.severity.toUpperCase()} bug — ${d.title}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
      <h2 style="color:#006bff">New bug report — ${esc(d.area)}</h2>
      <p style="font-size:14px"><b>${esc(d.title)}</b> · severity ${esc(d.severity)}</p>
      <p style="font-size:13px;white-space:pre-wrap"><b>Steps:</b>\n${esc(d.steps)}</p>
      ${d.expected ? `<p style="font-size:13px;white-space:pre-wrap"><b>Expected:</b> ${esc(d.expected)}</p>` : ""}
      ${d.actual ? `<p style="font-size:13px;white-space:pre-wrap"><b>Actual:</b> ${esc(d.actual)}</p>` : ""}
      ${d.environment ? `<p style="font-size:13px"><b>Env:</b> ${esc(d.environment)}</p>` : ""}
      ${d.url ? `<p style="font-size:13px"><b>URL:</b> <a href="${esc(d.url)}">${esc(d.url)}</a></p>` : ""}
    </div>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: bugId });
}
