import { NextResponse } from "next/server";
import { requireLmsAdmin } from "@/lib/lms/guard";
import { adminListOrders } from "@/services/lms-orders";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  return NextResponse.json({ orders: await adminListOrders() });
}
