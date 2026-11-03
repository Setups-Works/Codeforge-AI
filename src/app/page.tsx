import { unstable_cache } from "next/cache";
import { listQuestions } from "@/services/questions";
import { Landing, type LandingProblem } from "@/features/marketing/landing";
import { FAQS } from "@/features/marketing/faqs";
import type { Metadata } from "next";
import { getFeatureAccess } from "@/services/feature-access";
import { buildPricingFeatures } from "@/lib/feature-catalog";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, faqLd, graph, howToLd, pageNodes } from "@/lib/seo";

// Statically render the landing and revalidate every 5 minutes. The signed-in
// header state is resolved on the client, so there's no per-request server work
// — this is served straight from the CDN, cutting TTFB/FCP dramatically.
export const revalidate = 300;

/** The landing's "popular problems" preview changes rarely — cache it so the
 *  home page doesn't query the database on every visit (the page stays dynamic only to
 *  reflect the signed-in header state). */
const getLandingProblems = unstable_cache(
  async (): Promise<{ problems: LandingProblem[]; total: number }> => {
    const result = await listQuestions({ page: 1, limit: 6 });
    return {
      problems: result.items.map((item) => ({
        slug: item.slug,
        title: item.title,
        difficulty: item.difficulty,
        category: item.category,
        acceptanceRate: item.acceptanceRate,
      })),
      total: result.total,
    };
  },
  ["landing-problems"],
  { revalidate: 300, tags: ["questions"] },
);

export const metadata: Metadata = {
  title: { absolute: "Setups Works Lab — AI Coding Interview Prep, DSA Practice & Online Compiler" },
  alternates: { canonical: "/" },
};

/** Home graph: WebPage, FAQPage (FAQ rich results) and a HowTo for the core flow. */
const homeJsonLd = graph(
  ...pageNodes({
    url: SITE_URL,
    name: "Setups Works Lab — AI Coding Interview Prep",
    description:
      "Practice DSA problems, run code in 12 languages and get an AI mentor and pair programmer to ace your next technical interview.",
    type: "WebPage",
    speakable: ["h1", "h2"],
  }),
  faqLd(FAQS, `${SITE_URL}/#faq`),
  howToLd({
    id: `${SITE_URL}/#howto`,
    name: "How to prepare for a coding interview with Setups Works Lab",
    description: "A step-by-step routine for interview prep using practice problems, the AI mentor and spaced repetition.",
    steps: [
      { name: "Pick a problem", text: "Choose a DSA problem by topic, difficulty or target company.", url: "/problems" },
      { name: "Solve it in the editor", text: "Write your solution in any of 12 languages and run it against the test cases.", url: "/compiler" },
      { name: "Ask the AI mentor for hints", text: "Get hints specific to your code without being handed the full solution." },
      { name: "Review with spaced repetition", text: "Revisit problems on an SM-2 schedule so the patterns stick." },
    ],
  }),
);

export default async function HomePage() {
  // Real problems for the home page preview — never fail the landing
  let problems: LandingProblem[] = [];
  let totalProblems = 0;
  try {
    const result = await getLandingProblems();
    problems = result.problems;
    totalProblems = result.total;
  } catch {
    // DB unavailable — render the landing without the problems section
  }

  let featuresByPlan: Record<"free" | "go" | "plus", { text: string; included: boolean }[]> | undefined;
  try {
    featuresByPlan = buildPricingFeatures(await getFeatureAccess());
  } catch {
    // Fall back to the landing's built-in defaults if access map is unavailable.
  }

  return (
    <>
      <JsonLd data={homeJsonLd} />
      <Landing
        problems={problems}
        totalProblems={totalProblems}
        featuresByPlan={featuresByPlan}
        paymentsEnabled={!!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}
      />
    </>
  );
}
