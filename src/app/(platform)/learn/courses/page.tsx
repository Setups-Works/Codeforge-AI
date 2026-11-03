import type { Metadata } from "next";
import { CatalogView, type CatalogSearchParams } from "@/features/lms/catalog-view";

export const metadata: Metadata = { title: "Browse courses" };
export const dynamic = "force-dynamic";

export default async function LearnCoursesPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Browse courses</h1>
      <CatalogView searchParams={await searchParams} basePath="/learn/courses" />
    </div>
  );
}
