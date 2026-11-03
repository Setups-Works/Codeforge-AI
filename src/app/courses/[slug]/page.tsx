import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { CourseDetailView } from "@/features/lms/course-detail-view";
import { auth } from "@/lib/auth";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { lmsEnabled } from "@/lib/lms/flag";
import { SITE_URL, courseGraph, courseKeywords, plainText } from "@/lib/seo";
import { formatPrice } from "@/lib/plans";
import { getCourseBySlug } from "@/services/lms-catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!lmsEnabled()) return { title: "Course" };
  const { slug } = await params;
  const course = await getCourseBySlug(slug).catch(() => null);
  if (!course) return { title: "Course" };

  const title = course.seoTitle || `${course.title} — Online Course`;
  const description = course.seoDescription || plainText(course.description, 155) || course.subtitle || undefined;
  const url = `${SITE_URL}/courses/${course.slug}`;
  return {
    title,
    description,
    keywords: courseKeywords(course),
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: course.thumbnailUrl ? [{ url: course.thumbnailUrl, alt: course.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined },
  };
}

export default async function PublicCoursePage({ params }: Props) {
  if (!lmsEnabled()) notFound();
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const session = await auth();
  const signedIn = !!session?.user;
  const inApp = `/learn/courses/${course.slug}`;
  const watchHref = (lessonId: string) => `/learn/watch/${course.slug}/${lessonId}`;

  const action = signedIn ? (
    <Button asChild className="w-full">
      <Link href={inApp}>{course.isFree ? "Enrol for free" : `Buy for ${formatPrice(course.priceInr)}`}</Link>
    </Button>
  ) : (
    <Button asChild className="w-full">
      <Link href={`/login?callbackUrl=${encodeURIComponent(inApp)}`}>{course.isFree ? "Sign in to enrol" : "Sign in to buy"}</Link>
    </Button>
  );

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={courseGraph(course)} />
      <PublicHeader signedIn={signedIn} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All courses
        </Link>
        <CourseDetailView
          course={course}
          action={
            <>
              {action}
              {!course.isFree && (
                <p className="text-center text-xs text-muted-foreground">{COURSE_REFUND_DAYS}-day refund policy · No extra taxes or fees</p>
              )}
            </>
          }
          hrefFor={(l) => (signedIn && l.isFreePreview ? watchHref(l.id) : null)}
        />
      </div>
    </div>
  );
}
