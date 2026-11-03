import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody, respond } from "@/lib/lms/route";
import { coursePatchSchema } from "@/schemas/course";
import { adminGetCourse, deleteCourse, updateCourse } from "@/services/lms-courses";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const detail = await adminGetCourse(id);
  return detail ? NextResponse.json(detail) : notFound();
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, coursePatchSchema);
  if (body.error) return body.error;
  return respond(await updateCourse(id, body.data), (course) => ({ course }));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return respond(await deleteCourse(id), () => ({ ok: true }));
}
