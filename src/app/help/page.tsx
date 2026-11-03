import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PublicHeader } from "@/components/layout/public-header";
import { DocsSearch } from "@/features/docs/docs-search";
import { CategoryIcon } from "@/features/docs/category-icon";
import { ChevronRight, FileText } from "@/components/icons";
import {
  DOC_CATEGORIES,
  articlesByCategory,
  searchIndex,
} from "@/content/docs";
import { PageAura } from "@/components/shared/reactbits-kit";
import { JsonLd } from "@/components/json-ld";
import { BRAND_KEYWORDS, SITE_URL, graph, itemListLd, mergeKeywords, pageNodes } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Documentation — Setups Works Lab",
  description:
    "Searchable docs for Setups Works Lab — features, API, SDKs, tutorials, guides, FAQs and examples.",
  keywords: mergeKeywords(BRAND_KEYWORDS, ["documentation", "help center", "REST API docs", "coding interview prep guides", "AI mentor guide", "getting started tutorial"]),
  alternates: { canonical: "/help" },
};
export const dynamic = "force-dynamic";

export default async function HelpHomePage() {
  const session = await auth();
  const index = searchIndex();
  const ld = graph(
    ...pageNodes({
      url: "/help",
      name: "Documentation — Setups Works Lab",
      description: "Features, API, SDKs, tutorials, guides and FAQs for Setups Works Lab.",
      type: "CollectionPage",
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Documentation", url: "/help" },
      ],
    }),
    itemListLd(
      "Documentation categories",
      DOC_CATEGORIES.map((c) => ({ name: c.title, url: `/help#${c.id}`, description: c.description })),
    ),
  );

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <JsonLd data={ld} />
      <PageAura height={480} />
      <PublicHeader signedIn={!!session?.user} />

      {/* hero + search */}
      <section className="relative z-10 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-tight text-[#006bff]">
            <span className="size-1.5 rounded-full bg-[#006bff]" />{" "}
            Documentation
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            How can we help?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Everything you need to learn and use Setups Works Lab — features, API,
            guides, tutorials and FAQs.
          </p>
          <div className="mx-auto mt-6 max-w-xl text-left">
            <DocsSearch index={index} />
          </div>
        </div>
      </section>

      {/* category cards */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_CATEGORIES.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <CategoryIcon name={cat.icon} className="size-5 text-primary" />
              </span>
              <h2 className="mt-3 flex items-center gap-1 text-sm font-semibold">
                {cat.title}
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {cat.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* sections with article lists */}
      <section className="mx-auto max-w-5xl space-y-12 px-4 pb-20">
        {DOC_CATEGORIES.map((cat) => {
          const articles = articlesByCategory(cat.id);
          if (articles.length === 0) return null;
          return (
            <div key={cat.id} id={cat.id} className="scroll-mt-20">
              <div className="mb-4 flex items-center gap-2.5">
                <CategoryIcon name={cat.icon} className="size-5 text-primary" />
                <h2 className="text-lg font-bold tracking-tight">
                  {cat.title}
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {articles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/help/${a.slug}`}
                    className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium group-hover:text-primary">
                        {a.title}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {a.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* footer cta */}
      <section className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>Can&rsquo;t find what you need?</p>
          <div className="flex items-center gap-4">
            <Link
              href="/contact"
              className="font-medium text-primary hover:underline"
            >
              Contact support
            </Link>
            <Link href="/changelog" className="hover:text-foreground">
              Changelog
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
