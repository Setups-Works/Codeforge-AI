import type { Metadata } from "next";
import Link from "next/link";
import { CatalogView, type CatalogSearchParams } from "@/features/lms/catalog-view";
import { formatPrice } from "@/lib/plans";
import { listPublishedBundles } from "@/services/lms-bundles";

export const metadata: Metadata = { title: "Browse courses" };
export const dynamic = "force-dynamic";

export default async function LearnCoursesPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const bundles = await listPublishedBundles().catch(() => []);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Browse courses</h1>
      {bundles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Bundles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bundles.map((b) => (
              <Link key={b.id} href={`/learn/bundles/${b.slug}`} className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
                <p className="text-xs text-muted-foreground">{b.courses.length} courses</p>
                <p className="mt-1 font-semibold">{b.title}</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold">{formatPrice(b.priceInr)}</span>
                  {b.savingsInr > 0 && <span className="text-xs text-muted-foreground">save {formatPrice(b.savingsInr)}</span>}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <CatalogView searchParams={await searchParams} basePath="/learn/courses" />
    </div>
  );
}
