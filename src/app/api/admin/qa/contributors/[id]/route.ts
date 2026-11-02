import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateContributorStatus } from "@/services/qa-store";
import { sendEmail } from "@/lib/mailer";
import { APP_NAME } from "@/lib/constants";

export const runtime = "nodejs";

const STATUSES = ["pending", "approved", "rejected"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!STATUSES.includes(String(body.status))) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const doc = await updateContributorStatus(id, body.status!);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Email the contributor when they're approved (best-effort).
  if (body.status === "approved" && doc.email) {
    const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";
    sendEmail({
      to: doc.email,
      subject: `You're in — ${APP_NAME} QA program`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
        <h2 style="color:#006bff;margin:0 0 8px">Welcome to the QA program 🎉</h2>
        <p style="font-size:14px;line-height:1.6;color:#374151">Your application was approved. You can now report and track bugs from your QA dashboard.</p>
        <p style="margin:18px 0"><a href="${appUrl}/qa" style="background:#006bff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Open QA dashboard</a></p>
        <p style="font-size:13px;color:#6b7280">— The ${APP_NAME} team</p>
      </div>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
