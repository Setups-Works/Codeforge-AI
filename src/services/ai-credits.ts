import { NextResponse } from "next/server";
import { PLANS,type PlanId } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";


/** Read the current period's used count from the active backend. */
async function readAiUsed(userId: string, period: string): Promise<number> {
    const { data } = await supabaseAdmin()
      .from("ai_usage")
      .select("used")
      .eq("user_id", userId)
      .eq("period", period)
      .maybeSingle();
    return (data as { used: number } | null)?.used ?? 0;
}

/** Current billing period, "YYYY-MM" (UTC). */
export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Monthly AI-credit allowance for a plan (Infinity = unlimited). */
export function monthlyAllowance(plan: string): number {
  const p = PLANS[plan as PlanId] ?? PLANS.free;
  const perDay = p.limits.aiCallsPerDay;
  return perDay < 0 ? Infinity : perDay * 30;
}

export interface AiUsageSummary {
  period: string;
  used: number;
  allowance: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
  unlimited: boolean;
}

export async function getAiUsage(userId: string, plan: string): Promise<AiUsageSummary> {
  const period = currentPeriod();
  const used = await readAiUsed(userId, period);
  const allowance = monthlyAllowance(plan);
  const unlimited = !Number.isFinite(allowance);
  return {
    period,
    used,
    allowance: unlimited ? null : allowance,
    remaining: unlimited ? null : Math.max(0, allowance - used),
    unlimited,
  };
}

/** Increment usage by one for the current period. */
export async function consumeAiCredit(userId: string): Promise<void> {
    const { error } = await supabaseAdmin().rpc("increment_ai_usage", {
      p_user: userId,
      p_period: currentPeriod(),
    });
    if (error) throw new Error(error.message);
    return;
}

/**
 * Enforce and consume one AI credit. Returns a 402 response when the monthly
 * allowance is exhausted; otherwise increments usage and returns null.
 * Mirrors enforceRateLimit so AI routes can `if (res) return res`.
 */
export async function enforceAiCredit(
  userId: string,
  plan: string,
): Promise<NextResponse | null> {
  const allowance = monthlyAllowance(plan);
  if (Number.isFinite(allowance)) {
    const used = await readAiUsed(userId, currentPeriod());
    if (used >= allowance) {
      return NextResponse.json(
        {
          error: `You've used all ${allowance} AI credits for this month. Upgrade your plan for more.`,
          code: "ai_credits_exhausted",
        },
        { status: 402 },
      );
    }
  }
  await consumeAiCredit(userId);
  return null;
}
