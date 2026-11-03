import { NextResponse } from "next/server";
import { PLANS,type PlanId } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";


/** Read the current period's generated-problem count from the active backend. */
async function readGenCount(userId: string, period: string): Promise<number> {
    const { data } = await supabaseAdmin()
      .from("gen_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("period", period)
      .maybeSingle();
    return (data as { count: number } | null)?.count ?? 0;
}

/** Current period, "YYYY-MM" (UTC) — matches the AI-credit period. */
export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Monthly problem-generation allowance for a plan (Infinity = unlimited). */
export function genAllowance(plan: string): number {
  const limit = (PLANS[plan as PlanId] ?? PLANS.free).limits.problemGenPerMonth;
  return limit < 0 ? Infinity : limit;
}

export interface GenUsageSummary {
  period: string;
  used: number;
  allowance: number | null; // null = unlimited
  remaining: number | null;
  unlimited: boolean;
}

export async function getGenUsage(userId: string, plan: string): Promise<GenUsageSummary> {
  const period = currentPeriod();
  const used = await readGenCount(userId, period);
  const allowance = genAllowance(plan);
  const unlimited = !Number.isFinite(allowance);
  return {
    period,
    used,
    allowance: unlimited ? null : allowance,
    remaining: unlimited ? null : Math.max(0, allowance - used),
    unlimited,
  };
}

/**
 * Enforce the monthly problem-generation quota for a request that will create
 * `count` problems. Returns a 402 response when it would exceed the allowance;
 * otherwise increments the counter and returns null.
 */
export async function enforceGenQuota(
  userId: string,
  plan: string,
  count: number,
): Promise<NextResponse | null> {
  const allowance = genAllowance(plan);
  if (Number.isFinite(allowance)) {
    const used = await readGenCount(userId, currentPeriod());
    if (used + count > allowance) {
      const remaining = Math.max(0, allowance - used);
      return NextResponse.json(
        {
          error:
            remaining === 0
              ? `You've reached your monthly limit of ${allowance} generated problems. Upgrade your plan to generate more.`
              : `This would exceed your monthly limit of ${allowance} generated problems (${remaining} left). Upgrade your plan for more.`,
          code: "gen_quota_exhausted",
          remaining,
          allowance,
        },
        { status: 402 },
      );
    }
  }
    const { error } = await supabaseAdmin().rpc("increment_gen_usage", {
      p_user: userId,
      p_period: currentPeriod(),
      p_count: count,
    });
    if (error) throw new Error(error.message);
    return null;
}
