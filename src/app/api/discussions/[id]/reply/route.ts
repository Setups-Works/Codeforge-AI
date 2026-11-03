import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAuthors,type SbReply } from "@/services/discussions-store";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const { content, parentReplyId } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
    const sb = supabaseAdmin();
    const { data } = await sb.from("discussions").select("replies").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const replies = ((data as { replies: SbReply[] | null }).replies ?? []).slice();
    const newReply: SbReply = {
      _id: randomUUID(),
      author: session.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      ...(parentReplyId ? { parentReply: parentReplyId } : {}),
    };
    replies.push(newReply);
    const { error: upErr } = await sb.from("discussions").update({ replies }).eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const authors = await fetchAuthors([session.user.id]);
    const reply = {
      _id: newReply._id,
      author: authors.get(session.user.id) ?? null,
      content: newReply.content,
      parentReply: newReply.parentReply ?? null,
      createdAt: newReply.createdAt,
    };
    return NextResponse.json({ reply }, { status: 201 });
}
