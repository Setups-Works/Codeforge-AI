import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { PublicHeader } from "@/components/layout/public-header";
import { Markdown } from "@/components/shared/markdown";
import { DocsSearch } from "@/features/docs/docs-search";
import { CategoryIcon } from "@/features/docs/category-icon";
import { ArrowLeft, ArrowRight, ChevronRight } from "@/components/icons";
import {
  DOC_ARTICLES,
  DOC_CATEGORIES,
  articlesByCategory,
  getArticle,
  getCategory,
  searchIndex,
} from "@/content/docs";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, faqFromMarkdown, graph, ids, mergeKeywords, pageNodes } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return DOC_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Documentation — Setups Works Lab" };
  return {
    title: `${article.title} — Setups Works Lab Docs`,
    description: article.description,
    keywords: mergeKeywords(article.tags, [article.title, "Setups Works Lab docs", getCategory(article.category)?.title]),
    alternates: { canonical: `/help/${article.slug}` },
    openGraph: { type: "article", url: `${SITE_URL}/help/${article.slug}`, title: article.title, description: article.description, tags: article.tags },
  };
}

export default async function DocArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const session = await auth();
  const category = getCategory(article.category);
  const siblings = articlesByCategory(article.category);
  const idx = siblings.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const url = `${SITE_URL}/help/${article.slug}`;
  const ld = graph(
    ...pageNodes({
      url,
      name: article.title,
      description: article.description,
      keywords: article.tags,
      mainEntity: { "@id": `${url}#article` },
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Documentation", url: "/help" },
        ...(category ? [{ name: category.title, url: `/help#${category.id}` }] : []),
        { name: article.title, url },
      ],
    }),
    {
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline: article.title,
      description: article.description,
      url,
      keywords: article.tags.join(", "),
      articleSection: category?.title,
      wordCount: article.body.split(/\s+/).length,
      proficiencyLevel: "Beginner",
      inLanguage: "en",
      isAccessibleForFree: true,
      author: { "@id": ids.org },
      publisher: { "@id": ids.org },
      mainEntityOfPage: { "@id": `${url}#webpage` },
    },
    // The FAQ category is literally Q&A, so mark those up as a FAQPage when
    // the article body follows "### Question" / answer structure.
    ...(article.category === "faq" ? faqFromMarkdown(article.body, url) : []),
  );

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={ld} />
      <PublicHeader signedIn={!!session?.user} />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[260px_1fr]">
        {/* sidebar */}
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100svh-6rem)] lg:self-start lg:overflow-y-auto">
          <div className="mb-4">
            <DocsSearch index={searchIndex()} placeholder="Search docs…" />
          </div>
          <nav className="space-y-5">
            {DOC_CATEGORIES.map((cat) => {
              const items = articlesByCategory(cat.id);
              if (items.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <CategoryIcon name={cat.icon} className="size-3.5" />
                    {cat.title}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((a) => (
                      <li key={a.slug}>
                        <Link
                          href={`/help/${a.slug}`}
                          className={cn(
                            "block rounded-md px-2 py-1.5 text-sm transition-colors",
                            a.slug === slug
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* content */}
        <div className="min-w-0">
          {/* breadcrumb */}
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/help" className="hover:text-foreground">Docs</Link>
            <ChevronRight className="size-3" />
            <a href={`/help#${article.category}`} className="hover:text-foreground">{category?.title}</a>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{article.title}</span>
          </nav>

          <article className="rounded-2xl border bg-card p-6 sm:p-8">
            <Markdown>{article.body}</Markdown>
          </article>

          {/* prev / next */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={`/help/${prev.slug}`} className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Previous</span>
                  <span className="block truncate text-sm font-medium group-hover:text-primary">{prev.title}</span>
                </span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/help/${next.slug}`} className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-right transition-colors hover:border-primary/40 sm:col-start-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Next</span>
                  <span className="block truncate text-sm font-medium group-hover:text-primary">{next.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            )}
          </div>

          {/* help footer */}
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
            <Link href="/help" className="hover:text-foreground">← All documentation</Link>
            <p>
              Still stuck?{" "}
              <Link href="/contact" className="font-medium text-primary hover:underline">Contact support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
