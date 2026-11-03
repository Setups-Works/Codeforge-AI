import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { attachRefs,type SbBookmarkRow } from "@/services/bookmarks-store";


export async function GET(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const kind = req.nextUrl.searchParams.get("kind") ?? undefined;
  const list = req.nextUrl.searchParams.get("list") ?? undefined;
    let q = supabaseAdmin()
      .from("bookmarks")
      .select("id,kind,list,question_id,challenge_id,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    if (list) q = q.eq("list", list);
    const { data, error: qErr } = await q;
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    const bookmarks = await attachRefs((data ?? []) as SbBookmarkRow[]);
    return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  const { kind, id, list = "Saved" } = body;

  if (!kind || !id) {
    return NextResponse.json({ error: "kind and id required" }, { status: 400 });
  }
    const sb = supabaseAdmin();
    const col = kind === "question" ? "question_id" : kind === "challenge" ? "challenge_id" : null;
    if (!col) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    const { data: existing } = await sb
      .from("bookmarks")
      .select("id")
      .eq("user_id", session.user.id)
      .eq(col, id)
      .maybeSingle();
    if (existing) return NextResponse.json({ bookmark: existing, created: false });
    const { data, error: insErr } = await sb
      .from("bookmarks")
      .insert({ user_id: session.user.id, kind, list, [col]: id })
      .select("id,kind,list,question_id,challenge_id,created_at")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    const [bookmark] = await attachRefs([data as SbBookmarkRow]);
    return NextResponse.json({ bookmark, created: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  const { kind, id } = body;

  if (!kind || !id) {
    return NextResponse.json({ error: "kind and id required" }, { status: 400 });
  }
    const col = kind === "question" ? "question_id" : kind === "challenge" ? "challenge_id" : null;
    if (!col) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    await supabaseAdmin()
      .from("bookmarks")
      .delete()
      .eq("user_id", session.user.id)
      .eq(col, id);
    return NextResponse.json({ ok: true });
}
