import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getGroqClient } from "@/services/ai/groq";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { type SbReply } from "@/services/discussions-store";


export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  let title: string;
  let content: string;
  let replyText: string;

  {    const { data } = await supabaseAdmin()
      .from("discussions")
      .select("title,content,replies")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const d = data as { title: string; content: string; replies: SbReply[] | null };
    title = d.title;
    content = d.content;
    replyText = (d.replies ?? []).map((r) => r.content).join("\n---\n");}

  const prompt = `Summarize this coding discussion in 3-4 concise bullet points. Focus on key insights, solutions mentioned, and consensus.\n\nTitle: ${title}\n\nMain post: ${content}\n\nReplies:\n${replyText || "No replies yet."}`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });

  const summary = completion.choices[0]?.message?.content ?? "";
  {    await supabaseAdmin()
      .from("discussions")
      .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() })
      .eq("id", id);}

  return NextResponse.json({ summary });
}
