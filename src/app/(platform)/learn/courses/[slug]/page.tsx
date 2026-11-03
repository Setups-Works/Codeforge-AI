import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Check, Clock, GraduationCap, Globe, Layers, Star, Users } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { BuyCourseButton } from "@/features/lms/buy-course-button";
import { Curriculum } from "@/features/lms/curriculum";
import { paymentsEnabled } from "@/lib/razorpay";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { getSession } from "@/lib/session";
import { formatPrice } from "@/lib/plans";
import { discountPercent, formatDuration } from "@/lib/lms/format";
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
  const off = discountPercent(course.priceInr, course.compareAtInr);
  const duration = formatDuration(course.durationS);

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

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <header className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {course.level && <Badge variant="secondary">{course.level}</Badge>}
              {course.category && <Badge variant="outline">{course.category}</Badge>}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {course.ratingCount > 0 && course.ratingAvg != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 text-amber-500" /> {course.ratingAvg.toFixed(1)} ({course.ratingCount} reviews)
                </span>
              )}
              {course.students > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4" /> {course.students} learners
                </span>
              )}
              {course.instructorName && <span>By {course.instructorName}</span>}
            </div>
          </header>

          {course.outcomes.length > 0 && (
            <section className="rounded-xl border p-5">
              <h2 className="mb-3 text-lg font-semibold">What you&apos;ll learn</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Curriculum</h2>
            <Curriculum sections={course.sections} hrefFor={(l) => (canOpen(l) ? watchHref(l.id) : null)} />
          </section>

          {course.requirements.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Requirements</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {course.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {course.description && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">About this course</h2>
              <Markdown>{course.description}</Markdown>
            </section>
          )}

          {(course.instructorName || course.instructorBio) && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Instructor</h2>
              <div className="flex gap-4">
                {course.instructorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.instructorImage} alt="" className="size-16 shrink-0 rounded-full border object-cover" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                    <GraduationCap className="size-6" />
                  </div>
                )}
                <div>
                  {course.instructorName && <p className="font-medium">{course.instructorName}</p>}
                  {course.instructorBio && <p className="mt-1 text-sm text-muted-foreground">{course.instructorBio}</p>}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {course.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
            )}
            <div className="space-y-4 p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPrice(course.priceInr)}</span>
                {off > 0 && course.compareAtInr != null && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(course.compareAtInr)}</span>
                    <Badge>{off}% off</Badge>
                  </>
                )}
              </div>

              {enrolled || isAdmin ? (
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
              )}

              <ul className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
                {course.lessonCount > 0 && (
                  <li className="flex items-center gap-2"><BookOpen className="size-4" /> {course.lessonCount} lessons</li>
                )}
                {duration && <li className="flex items-center gap-2"><Clock className="size-4" /> {duration} of content</li>}
                {course.level && <li className="flex items-center gap-2"><Layers className="size-4" /> {course.level}</li>}
                <li className="flex items-center gap-2"><Globe className="size-4" /> {course.language.toUpperCase()}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
