import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { CourseCard } from "@/features/lms/course-card";
import { CTA, DISCOUNT_STYLE } from "@/features/lms/colors";
import { auth } from "@/lib/auth";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { lmsEnabled } from "@/lib/lms/flag";
import { formatPrice } from "@/lib/plans";
import { SITE_URL, bundleGraph, plainText } from "@/lib/seo";
import { getPublishedBundleBySlug } from "@/services/lms-bundles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!lmsEnabled()) return { title: "Course bundle" };
  const bundle = await getPublishedBundleBySlug((await params).slug).catch(() => null);
  if (!bundle) return { title: "Course bundle" };
  const title = `${bundle.title} — Course Bundle`;
  const description = plainText(bundle.description, 155) || `${bundle.courses.length} courses together at one price${bundle.savingsInr > 0 ? ` — save ${formatPrice(bundle.savingsInr)}` : ""}.`;
  const url = `${SITE_URL}/bundles/${bundle.slug}`;
  return {
    title,
    description,
    keywords: [bundle.title, `${bundle.title} bundle`, "course bundle", ...bundle.courses.map((c) => c.title)],
    alternates: { canonical: `/bundles/${bundle.slug}` },
    openGraph: { type: "website", url, title, description, images: bundle.thumbnailUrl ? [{ url: bundle.thumbnailUrl, alt: bundle.title }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: bundle.thumbnailUrl ? [bundle.thumbnailUrl] : undefined },
  };
}

export default async function PublicBundlePage({ params }: Props) {
  if (!lmsEnabled()) notFound();
  const bundle = await getPublishedBundleBySlug((await params).slug);
  if (!bundle) notFound();
  const session = await auth();
  const signedIn = !!session?.user;
  const inApp = `/learn/bundles/${bundle.slug}`;

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={bundleGraph(bundle)} />
      <PublicHeader signedIn={signedIn} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All courses
        </Link>
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <header className="space-y-2 rounded-2xl border bg-muted/30 p-5 sm:p-7">
              <Badge variant="outline" className="border-[#006bff]/25 bg-[#006bff]/10 text-[#006bff]">Bundle · {bundle.courses.length} courses</Badge>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{bundle.title}</h1>
            </header>
            {bundle.description && <Markdown>{bundle.description}</Markdown>}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Courses included</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {bundle.courses.map((c) => (
                  <CourseCard
                    key={c.id}
                    href={`/courses/${c.slug}`}
                    course={{ id: c.id, slug: c.slug, title: c.title, subtitle: null, thumbnailUrl: c.thumbnailUrl, level: null, category: null, language: "en", priceInr: c.priceInr, compareAtInr: null, isFree: c.priceInr === 0, instructorName: null, lessonCount: 0, durationS: 0, students: 0, ratingAvg: null, ratingCount: 0 }}
                  />
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">{formatPrice(bundle.priceInr)}</span>
              {bundle.savingsInr > 0 && <span className="text-sm text-muted-foreground line-through">{formatPrice(bundle.valueInr)}</span>}
            </div>
            {bundle.savingsInr > 0 && <Badge className={DISCOUNT_STYLE}>Save {formatPrice(bundle.savingsInr)}</Badge>}
            <Button asChild className={`w-full ${CTA}`}>
              <Link href={signedIn ? inApp : `/login?callbackUrl=${encodeURIComponent(inApp)}`}>{signedIn ? `Buy for ${formatPrice(bundle.priceInr)}` : "Sign in to buy"}</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">{COURSE_REFUND_DAYS}-day refund policy · No extra taxes or fees</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
