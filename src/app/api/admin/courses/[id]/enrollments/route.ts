import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { grantSchema } from "@/schemas/course";
import { adminListEnrollments, grantEnrollment, revokeEnrollment, userExists } from "@/services/lms-learn";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return NextResponse.json({ enrollments: await adminListEnrollments(id) });
}

/** Manually grant a learner access (support, comps, testing). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { session, error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, grantSchema);
  if (body.error) return body.error;
  if (!(await userExists(body.data.userId))) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const result = await grantEnrollment(id, body.data.userId, session.user.id);
  return NextResponse.json({ ok: true, result }, { status: result === "created" ? 201 : 200 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  return (await revokeEnrollment(id, userId))
    ? NextResponse.json({ ok: true })
    : notFound();
}
