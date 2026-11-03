import type { PlanId } from "./plans";

/**
 * Master catalog of every plan-gated feature and AI tool. This is the single
 * source of truth that drives BOTH the pricing page and access control. Admins
 * can override each item's minimum plan (stored in the FeatureAccess doc); the
 * `defaultMinPlan` here is the fallback when there is no override.
 *
 * Keep this file framework-free (no next/server) so it can be
 * imported from client components.
 */

export type FeatureId =
  // Practice
  | "coreProblems"
  | "progressTracking"
  | "unlimitedProblems"
  | "unlimitedBookmarks"
  | "spacedRepetition"
  | "companyPrep"
  // Analytics
  | "skillAnalytics"
  | "advancedAnalytics"
  // Interview
  | "mockInterview"
  // Community
  | "communityFull"
  | "prioritySupport"
  // AI tools (kind: "tool")
  | "aiMentor"
  | "aiCodeReview"
  | "aiComplexity"
  | "aiRoadmap"
  | "aiStudyPlan"
  | "aiLearningCoach"
  | "aiGenerateQuestions"
  | "aiPairProgrammer"
  | "aiContestGenerator"
  | "aiProjectReviewer"
  | "aiResumeReviewer";

export interface CatalogItem {
  id: FeatureId;
  label: string;
  description: string;
  group: "Practice" | "Analytics" | "Interview" | "Community" | "AI Tools";
  kind: "feature" | "tool";
  defaultMinPlan: PlanId;
  /** Show this row in the pricing cards' feature checklist. */
  pricing: boolean;
}

export const FEATURE_CATALOG: CatalogItem[] = [
  // ── Practice ──────────────────────────────────────────────
  { id: "coreProblems", label: "Practice problems & compiler", description: "Solve problems and run code in 12 languages.", group: "Practice", kind: "feature", defaultMinPlan: "free", pricing: true },
  { id: "progressTracking", label: "Progress tracking & streaks", description: "XP, levels, badges and daily streaks.", group: "Practice", kind: "feature", defaultMinPlan: "free", pricing: true },
  { id: "unlimitedProblems", label: "Unlimited problems", description: "Access the entire problem bank with solutions.", group: "Practice", kind: "feature", defaultMinPlan: "go", pricing: true },
  { id: "unlimitedBookmarks", label: "Unlimited bookmarks & notes", description: "No caps on saved problems and notes.", group: "Practice", kind: "feature", defaultMinPlan: "go", pricing: true },
  { id: "spacedRepetition", label: "Smart Revision (SM-2)", description: "Spaced-repetition review scheduling.", group: "Practice", kind: "feature", defaultMinPlan: "go", pricing: true },
  { id: "companyPrep", label: "Company prep lists", description: "Curated company-specific question sets.", group: "Practice", kind: "feature", defaultMinPlan: "go", pricing: true },
  // ── Analytics ─────────────────────────────────────────────
  { id: "skillAnalytics", label: "Skill analytics dashboard", description: "Topic mastery map and weakness detection.", group: "Analytics", kind: "feature", defaultMinPlan: "go", pricing: true },
  { id: "advancedAnalytics", label: "Advanced analytics & predictions", description: "Readiness predictions and deeper insights.", group: "Analytics", kind: "feature", defaultMinPlan: "plus", pricing: true },
  // ── Interview ─────────────────────────────────────────────
  { id: "mockInterview", label: "Mock interview simulator", description: "Timed mock interviews with AI feedback.", group: "Interview", kind: "feature", defaultMinPlan: "plus", pricing: true },
  // ── Community ─────────────────────────────────────────────
  { id: "communityFull", label: "Full community access", description: "Post in the forum and discussions.", group: "Community", kind: "feature", defaultMinPlan: "go", pricing: false },
  { id: "prioritySupport", label: "Priority support", description: "Faster support response times.", group: "Community", kind: "feature", defaultMinPlan: "plus", pricing: true },
  // ── AI Tools ──────────────────────────────────────────────
  { id: "aiMentor", label: "AI Mentor", description: "Contextual hints and debugging chat.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiCodeReview", label: "Code Review", description: "Correctness, style and edge-case review.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiComplexity", label: "Complexity Visualizer", description: "Big-O analysis for any snippet.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiRoadmap", label: "Roadmap Generator", description: "A guided path to your target role.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiStudyPlan", label: "Study Planner", description: "A structured plan toward your target date.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiLearningCoach", label: "Learning Coach", description: "Guidance tuned to your weak areas.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiGenerateQuestions", label: "Generate Questions", description: "Create practice problems from a prompt.", group: "AI Tools", kind: "tool", defaultMinPlan: "free", pricing: false },
  { id: "aiPairProgrammer", label: "AI Pair Programmer", description: "Real-time, conversational coding help.", group: "AI Tools", kind: "tool", defaultMinPlan: "plus", pricing: true },
  { id: "aiContestGenerator", label: "Contest Generator", description: "Spin up a custom coding contest.", group: "AI Tools", kind: "tool", defaultMinPlan: "plus", pricing: true },
  { id: "aiProjectReviewer", label: "Project Reviewer", description: "An AI review of your projects.", group: "AI Tools", kind: "tool", defaultMinPlan: "plus", pricing: true },
  { id: "aiResumeReviewer", label: "Resume Analyzer", description: "Feedback tuned to engineering roles.", group: "AI Tools", kind: "tool", defaultMinPlan: "plus", pricing: true },
];

