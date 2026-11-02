import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getPublishedPost, incrementBlogViews } from "@/services/blog-store";
import { PublicHeader } from "@/components/layout/public-header";
import { Markdown } from "@/components/shared/markdown";
import { ArrowLeft } from "@/components/icons";
import { APP_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: `Blog — ${APP_NAME}` };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.description;
  return {
    title: `${title} — ${APP_NAME}`,
    description,
    keywords: post.seoKeywords || undefined,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: `/api/blog/cover/${slug}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/api/blog/cover/${slug}`] },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  // Count a view (fire and forget).
  incrementBlogViews(slug).catch(() => {});

  const session = await auth();

  const SITE = "https://labs.setups.works";
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [`${SITE}/api/blog/cover/${slug}`],
    datePublished: new Date(post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt ?? post.createdAt).toISOString(),
    keywords: (post.tags ?? []).join(", "),
    url: `${SITE}/blog/${slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${slug}` },
    author: { "@type": "Organization", name: APP_NAME, url: SITE },
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    },
  };

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={articleLd} />
      <PublicHeader signedIn={!!session?.user} />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All posts
        </Link>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {(post.tags ?? []).map((t) => (
            <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
          ))}
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {format(new Date(post.publishedAt ?? post.createdAt), "MMMM d, yyyy")}
        </p>
        {post.description && <p className="mt-3 text-lg text-muted-foreground">{post.description}</p>}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/blog/cover/${slug}`}
          alt={post.title}
          className="mt-6 w-full rounded-2xl border object-cover shadow-sm"
        />

        <div className="mt-8 rounded-2xl border bg-card p-6 sm:p-8">
          <Markdown>{post.content}</Markdown>
        </div>

        <div className="mt-8 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">← Back to blog</Link>
          <Link href="/help" className="font-medium text-primary hover:underline">Browse the docs</Link>
        </div>
      </article>
    </div>
  );
}
