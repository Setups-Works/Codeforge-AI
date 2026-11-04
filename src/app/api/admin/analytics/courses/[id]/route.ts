import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { getCourseFunnel } from "@/services/lms-analytics";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const funnel = await getCourseFunnel(id);
  return funnel ? NextResponse.json(funnel) : notFound();
}
