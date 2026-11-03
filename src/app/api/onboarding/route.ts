import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getPostHogServer } from "@/lib/posthog-server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  const { goal, level, topics, companies, dailyGoal } = body;

  if (!goal || !level || !topics?.length || !dailyGoal) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  {    await supabaseAdmin()
      .from("users")
      .update({
        onboarding: {
          completed: true,
          goal,
          level,
          topics,
          companies: companies ?? [],
          dailyGoal,
          completedAt: new Date().toISOString(),
        },
      })
      .eq("id", session.user.id);}

  const posthog = getPostHogServer();
  posthog?.capture({
    distinctId: session.user.id,
    event: "onboarding_completed",
    properties: { goal, level, topics, daily_goal: dailyGoal, companies_count: companies?.length ?? 0 },
  });

  const res = NextResponse.json({ ok: true });
  // Fallback cookie so middleware can allow /dashboard even if JWT update() is slow
  res.cookies.set("ob_done", "1", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
  });
  return res;
}
