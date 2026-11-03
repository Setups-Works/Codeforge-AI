import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const { vote } = await req.json();
  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: "vote must be 1 or -1" }, { status: 400 });
  }

  const uid = session.user.id;
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("discussions")
      .select("upvotes,downvotes")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const up = new Set((data as { upvotes: string[] | null }).upvotes ?? []);
    const down = new Set((data as { downvotes: string[] | null }).downvotes ?? []);
    if (vote === 1) {
      if (up.has(uid)) up.delete(uid);
      else { up.add(uid); down.delete(uid); }
    } else {
      if (down.has(uid)) down.delete(uid);
      else { down.add(uid); up.delete(uid); }
    }
    const upArr = [...up];
    const downArr = [...down];
    const { error: upErr } = await sb
      .from("discussions")
      .update({ upvotes: upArr, downvotes: downArr })
      .eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({
      upvotes: upArr.length,
      downvotes: downArr.length,
      userVote: up.has(uid) ? 1 : down.has(uid) ? -1 : 0,
    });
}
