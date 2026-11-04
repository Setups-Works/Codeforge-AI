import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { refundOrder } from "@/services/lms-orders";

export const runtime = "nodejs";

/** Refund a course order and remove the access it granted. Admin only. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const result = await refundOrder(id);
  return result.ok ? NextResponse.json({ ok: true, alreadyRefunded: result.alreadyRefunded }) : NextResponse.json({ error: result.error }, { status: result.status });
}
