import { NextRequest } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody, respond } from "@/lib/lms/route";
import { reorderSchema } from "@/schemas/course";
import { reorder } from "@/services/lms-courses";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, reorderSchema);
  if (body.error) return body.error;
  return respond(await reorder(id, body.data), () => ({ ok: true }));
}
