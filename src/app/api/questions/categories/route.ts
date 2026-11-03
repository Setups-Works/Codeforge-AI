import { NextResponse } from "next/server";
import { cached } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Published question counts per category (powers the Problems chips row) */
export async function GET() {
  const categories = await cached("questions:categories", 60, async () => {
      const { data } = await supabaseAdmin()
        .from("questions")
        .select("category")
        .eq("is_published", true);
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as { category: string }[]) {
        counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  });
  return NextResponse.json({ categories });
}
