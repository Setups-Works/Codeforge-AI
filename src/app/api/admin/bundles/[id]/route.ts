import { NextRequest, NextResponse } from "next/server";
import { isUuid, notFound, requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { bundlePatchSchema } from "@/schemas/course";
import { adminGetBundle, deleteBundle, updateBundle } from "@/services/lms-bundles";
import { pingIndexNow } from "@/lib/indexnow";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const bundle = await adminGetBundle(id);
  return bundle ? NextResponse.json({ bundle }) : notFound();
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await parseBody(req, bundlePatchSchema);
  if (body.error) return body.error;
  const result = await updateBundle(id, body.data);
  if (result.ok) {
    const bundle = await adminGetBundle(id);
    if (bundle?.status === "published" || body.data.status) await pingIndexNow([`/bundles/${bundle?.slug}`, "/courses"]);
  }
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const result = await deleteBundle(id);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
}
