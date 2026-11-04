import { NextRequest, NextResponse } from "next/server";
import { requireLmsAdmin } from "@/lib/lms/guard";
import { getCourseStats, getOverview } from "@/services/lms-analytics";

export const runtime = "nodejs";

const RANGES = [7, 30, 90, 365];

export async function GET(req: NextRequest) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const asked = Number(req.nextUrl.searchParams.get("days"));
  const days = RANGES.includes(asked) ? asked : 30;
  const [overview, courses] = await Promise.all([getOverview(days), getCourseStats()]);
  return NextResponse.json({ overview, courses });
}
