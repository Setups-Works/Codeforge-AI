import { NextRequest,NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { SITE_CONFIG_TAG,maskConfig,MASKED,SENSITIVE_FIELDS } from "@/lib/site-config";
import type { SiteConfigDoc } from "@/types/db";
import { supabaseAdmin } from "@/lib/supabase/admin";


async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
    const { data } = await supabaseAdmin().from("site_config").select("config").eq("id", "global").maybeSingle();
    const cfg = (data as { config?: SiteConfigDoc } | null)?.config;
    return NextResponse.json(cfg ? maskConfig(cfg) : {});
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Strip masked sentinel — don't overwrite secrets the admin didn't touch
  const update: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.includes(key as keyof SiteConfigDoc)) {
      if (val !== MASKED && val !== "") update[key] = val;
    } else {
      update[key] = val;
    }
  }

  {    const sb = supabaseAdmin();
    const { data } = await sb.from("site_config").select("config").eq("id", "global").maybeSingle();
    const current = (data as { config?: Record<string, unknown> } | null)?.config ?? {};
    const merged = { ...current, ...update };
    await sb.from("site_config").upsert({ id: "global", config: merged }, { onConflict: "id" });}

  revalidateTag(SITE_CONFIG_TAG);
  return NextResponse.json({ ok: true });
}
