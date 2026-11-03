import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Sparkles } from "@/components/icons";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/public-header";
import { ProblemsFilters } from "@/features/problems/problems-filters";
import { ProblemsList } from "@/features/problems/problems-list";
import { CategoryChips } from "@/features/problems/category-chips";
import { JsonLd } from "@/components/json-ld";
import { listQuestions } from "@/services/questions";
import { BRAND_KEYWORDS, CORE_KEYWORDS, SITE_URL, graph, itemListLd, mergeKeywords, pageNodes } from "@/lib/seo";

const DESCRIPTION =
  "Practice curated LeetCode-style DSA and coding-interview problems in arrays, strings, trees, graphs and dynamic programming. Solve in 12 languages with an online compiler and AI mentor.";

export const metadata: Metadata = {
  title: "Coding Interview Problems — DSA Practice",
  description: DESCRIPTION,
  keywords: mergeKeywords(BRAND_KEYWORDS, CORE_KEYWORDS, [
    "coding interview problems", "DSA problems with solutions", "array problems", "string problems",
    "linked list problems", "binary tree problems", "graph problems", "dynamic programming problems",
    "easy medium hard coding questions", "company wise interview questions",
  ]),
  alternates: { canonical: "/problems" },
  openGraph: { type: "website", url: `${SITE_URL}/problems`, title: "Coding Interview Problems — DSA Practice", description: DESCRIPTION },
};
export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const session = await auth();
  const signedIn = !!session?.user;

  // Top of the catalogue as an ItemList so search can understand the collection.
  const featured = await listQuestions({ page: 1, limit: 20 })
    .then((r) => r.items)
    .catch(() => []);
  const ld = graph(
    ...pageNodes({
      url: "/problems",
      name: "Coding Interview Problems",
      description: DESCRIPTION,
      type: "CollectionPage",
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Problems", url: "/problems" },
      ],
    }),
    featured.length
      ? itemListLd(
          "Coding interview problems",
          featured.map((p) => ({ name: p.title, url: `/problems/${p.slug}`, description: `${p.difficulty} · ${p.category}` })),
          `${SITE_URL}/problems#list`,
        )
      : null,
  );

  return (
    <div className="min-h-svh">
      <JsonLd data={ld} />
      <PublicHeader signedIn={signedIn} />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sharpen your DSA skills with curated interview questions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {signedIn && (
              <Button asChild variant="outline" size="sm">
                <Link href="/bookmarks">
                  <Bookmark className="size-4 text-primary" /> Bookmarks
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={signedIn ? "/generate" : "/login?callbackUrl=/generate"}>
                <Sparkles className="size-4" style={{ color: "#7c3aed" }} />
                <span className="ai-gradient-text font-semibold">Generate with AI</span>
              </Link>
            </Button>
          </div>
        </div>
        <Suspense>
          <div className="space-y-4">
            <CategoryChips />
            <ProblemsFilters />
            <ProblemsList signedIn={signedIn} />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
