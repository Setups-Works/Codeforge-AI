import { NextRequest,NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/api-auth";
import { FEATURE_CATALOG,resolveAccessMap } from "@/lib/feature-catalog";
import { FEATURE_ACCESS_TAG } from "@/services/feature-access";
import { supabaseAdmin } from "@/lib/supabase/admin";


async function readAccess(): Promise<Record<string, string> | null> {
    const { data } = await supabaseAdmin().from("feature_access").select("access").eq("id", "global").maybeSingle();
    return (data as { access?: Record<string, string> } | null)?.access ?? null;
}

/** Return the full catalog plus the currently resolved access map. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({
    catalog: FEATURE_CATALOG,
    access: resolveAccessMap(await readAccess()),
  });
}

/** Save the admin-chosen minimum plan per feature. */
export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: { access?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate and keep only known catalog ids + valid plans.
  const clean = resolveAccessMap(body.access ?? {});

  {    await supabaseAdmin().from("feature_access").upsert({ id: "global", access: clean }, { onConflict: "id" });}
  revalidateTag(FEATURE_ACCESS_TAG);

  return NextResponse.json({ ok: true, access: clean });
}
