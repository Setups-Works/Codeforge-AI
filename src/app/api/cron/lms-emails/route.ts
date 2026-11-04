import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { lmsEnabled } from "@/lib/lms/flag";
import { sendDripUnlockEmails } from "@/services/lms-emails";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Scheduled by Vercel Cron (see vercel.json). Fails closed when CRON_SECRET isn't set. */
export async function GET(req: NextRequest) {
  if (!lmsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drip = await sendDripUnlockEmails().catch((e) => {
    console.error("[cron] drip", e);
    return -1;
  });
  return NextResponse.json({ drip });
}
