import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { sendEmail } from "@/lib/mailer";
import { APP_NAME } from "@/lib/constants";
import { getContributor, createContributor } from "@/services/qa-store";
import { getUserBillingFields } from "@/services/billing-store";

export const runtime = "nodejs";

const schema = z.object({
  motivation: z.string().min(20).max(2000),
  focusAreas: z.array(z.string().max(60)).max(12).default([]),
  experience: z.string().max(2000).optional().or(z.literal("")),
  github: z.string().url().max(300).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

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
      issue?.path?.[0] === "motivation"
        ? "Tell us a bit more about why you want to join (at least 20 characters)."
        : issue?.path?.[0] === "github"
          ? "Enter a valid GitHub URL or leave it blank."
          : issue?.message || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // One application per user — don't let them reapply if one already exists.
  const existing = await getContributor(session.user.id);
  if (existing) {
    return NextResponse.json(
      { error: "You already have a QA application on file.", status: existing.status },
      { status: 409 },
    );
  }

  const u = await getUserBillingFields(session.user.id);
  const name = u?.name || session.user.name || "Member";
  const email = u?.email || session.user.email || "";

  const d = parsed.data;
  await createContributor({
    userId: session.user.id,
    name,
    email,
    motivation: d.motivation,
    focusAreas: d.focusAreas,
    experience: d.experience || "",
    github: d.github || "",
  });

  const esc = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Notify the team (best-effort).
  sendEmail({
    to: process.env.CAREERS_EMAIL ?? process.env.FEEDBACK_EMAIL ?? process.env.SMTP_USER ?? "info@setups.works",
    subject: `[${APP_NAME} QA] New contributor application — ${name}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
      <h2 style="color:#006bff">New QA contributor application</h2>
      <p style="font-size:14px;line-height:1.7">
        <b>Name:</b> ${esc(name)}<br/>
        <b>Email:</b> ${esc(email)}<br/>
        <b>Focus areas:</b> ${esc(d.focusAreas.join(", ") || "—")}
        ${d.github ? `<br/><b>GitHub:</b> <a href="${esc(d.github)}">${esc(d.github)}</a>` : ""}
      </p>
      <p style="font-size:13px;color:#374151;white-space:pre-wrap">${esc(d.motivation)}</p>
    </div>`,
  }).catch(() => {});

  // Confirmation to the applicant (best-effort).
  if (email) {
    sendEmail({
      to: email,
      subject: `Thanks for applying to the ${APP_NAME} QA program`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
        <h2 style="color:#006bff;margin:0 0 8px">Application received</h2>
        <p style="font-size:14px;line-height:1.6;color:#374151">Thanks for applying to the ${APP_NAME} QA contributor program. We'll review your application and email you once you're approved — then you can start reporting and tracking bugs.</p>
        <p style="font-size:13px;color:#6b7280">— The ${APP_NAME} team</p>
      </div>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
