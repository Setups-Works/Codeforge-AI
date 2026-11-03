import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface PlanQuestion {
  slug: string;
  title: string;
  difficulty: string;
  category: string;
}

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  let easy: PlanQuestion | null;
  let medium: PlanQuestion | null;
  let hard: PlanQuestion | null;
  let weakCategory: string | undefined;

  {    const sb = supabaseAdmin();
    const { data: subs } = await sb
      .from("submissions")
      .select("question_id")
      .eq("user_id", session.user.id)
      .eq("kind", "dsa")
      .eq("status", "Accepted")
      .not("question_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);
    const solvedIds = [...new Set(((subs ?? []) as { question_id: string }[]).map((s) => s.question_id))];

    const categoryCounts: Record<string, number> = {};
    if (solvedIds.length) {
      const { data: qs } = await sb.from("questions").select("id,category").in("id", solvedIds);
      for (const q of (qs ?? []) as { id: string; category: string }[]) {
        categoryCounts[q.category] = (categoryCounts[q.category] ?? 0) + 1;
      }
    }
    weakCategory = Object.entries(categoryCounts).sort((a, b) => a[1] - b[1])[0]?.[0];

    const pick = async (difficulty: string, useCategory: boolean): Promise<PlanQuestion | null> => {
      let q = sb.from("questions").select("id,slug,title,difficulty,category")
        .eq("is_published", true).eq("difficulty", difficulty);
      if (useCategory && weakCategory) q = q.eq("category", weakCategory);
      const { data } = await q.limit(50);
      const candidates = ((data ?? []) as (PlanQuestion & { id: string })[]).filter((c) => !solvedIds.includes(c.id));
      const c = candidates[0];
      return c ? { slug: c.slug, title: c.title, difficulty: c.difficulty, category: c.category } : null;
    };
    [easy, medium, hard] = await Promise.all([pick("Easy", true), pick("Medium", false), pick("Hard", false)]);}

  const tasks = [easy, medium, hard].filter(Boolean).map((q) => ({
    question: q,
    estimatedMins: q!.difficulty === "Easy" ? 15 : q!.difficulty === "Medium" ? 30 : 45,
  }));

  const totalMins = tasks.reduce((sum, t) => sum + t.estimatedMins, 0);

  return NextResponse.json({
    date: new Date().toISOString().slice(0, 10),
    tasks,
    totalMins,
    focus: weakCategory ?? "General Practice",
  });
}
