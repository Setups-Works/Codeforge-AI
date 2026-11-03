import { NextRequest } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody, respond } from "@/lib/lms/route";
import { sectionSchema } from "@/schemas/course";
import { createSection } from "@/services/lms-courses";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, sectionSchema);
  if (body.error) return body.error;
  return respond(await createSection(id, body.data.title), (section) => ({ section }), 201);
}
