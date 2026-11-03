import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { adminListReviews } from "@/services/lms-engagement";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return NextResponse.json({ reviews: await adminListReviews(id) });
}
