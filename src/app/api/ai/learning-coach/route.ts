import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceAiCredit } from "@/services/ai-credits";
import { complete } from "@/services/ai/groq";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRecentDsaCategoryRows } from "@/services/submissions";

interface UserStats {
  level?: number;
  xp?: number;
  solved?: { total?: number; easy?: number; medium?: number; hard?: number };
  streak?: { current?: number };
}

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const credit = await enforceAiCredit(session.user.id, session.user.plan);
  if (credit) return credit;

  let stats: UserStats | undefined;
  {    const { data } = await supabaseAdmin()
      .from("users")
      .select("stats")
      .eq("id", session.user.id)
      .maybeSingle();
    stats = (data as { stats?: UserStats } | null)?.stats;}
  const recentSubs = await getRecentDsaCategoryRows(session.user.id, 30);

  const categoryMap: Record<string, { attempted: number; accepted: number }> = {};
  for (const sub of recentSubs) {
    if (!categoryMap[sub.category]) categoryMap[sub.category] = { attempted: 0, accepted: 0 };
    categoryMap[sub.category].attempted++;
    if (sub.status === "Accepted") categoryMap[sub.category].accepted++;
  }

  const weakCategories = Object.entries(categoryMap)
    .filter(([, v]) => v.attempted >= 2 && v.accepted / v.attempted < 0.5)
    .map(([cat]) => cat);

  const result = await complete([
    {
      role: "system",
      content: "You are a personalized AI learning coach for coding interviews. Analyze the user's data and provide actionable guidance. Return JSON only.",
    },
    {
      role: "user",
      content: `Analyze this coder's profile and give personalized coaching:
Level: ${stats?.level ?? 1}
XP: ${stats?.xp ?? 0}
Problems solved: ${stats?.solved?.total ?? 0} (Easy: ${stats?.solved?.easy ?? 0}, Medium: ${stats?.solved?.medium ?? 0}, Hard: ${stats?.solved?.hard ?? 0})
Current streak: ${stats?.streak?.current ?? 0} days
Weak categories: ${weakCategories.join(", ") || "unknown yet"}
Recent activity: ${recentSubs.length} submissions in last 30 days

Return JSON:
{
  "level": "beginner|intermediate|advanced",
  "readinessScore": number,
  "strengths": ["string"],
  "focusAreas": ["string"],
  "weeklyGoal": "string",
  "motivationalMessage": "string",
  "nextSteps": [{ "action": "string", "why": "string", "priority": "high|medium|low" }],
  "estimatedReadyDate": "string"
}`,
    },
  ], { json: true, maxTokens: 1000 });

  try {
    return NextResponse.json({ coaching: JSON.parse(result) });
  } catch {
    return NextResponse.json({ error: "Failed to generate coaching" }, { status: 500 });
  }
}
