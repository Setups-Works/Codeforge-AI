import { NextRequest } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody, respond } from "@/lib/lms/route";
import { sectionSchema } from "@/schemas/course";
import { deleteSection, updateSection } from "@/services/lms-courses";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; sectionId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id, sectionId } = await params;
  if (!isUuid(id) || !isUuid(sectionId)) return notFound();
  const body = await parseBody(req, sectionSchema);
  if (body.error) return body.error;
  return respond(await updateSection(id, sectionId, body.data.title), () => ({ ok: true }));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id, sectionId } = await params;
  if (!isUuid(id) || !isUuid(sectionId)) return notFound();
  return respond(await deleteSection(id, sectionId), () => ({ ok: true }));
}
