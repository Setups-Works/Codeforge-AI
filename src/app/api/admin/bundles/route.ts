import { NextRequest, NextResponse } from "next/server";
import { requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { bundleCreateSchema } from "@/schemas/course";
import { adminListBundles, createBundle } from "@/services/lms-bundles";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  return NextResponse.json({ bundles: await adminListBundles() });
}

export async function POST(req: NextRequest) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  const body = await parseBody(req, bundleCreateSchema);
  if (body.error) return body.error;
  return NextResponse.json(await createBundle(body.data.title), { status: 201 });
}
