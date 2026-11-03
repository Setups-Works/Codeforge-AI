import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { PLANS,type PlanId } from "@/lib/plans";
import { getPostHogServer } from "@/lib/posthog-server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { plan } = await req.json();
  if (plan !== "go" && plan !== "plus") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const trialDays = PLANS[plan as PlanId].trialDays;
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  {    const sb = supabaseAdmin();
    const { data: user } = await sb
      .from("users")
      .select("plan,trial_ends_at")
      .eq("id", session.user.id)
      .maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if ((user as { trial_ends_at: string | null }).trial_ends_at) {
      return NextResponse.json({ error: "Trial already used" }, { status: 409 });
    }
    await sb
      .from("users")
      .update({
        plan,
        trial_ends_at: trialEndsAt.toISOString(),
        plan_expires_at: trialEndsAt.toISOString(),
      })
      .eq("id", session.user.id);}

  const posthog = getPostHogServer();
  posthog?.capture({
    distinctId: session.user.id,
    event: "trial_started",
    properties: { plan, trial_days: trialDays },
  });

  return NextResponse.json({ ok: true, plan, trialEndsAt });
}
