import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sanitizeUserContent,cap } from "@/lib/sanitize";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { attachQuestions,type SbNoteRow } from "@/services/notes-store";


export async function GET(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const questionId = req.nextUrl.searchParams.get("question") ?? undefined;
    const sb = supabaseAdmin();
    let q = sb
      .from("notes")
      .select("id,question_id,challenge_id,title,content,is_private,tags,created_at,updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });
    if (questionId) q = q.eq("question_id", questionId);
    const { data, error: qErr } = await q;
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    const notes = await attachQuestions((data ?? []) as SbNoteRow[]);
    return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json() as Record<string, unknown>;
  const title = cap(String(body.title ?? "Untitled Note"), 200);
  const content = cap(String(body.content ?? ""), 100_000);
  const isPrivate = body.isPrivate !== false;
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).slice(0, 10).map((t) => cap(String(t), 40))
    : [];
  const questionId = body.questionId ? String(body.questionId) : undefined;
  const challengeId = body.challengeId ? String(body.challengeId) : undefined;
  const cleanTitle = sanitizeUserContent(title) || "Untitled Note";
  const cleanContent = sanitizeUserContent(content);
  const cleanTags = tags.map(sanitizeUserContent);
    const { data, error: insErr } = await supabaseAdmin()
      .from("notes")
      .insert({
        user_id: session.user.id,
        question_id: questionId ?? null,
        challenge_id: challengeId ?? null,
        title: cleanTitle,
        content: cleanContent,
        is_private: isPrivate,
        tags: cleanTags,
      })
      .select("id,question_id,challenge_id,title,content,is_private,tags,created_at,updated_at")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    const [note] = await attachQuestions([data as SbNoteRow]);
    return NextResponse.json({ note }, { status: 201 });
}
