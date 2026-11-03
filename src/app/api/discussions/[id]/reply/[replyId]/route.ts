import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { type SbReply } from "@/services/discussions-store";


export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id, replyId } = await params;
    const sb = supabaseAdmin();
    const { data } = await sb.from("discussions").select("replies").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const replies = ((data as { replies: SbReply[] | null }).replies ?? []);
    const reply = replies.find((r) => r._id === replyId);
    if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    const isOwner = reply.author === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Drop the reply and any direct sub-replies referencing it.
    const next = replies.filter((r) => r._id !== replyId && r.parentReply !== replyId);
    const { error: upErr } = await sb.from("discussions").update({ replies: next }).eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