export const CATALOG_BY_ID: Record<FeatureId, CatalogItem> = Object.fromEntries(
  FEATURE_CATALOG.map((c) => [c.id, c]),
) as Record<FeatureId, CatalogItem>;

export const PLAN_ORDER: PlanId[] = ["free", "go", "plus"];

/** Default access map (used as fallback and to seed admin overrides). */
export function defaultAccess(): Record<FeatureId, PlanId> {
  return Object.fromEntries(
    FEATURE_CATALOG.map((c) => [c.id, c.defaultMinPlan]),
  ) as Record<FeatureId, PlanId>;
}

/**
 * Merge admin overrides over the defaults, ignoring unknown ids and invalid
 * plan values. Always returns a complete map for every catalog id.
 */
export type AccessMap = Record<FeatureId, PlanId>;

export function resolveAccessMap(overrides?: Partial<Record<string, string>> | null): AccessMap {
  const map = defaultAccess();
  if (overrides) {
    for (const item of FEATURE_CATALOG) {
      const v = overrides[item.id];
      if (v === "free" || v === "go" || v === "plus") map[item.id] = v;
    }
  }
  return map;
}

export function planRank(plan: string | null | undefined): number {
  const i = PLAN_ORDER.indexOf((plan as PlanId) ?? "free");
  return i < 0 ? 0 : i;
}

/** Does `plan` unlock the feature, given the resolved access map? */
export function canUse(access: AccessMap, plan: string | null | undefined, id: FeatureId): boolean {
  return planRank(plan) >= planRank(access[id]);
}

/** The minimum plan required for a feature under the current access map. */
export function requiredPlan(access: AccessMap, id: FeatureId): PlanId {
  return access[id] ?? CATALOG_BY_ID[id]?.defaultMinPlan ?? "free";
}

export function featureLabel(id: FeatureId): string {
  return CATALOG_BY_ID[id]?.label ?? id;
}

export interface PricingRow {
  text: string;
  included: boolean;
}

/**
 * Build each plan's pricing-card checklist from the catalog + access map.
 * Only items flagged `pricing` are shown; `included` reflects whether the plan
 * unlocks the item under the (possibly admin-overridden) access map.
 */
export function buildPricingFeatures(access: AccessMap): Record<PlanId, PricingRow[]> {
  const items = FEATURE_CATALOG.filter((c) => c.pricing);
  const forPlan = (plan: PlanId): PricingRow[] =>
    items.map((c) => ({ text: c.label, included: canUse(access, plan, c.id) }));
  return { free: forPlan("free"), go: forPlan("go"), plus: forPlan("plus") };
}
