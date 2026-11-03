import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { listPublishedPosts } from "@/services/blog-store";
import { PublicHeader } from "@/components/layout/public-header";
import { APP_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/json-ld";
import { BRAND_KEYWORDS, SITE_URL, graph, ids, itemListLd, mergeKeywords, pageNodes } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Blog — ${APP_NAME}`,
  description:
    "Product updates, feature deep-dives and tips from the Setups Works Lab team.",
  keywords: mergeKeywords(BRAND_KEYWORDS, ["coding interview blog", "DSA tips", "interview preparation guide", "AI coding mentor updates", "software engineer career advice"]),
  alternates: { canonical: "/blog" },
};
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const session = await auth();
  const posts = await listPublishedPosts(60);
  const ld = graph(
    ...pageNodes({
      url: "/blog",
      name: `Blog — ${APP_NAME}`,
      description: "Product updates, feature deep-dives and tips from the Setups Works Lab team.",
      type: "CollectionPage",
      mainEntity: { "@id": `${SITE_URL}/blog#blog` },
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Blog", url: "/blog" },
      ],
    }),
    {
      "@type": "Blog",
      "@id": `${SITE_URL}/blog#blog`,
      name: `${APP_NAME} Blog`,
      url: `${SITE_URL}/blog`,
      inLanguage: "en",
      publisher: { "@id": ids.org },
    },
    posts.length
      ? itemListLd(
          "Latest posts",
          posts.map((p) => ({ name: p.title, url: `/blog/${p.slug}`, description: p.description ?? undefined, image: `${SITE_URL}/api/blog/cover/${p.slug}` })),
        )
      : null,
  );

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={ld} />
      <PublicHeader signedIn={!!session?.user} />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-tight text-[#006bff]">
            <span className="size-1.5 rounded-full bg-[#006bff]" /> Blog
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            From the Setups Works Lab team
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Feature deep-dives, product updates and tips to help you prep
            smarter.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No posts yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/blog/cover/${p.slug}`}
                  alt={p.title}
                  className="aspect-[16/9] w-full object-cover"
                  loading="lazy"
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {(p.tags ?? []).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-base font-semibold leading-snug group-hover:text-primary">
                    {p.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {format(
                      new Date(p.publishedAt ?? p.createdAt),
                      "MMM d, yyyy",
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
