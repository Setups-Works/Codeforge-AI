import { NextRequest } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody, respond } from "@/lib/lms/route";
import { lessonPatchSchema } from "@/schemas/course";
import { deleteLesson, updateLesson } from "@/services/lms-courses";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; lessonId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id, lessonId } = await params;
  if (!isUuid(id) || !isUuid(lessonId)) return notFound();
  const body = await parseBody(req, lessonPatchSchema);
  if (body.error) return body.error;
  return respond(await updateLesson(id, lessonId, body.data), (lesson) => ({ lesson }));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id, lessonId } = await params;
  if (!isUuid(id) || !isUuid(lessonId)) return notFound();
  return respond(await deleteLesson(id, lessonId), () => ({ ok: true }));
}
