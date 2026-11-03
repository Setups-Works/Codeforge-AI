import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { requireFeature } from "@/services/feature-access";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CATEGORIES = [
  "Array", "String", "Hash Table", "Linked List", "Stack", "Queue",
  "Tree", "Graph", "Dynamic Programming", "Greedy", "Backtracking",
  "Binary Search", "Two Pointers", "Sliding Window", "Heap", "Trie",
  "Math", "Bit Manipulation", "Recursion", "Sorting",
];

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const gate = await requireFeature(session.user.plan, "skillAnalytics");
  if (gate) return gate;

  const categoryStats: Record<string, { attempted: number; accepted: number }> = {};

  {    const sb = supabaseAdmin();
    const { data: subs } = await sb
      .from("submissions")
      .select("question_id,status")
      .eq("user_id", session.user.id)
      .eq("kind", "dsa")
      .not("question_id", "is", null);
    const rows = (subs ?? []) as { question_id: string; status: string }[];
    const qIds = [...new Set(rows.map((r) => r.question_id))];
    const catMap = new Map<string, string>();
    if (qIds.length) {
      const { data: qs } = await sb.from("questions").select("id,category").in("id", qIds);
      for (const q of (qs ?? []) as { id: string; category: string }[]) catMap.set(q.id, q.category);
    }
    for (const sub of rows) {
      const cat = catMap.get(sub.question_id);
      if (!cat) continue;
      if (!categoryStats[cat]) categoryStats[cat] = { attempted: 0, accepted: 0 };
      categoryStats[cat].attempted++;
      if (sub.status === "Accepted") categoryStats[cat].accepted++;
    }}

  const analysis = Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    attempted: stats.attempted,
    accepted: stats.accepted,
    rate: stats.attempted > 0 ? Math.round((stats.accepted / stats.attempted) * 100) : 0,
  }));

  analysis.sort((a, b) => a.rate - b.rate);

  const weakAreas = analysis.filter((a) => a.rate < 50 && a.attempted >= 2);
  const strongAreas = analysis.filter((a) => a.rate >= 80 && a.attempted >= 3);
  const untouched = CATEGORIES.filter((c) => !categoryStats[c]);

  const recommendations = [
    ...weakAreas.slice(0, 3).map((a) => ({
      category: a.category,
      reason: `Low acceptance rate (${a.rate}%) — needs more practice`,
      priority: "high" as const,
    })),
    ...untouched.slice(0, 2).map((c) => ({
      category: c,
      reason: "Never attempted — explore this topic",
      priority: "medium" as const,
    })),
  ];

  return NextResponse.json({ analysis, weakAreas, strongAreas, untouched, recommendations });
}
