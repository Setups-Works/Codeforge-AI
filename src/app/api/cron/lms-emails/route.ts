import { NextResponse } from "next/server";
import { lmsEnabled } from "@/lib/lms/flag";
import { runDripJobThrottled } from "@/services/lms-emails";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled by Vercel Cron (see vercel.json). There is no secret: the job is
 * idempotent (every email is claimed once in lms_email_log) and throttled to one
 * run per hour, so calling it repeatedly cannot send duplicates or hammer the DB.
 */
export async function GET() {
  if (!lmsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const result = await runDripJobThrottled();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron] drip", e);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
