import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/json-ld";
import { CatalogView, type CatalogSearchParams } from "@/features/lms/catalog-view";
import { auth } from "@/lib/auth";
import { lmsEnabled } from "@/lib/lms/flag";
import { BRAND_KEYWORDS, CORE_KEYWORDS, SITE_URL, courseListGraph, mergeKeywords } from "@/lib/seo";
import { listPublishedCourses } from "@/services/lms-catalog";

const TITLE = "Online Coding Courses";
const DESCRIPTION =
  "Video courses on coding interviews, data structures and algorithms and more. Learn at your own pace, track your progress and practise with real problems.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: mergeKeywords(BRAND_KEYWORDS, CORE_KEYWORDS, ["online coding courses", "DSA course", "coding interview course", "video courses for developers"]),
  alternates: { canonical: "/courses" },
  openGraph: { type: "website", url: `${SITE_URL}/courses`, title: TITLE, description: DESCRIPTION },
};
export const dynamic = "force-dynamic";

export default async function PublicCoursesPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  if (!lmsEnabled()) notFound();
  const session = await auth();
  const featured = await listPublishedCourses({ limit: 20 }).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={courseListGraph(featured.items, featured.total)} />
      <PublicHeader signedIn={!!session?.user} />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{TITLE}</h1>
          <p className="max-w-2xl text-muted-foreground">{DESCRIPTION}</p>
        </header>
        <CatalogView searchParams={await searchParams} basePath="/courses" />
      </div>
    </div>
  );
}
