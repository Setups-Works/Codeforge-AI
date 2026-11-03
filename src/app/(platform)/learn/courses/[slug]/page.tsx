import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BuyCourseButton } from "@/features/lms/buy-course-button";
import { CourseDetailView } from "@/features/lms/course-detail-view";
import { paymentsEnabled } from "@/lib/razorpay";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { getSession } from "@/lib/session";
import { formatPrice } from "@/lib/plans";
import { getCourseBySlug } from "@/services/lms-catalog";
import { getEnrollment } from "@/services/lms-learn";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug).catch(() => null);
  if (!course) return { title: "Course" };
  return {
    title: course.seoTitle || course.title,
    description: course.seoDescription || course.subtitle || undefined,
    keywords: course.seoKeywords || course.tags,
  };
}

export default async function LearnCoursePage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const isAdmin = session.user.role === "admin";
  const course = await getCourseBySlug(slug, { isAdmin });
  if (!course) notFound();

  const enrollment = isAdmin ? null : await getEnrollment(session.user.id, course.id);
  const enrolled = Boolean(enrollment && (!enrollment.expiresAt || enrollment.expiresAt > new Date()));

  // Where "Start / Continue" goes: the last opened lesson, else the first one.
  const firstLessonId = course.sections.flatMap((s) => s.lessons)[0]?.id ?? null;
  const resumeLessonId = enrollment?.lastLessonId ?? firstLessonId;
  const watchHref = (lessonId: string) => `/learn/watch/${course.slug}/${lessonId}`;
  const canOpen = (lesson: { isFreePreview: boolean }) => isAdmin || enrolled || lesson.isFreePreview;

  const action =
    enrolled || isAdmin ? (
      resumeLessonId ? (
        <Button asChild className="w-full">
          <Link href={watchHref(resumeLessonId)}>
            {isAdmin ? "Open course" : enrollment?.lastLessonId ? "Continue learning" : "Start learning"}
          </Link>
        </Button>
      ) : (
        <Badge variant="secondary" className="w-full justify-center py-2">No lessons yet</Badge>
      )
    ) : (
      <>
        <BuyCourseButton
          courseId={course.id}
          courseSlug={course.slug}
          isFree={course.isFree}
          priceLabel={formatPrice(course.priceInr)}
          paymentsAvailable={paymentsEnabled()}
          prefill={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
        />
        {!course.isFree && (
          <p className="text-center text-xs text-muted-foreground">
            {COURSE_REFUND_DAYS}-day refund policy · No extra taxes or fees
          </p>
        )}
      </>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/learn/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All courses
      </Link>

      {course.status !== "published" && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          This course is <strong className="capitalize">{course.status}</strong> — only admins can see this page.
        </div>
      )}

      <CourseDetailView course={course} action={action} hrefFor={(l) => (canOpen(l) ? watchHref(l.id) : null)} />
    </div>
  );
}
