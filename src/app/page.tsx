import { unstable_cache } from "next/cache";
import { listQuestions } from "@/services/questions";
import { Landing, type LandingProblem } from "@/features/marketing/landing";
import { FAQS } from "@/features/marketing/faqs";
import type { Metadata } from "next";
import { getFeatureAccess } from "@/services/feature-access";
import { buildPricingFeatures } from "@/lib/feature-catalog";
import { JsonLd } from "@/components/json-ld";
import { lmsEnabled } from "@/lib/lms/flag";
import { LEARN_FAQS, type LandingLearn } from "@/features/marketing/lms-content";
import { countPlanIncludedCourses, listPublishedCourses } from "@/services/lms-catalog";
import { listPublishedBundles } from "@/services/lms-bundles";
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

/** Course teaser data for the landing page, cached like the problems preview. */
const getLandingLearn = unstable_cache(
  async (): Promise<LandingLearn> => {
    const [courses, bundles, planIncluded] = await Promise.all([
      listPublishedCourses({ page: 1, limit: 3 }),
      listPublishedBundles().catch(() => []),
      countPlanIncludedCourses().catch(() => 0),
    ]);
    return {
      courses: courses.items.slice(0, 3).map((c) => ({
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        thumbnailUrl: c.thumbnailUrl,
        level: c.level,
        priceInr: c.priceInr,
        compareAtInr: c.compareAtInr,
        isFree: c.isFree,
        instructorName: c.instructorName,
        lessonCount: c.lessonCount,
        durationS: c.durationS,
        ratingAvg: c.ratingAvg,
        ratingCount: c.ratingCount,
      })),
      total: courses.total,
      hasPlanIncluded: planIncluded > 0,
      hasBundles: bundles.length > 0,
    };
  },
  ["landing-learn"],
  { revalidate: 300, tags: ["courses"] },
);

export const metadata: Metadata = {
  title: { absolute: "Setups Works Lab — AI Coding Interview Prep, DSA Practice & Online Compiler" },
  alternates: { canonical: "/" },
};

/** Home graph: WebPage, FAQPage (FAQ rich results) and a HowTo for the core flow. */
const buildHomeJsonLd = (extraFaqs: typeof FAQS) => graph(
  ...pageNodes({
    url: SITE_URL,
    name: "Setups Works Lab — AI Coding Interview Prep",
    description:
      "Practice DSA problems, run code in 12 languages and get an AI mentor and pair programmer to ace your next technical interview.",
    type: "WebPage",
    speakable: ["h1", "h2"],
  }),
  faqLd([...FAQS, ...extraFaqs], `${SITE_URL}/#faq`),
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

  // The Courses section (and its FAQs) only exist while the LMS is on and has something to show.
  let learn: LandingLearn | undefined;
  if (lmsEnabled()) {
    try {
      const data = await getLandingLearn();
      if (data.total > 0) learn = data;
    } catch {
      // DB unavailable — render the landing without the courses section
    }
  }
  const extraFaqs = learn ? LEARN_FAQS : [];

  return (
    <>
      <JsonLd data={buildHomeJsonLd(extraFaqs)} />
      <Landing
        learn={learn}
        extraFaqs={extraFaqs}
        problems={problems}
        totalProblems={totalProblems}
        featuresByPlan={featuresByPlan}
        paymentsEnabled={!!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}
      />
    </>
  );
}
