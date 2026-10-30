import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { Discussion } from "@/models";
import { getGroqClient } from "@/services/ai/groq";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { backendFor } from "@/lib/data-backend";
import { type SbReply } from "@/services/discussions-store";

const be = () => backendFor("discussions");

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

  if (be() === "supabase") {
    const { data } = await supabaseAdmin()
      .from("discussions")
      .select("title,content,replies")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const d = data as { title: string; content: string; replies: SbReply[] | null };
    title = d.title;
    content = d.content;
    replyText = (d.replies ?? []).map((r) => r.content).join("\n---\n");
  } else {
    await connectDB();
    const discussion = await Discussion.findById(id).lean();
    if (!discussion) return NextResponse.json({ error: "Not found" }, { status: 404 });
    title = discussion.title;
    content = discussion.content;
    replyText = discussion.replies.map((r) => r.content).join("\n---\n");
  }

  const prompt = `Summarize this coding discussion in 3-4 concise bullet points. Focus on key insights, solutions mentioned, and consensus.\n\nTitle: ${title}\n\nMain post: ${content}\n\nReplies:\n${replyText || "No replies yet."}`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });

  const summary = completion.choices[0]?.message?.content ?? "";
  if (be() === "supabase") {
    await supabaseAdmin()
      .from("discussions")
      .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() })
      .eq("id", id);
  } else {
    await Discussion.findByIdAndUpdate(id, { aiSummary: summary, aiSummaryAt: new Date() });
  }

  return NextResponse.json({ summary });
}
