import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { BuyCourseButton } from "@/features/lms/buy-course-button";
import { CourseCard } from "@/features/lms/course-card";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { formatPrice } from "@/lib/plans";
import { paymentsEnabled } from "@/lib/razorpay";
import { getSession } from "@/lib/session";
import { getPublishedBundleBySlug } from "@/services/lms-bundles";

export const metadata: Metadata = { title: "Course bundle" };
export const dynamic = "force-dynamic";

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const { slug } = await params;
  const bundle = await getPublishedBundleBySlug(slug, { isAdmin: session.user.role === "admin" });
  if (!bundle) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/learn/courses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All courses
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <header className="space-y-2">
            <Badge variant="secondary">Bundle · {bundle.courses.length} courses</Badge>
            <h1 className="text-3xl font-black tracking-tight">{bundle.title}</h1>
          </header>
          {bundle.description && <Markdown>{bundle.description}</Markdown>}
          <div className="grid gap-4 sm:grid-cols-2">
            {bundle.courses.map((c) => (
              <CourseCard
                key={c.id}
                href={`/learn/courses/${c.slug}`}
                course={{ id: c.id, slug: c.slug, title: c.title, subtitle: null, thumbnailUrl: c.thumbnailUrl, level: null, category: null, language: "en", priceInr: c.priceInr, compareAtInr: null, isFree: c.priceInr === 0, instructorName: null, lessonCount: 0, durationS: 0, students: 0, ratingAvg: null, ratingCount: 0 }}
              />
            ))}
          </div>
        </div>
        <aside className="space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatPrice(bundle.priceInr)}</span>
            {bundle.savingsInr > 0 && <span className="text-sm text-muted-foreground line-through">{formatPrice(bundle.valueInr)}</span>}
          </div>
          {bundle.savingsInr > 0 && <Badge>Save {formatPrice(bundle.savingsInr)}</Badge>}
          <BuyCourseButton
            bundle
            courseId={bundle.id}
            courseSlug={bundle.slug}
            isFree={false}
            priceLabel={formatPrice(bundle.priceInr)}
            paymentsAvailable={paymentsEnabled()}
            prefill={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
          />
          <p className="text-center text-xs text-muted-foreground">{COURSE_REFUND_DAYS}-day refund policy · No extra taxes or fees</p>
        </aside>
      </div>
    </div>
  );
}
