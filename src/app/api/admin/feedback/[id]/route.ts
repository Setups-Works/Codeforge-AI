import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateFeedbackStatus, deleteFeedback } from "@/services/feedback-store";

export const runtime = "nodejs";

// Feedback ids are Postgres uuids.
function isValidId(id: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!["new", "read", "resolved"].includes(String(body.status))) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await updateFeedbackStatus(id, body.status!);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await deleteFeedback(id);
  return NextResponse.json({ ok: true });
}
