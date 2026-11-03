import { NextRequest } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody, respond } from "@/lib/lms/route";
import { lessonBulkSchema, lessonCreateSchema } from "@/schemas/course";
import { bulkCreateLessons, createLesson } from "@/services/lms-courses";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Create one lesson. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, lessonCreateSchema);
  if (body.error) return body.error;
  return respond(await createLesson(id, body.data), (lesson) => ({ lesson }), 201);
}

/** Bulk-import lessons from pasted Drive links. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, lessonBulkSchema);
  if (body.error) return body.error;
  return respond(await bulkCreateLessons(id, body.data.sectionId, body.data.entries), (lessons) => ({ lessons }), 201);
}
