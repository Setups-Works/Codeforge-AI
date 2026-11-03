import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
resolveAccessMap,
canUse,
requiredPlan,
featureLabel,
type AccessMap,
type FeatureId,
} from "@/lib/feature-catalog";
import { PLANS,type PlanId } from "@/lib/plans";

export const FEATURE_ACCESS_TAG = "feature-access";

/** Resolved feature-access map (admin overrides merged over defaults), cached. */
export const getFeatureAccess = unstable_cache(
  async (): Promise<AccessMap> => {
    try {
        const { data } = await supabaseAdmin()
          .from("feature_access")
          .select("access")
          .eq("id", "global")
          .maybeSingle();
        return resolveAccessMap(
          (data as { access?: Record<string, string> } | null)?.access ?? null,
        );
    } catch (err) {
      console.error("[feature-access] Could not load from DB:", err);
      return resolveAccessMap(null);
    }
  },
  [FEATURE_ACCESS_TAG],
  { revalidate: 60, tags: [FEATURE_ACCESS_TAG] },
);

/** True if the plan can use the feature, reading the resolved (DB) access map. */
export async function userCanUse(plan: string, id: FeatureId): Promise<boolean> {
  const access = await getFeatureAccess();
  return canUse(access, plan, id);
}

/**
 * Page-level gate for server components. Resolves the signed-in user's plan and
 * whether they can use the feature, plus the plan they'd need to upgrade to.
 */
export async function checkPageFeature(id: FeatureId): Promise<{
  allowed: boolean;
  plan: PlanId;
  requiredPlan: PlanId;
}> {
  const [access, session] = await Promise.all([getFeatureAccess(), auth()]);
  const plan = ((session?.user?.plan as PlanId) ?? "free");
  return { allowed: canUse(access, plan, id), plan, requiredPlan: requiredPlan(access, id) };
}

/**
 * Hard server guard. Returns a 403 NextResponse with an upgrade payload when
 * the plan lacks the feature, otherwise null. Mirrors enforceAiCredit so routes
 * can `if (gate) return gate;`.
 */
export async function requireFeature(plan: string, id: FeatureId): Promise<NextResponse | null> {
  const access = await getFeatureAccess();
  if (canUse(access, plan, id)) return null;
  const need = requiredPlan(access, id);
  return NextResponse.json(
    {
      error: `${featureLabel(id)} is available on the ${PLANS[need as PlanId]?.name ?? need} plan. Upgrade to unlock it.`,
      code: "upgrade_required",
      feature: id,
      requiredPlan: need,
    },
    { status: 403 },
  );
}
