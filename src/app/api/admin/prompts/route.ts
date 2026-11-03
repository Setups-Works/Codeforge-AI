import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { DEFAULT_PROMPTS } from "@/services/ai/prompts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toUuidOrNull } from "@/lib/data-backend";


const upsertSchema = z.object({
  key: z.string().min(1).max(60),
  template: z.string().min(10).max(20_000),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(64).max(32_768),
});

/** Admin: all prompt templates (code defaults merged with DB overrides) */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const overrideMap = new Map<string, { template: string; temperature: number; maxTokens: number }>();
  {    const { data } = await supabaseAdmin().from("prompt_templates").select("key,template,temperature,max_tokens");
    for (const o of (data ?? []) as { key: string; template: string; temperature: number; max_tokens: number }[]) {
      overrideMap.set(o.key, { template: o.template, temperature: o.temperature, maxTokens: o.max_tokens });
    }}

  const prompts = Object.entries(DEFAULT_PROMPTS).map(([key, fallback]) => {
    const override = overrideMap.get(key);
    return {
      key,
      name: fallback.name,
      description: fallback.description,
      template: override?.template ?? fallback.template,
      temperature: override?.temperature ?? fallback.temperature,
      maxTokens: override?.maxTokens ?? fallback.maxTokens,
      overridden: !!override,
    };
  });

  return NextResponse.json({ prompts });
}

/** Admin: override a prompt template */
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const fallback = DEFAULT_PROMPTS[parsed.data.key];
  if (!fallback) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }
    const { error: upErr } = await supabaseAdmin().from("prompt_templates").upsert(
      {
        key: parsed.data.key,
        template: parsed.data.template,
        temperature: parsed.data.temperature,
        max_tokens: parsed.data.maxTokens,
        name: fallback.name,
        description: fallback.description,
        updated_by: toUuidOrNull(session.user.id),
      },
      { onConflict: "key" },
    );
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

/** Admin: reset a prompt back to the code default */
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
    await supabaseAdmin().from("prompt_templates").delete().eq("key", key);
    return NextResponse.json({ ok: true });
}
