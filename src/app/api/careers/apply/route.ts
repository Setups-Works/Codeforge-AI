import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createApplication } from "@/services/job-application-store";
import { getCareer } from "@/content/careers";
import { sendEmail } from "@/lib/mailer";
import { APP_NAME } from "@/lib/constants";

export const runtime = "nodejs";

const optUrl = z.string().url().max(400).optional().or(z.literal(""));
const optStr = (max: number) => z.string().max(max).optional().or(z.literal(""));

const schema = z.object({
  role: z.string().min(1),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(5).max(30),
  location: z.string().min(2).max(120),
  experience: z.string().min(1).max(60),
  linkedin: optUrl,
  github: optUrl,
  portfolio: optUrl,
  company: optStr(120),
  resumeUrl: optUrl,
  resumeName: optStr(200),
  message: optStr(4000),
});

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit("auth", req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0];
    const messages: Record<string, string> = {
      name: "Please enter your full name.",
      email: "Please enter a valid email address.",
      phone: "Please enter your phone number.",
      location: "Please enter your current location.",
      experience: "Please select your years of experience.",
      linkedin: "Enter a valid LinkedIn URL or leave it blank.",
      github: "Enter a valid GitHub URL or leave it blank.",
      portfolio: "Enter a valid URL or leave it blank.",
    };
    return NextResponse.json(
      { error: (field && messages[String(field)]) || issue?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const role = getCareer(parsed.data.role);
  if (!role) return NextResponse.json({ error: "Unknown role" }, { status: 400 });

  const d = parsed.data;

  try {
    await createApplication({
      role: role.slug,
      roleTitle: role.title,
      name: d.name,
      email: d.email,
      phone: d.phone,
      location: d.location,
      experience: d.experience,
      linkedin: d.linkedin || "",
      github: d.github || "",
      portfolio: d.portfolio || "",
      company: d.company || "",
      resumeUrl: d.resumeUrl || "",
      resumeName: d.resumeName || "",
      message: d.message || "",
    });
  } catch (err) {
    console.error("[careers] save failed:", err);
    return NextResponse.json({ error: "Could not submit your application. Please try again." }, { status: 502 });
  }

  const { name, email } = d;

  // Notify the team (best-effort).
  const esc = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const link = (label: string, url?: string) => (url ? `<br/><b>${label}:</b> <a href="${esc(url)}">${esc(url)}</a>` : "");
  try {
    await sendEmail({
      to: process.env.CAREERS_EMAIL ?? process.env.FEEDBACK_EMAIL ?? process.env.SMTP_USER ?? "info@setups.works",
      subject: `[${APP_NAME} Careers] ${role.title} — ${name}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
        <h2 style="color:#006bff">New application — ${esc(role.title)}</h2>
        <p style="font-size:14px;line-height:1.7">
          <b>Name:</b> ${esc(name)}<br/>
          <b>Email:</b> <a href="mailto:${esc(email)}">${esc(email)}</a><br/>
          <b>Phone:</b> ${esc(d.phone)}<br/>
          <b>Location:</b> ${esc(d.location)}<br/>
          <b>Experience:</b> ${esc(d.experience)}${d.company ? `<br/><b>Current company:</b> ${esc(d.company)}` : ""}
          ${link("LinkedIn", d.linkedin)}${link("GitHub", d.github)}${link("Portfolio", d.portfolio)}${link("Résumé", d.resumeUrl)}
        </p>
        ${d.message ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/><div style="white-space:pre-wrap;font-size:14px;line-height:1.6">${esc(d.message)}</div>` : ""}
      </div>`,
    });
  } catch (err) {
    console.error("[careers] team email failed:", err);
  }

  // Confirmation to applicant (best-effort).
  try {
    await sendEmail({
      to: email,
      subject: `We received your application — ${APP_NAME}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
        <h2 style="color:#006bff;margin:0 0 8px">Thanks for applying!</h2>
        <p style="font-size:14px;line-height:1.6;color:#374151">We received your application for <b>${esc(role.title)}</b> at ${APP_NAME}. Our team will review it and get back to you if it's a fit.</p>
        <p style="font-size:13px;color:#6b7280">— The ${APP_NAME} team · <a href="https://labs.setups.works" style="color:#006bff;text-decoration:none">labs.setups.works</a></p>
      </div>`,
    });
  } catch (err) {
    console.error("[careers] confirmation email failed:", err);
  }

  return NextResponse.json({ ok: true });
}
