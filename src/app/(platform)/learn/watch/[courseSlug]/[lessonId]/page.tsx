import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Lock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { LessonActions } from "@/features/lms/lesson-actions";
import { LessonRail } from "@/features/lms/lesson-rail";
import { LessonNotes } from "@/features/lms/lesson-notes";
import { LessonQuestions } from "@/features/lms/lesson-questions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAccessLesson, type AccessReason } from "@/lib/lms/access";
import { isUuid } from "@/lib/lms/guard";
import { toEmbed } from "@/lib/lms/video";
import { getSession } from "@/lib/session";
import { getCourseBySlug } from "@/services/lms-catalog";
import { getCourseProgress, getGatedLessonIds, getLessonPosition, recordLessonOpened, resolveLessonAccess } from "@/services/lms-learn";
import { getLearnerQuiz } from "@/services/lms-quiz";
import { getQuestionBySlug } from "@/services/questions";
import { Workspace } from "@/features/workspace/workspace";
import { MentorPanel } from "@/features/ai-mentor/mentor-panel";
import { CustomPlayer } from "@/features/lms/custom-player";
import { LessonPlayerProvider } from "@/features/lms/player-context";
import { QuizRunner } from "@/features/lms/quiz-runner";
import { ProblemLessonStatus } from "@/features/lms/problem-lesson-status";

export const metadata: Metadata = { title: "Lesson" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ courseSlug: string; lessonId: string }> };

const LOCKED: Partial<Record<AccessReason, string>> = {
  "not-enrolled": "Enrol in this course to watch this lesson.",
  expired: "Your access to this course has expired.",
  unpublished: "This course isn't available right now.",
  gated: "Complete the previous required lesson to unlock this one.",
};

export default async function WatchPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { courseSlug, lessonId } = await params;
  if (!isUuid(lessonId)) notFound();

  const user = { id: session.user.id, role: session.user.role };
  const isAdmin = user.role === "admin";
  const course = await getCourseBySlug(courseSlug, { isAdmin });
  if (!course) notFound();

  const { decision, lesson, enrollment } = await resolveLessonAccess(user, course.id, lessonId);
  if (!lesson) notFound();

  const progress = enrollment ? await getCourseProgress(user.id, course.id) : null;
  const completedIds = new Set(progress?.completedLessonIds ?? []);

  // Which lessons the rail should let this viewer open (drip is enforced on open).
  const ordered = course.sections.flatMap((s) => s.lessons);
  const gatedIds = enrollment && !isAdmin ? await getGatedLessonIds(user.id, course.id) : new Set<string>();
  const openableIds = new Set(
    ordered
      .filter(
        (l) =>
          canAccessLesson({
            course: { status: course.status },
            lesson: { isFreePreview: l.isFreePreview, dripDays: null },
            user,
            enrollment: enrollment ? { enrolledAt: enrollment.enrolledAt, expiresAt: enrollment.expiresAt } : null,
            gated: gatedIds.has(l.id),
          }).allowed,
      )
      .map((l) => l.id),
  );

  const index = ordered.findIndex((l) => l.id === lesson.id);
  const href = (id: string) => `/learn/watch/${course.slug}/${id}`;
  const prev = index > 0 && openableIds.has(ordered[index - 1].id) ? href(ordered[index - 1].id) : null;
  const next = index < ordered.length - 1 && openableIds.has(ordered[index + 1].id) ? href(ordered[index + 1].id) : null;

  // The ref is only turned into a player URL once access is confirmed.
  const embed = decision.allowed && lesson.video ? toEmbed(lesson.video) : null;

  if (decision.allowed && enrollment) await recordLessonOpened(user.id, course.id, lesson.id);
  const startAt = decision.allowed && enrollment && lesson.kind === "video" ? await getLessonPosition(user.id, lesson.id) : 0;
  const nextLesson = next && index < ordered.length - 1 ? { href: next, title: ordered[index + 1].title } : null;

  // Kind-specific data, loaded only after access is confirmed.
  const quiz = decision.allowed && lesson.kind === "quiz" ? await getLearnerQuiz(user.id, lesson.id, lesson.passPercent) : null;
  const question = decision.allowed && lesson.kind === "problem" && lesson.problemSlug ? await getQuestionBySlug(lesson.problemSlug).catch(() => null) : null;
  const autoCompletes = lesson.kind === "quiz" || lesson.kind === "problem";
  const lessonDone = completedIds.has(lesson.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <Link href={`/learn/courses/${course.slug}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {course.title}
      </Link>

      <LessonPlayerProvider>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {decision.allowed ? (
            lesson.kind === "video" ? (
              embed?.kind === "video" ? (
                <CustomPlayer
                  src={embed.src}
                  mime={embed.mime}
                  captions={embed.captions}
                  title={lesson.title}
                  poster={course.thumbnailUrl}
                  lessonId={lesson.id}
                  startAt={startAt}
                  track={Boolean(enrollment)}
                  watermark={isAdmin ? null : (session.user.email ?? null)}
                  next={nextLesson ? { href: nextLesson.href, title: nextLesson.title } : null}
                />
              ) : embed?.kind === "iframe" ? (
                <div className="relative aspect-video overflow-hidden rounded-xl border bg-black">
                  <iframe
                    src={embed.src}
                    allow={embed.allow}
                    allowFullScreen
                    title={lesson.title}
                    className="absolute inset-0 size-full"
                  />
                  {/* Covers the host's pop-out button so the player stays on this page. */}
                  <div className="absolute right-0 top-0 size-14" aria-hidden />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  The video for this lesson hasn&apos;t been added yet.
                </div>
              )
            ) : null
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-6 text-center">
              <Lock className="size-8 text-muted-foreground" />
              {decision.reason === "drip-locked" && decision.unlocksAt ? (
                <p className="text-sm">This lesson unlocks on {format(decision.unlocksAt, "MMM d, yyyy")}.</p>
              ) : (
                <p className="text-sm">{LOCKED[decision.reason] ?? "You can't watch this lesson."}</p>
              )}
              <Button asChild size="sm">
                <Link href={`/learn/courses/${course.slug}`}>View course</Link>
              </Button>
            </div>
          )}

          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{lesson.title}</h1>

          {decision.allowed && (
            <LessonActions
              lessonId={lesson.id}
              completed={enrollment ? completedIds.has(lesson.id) : null}
              prevHref={prev}
              nextHref={next}
              auto={autoCompletes}
            />
          )}
          {decision.allowed && !enrollment && (
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Admin view — progress isn't tracked." : "Preview lesson — enrol to track your progress."}
            </p>
          )}

          {decision.allowed && lesson.kind === "quiz" && quiz && (
            <QuizRunner
              lessonId={lesson.id}
              passPercent={quiz.passPercent}
              questions={quiz.questions}
              alreadyPassed={lessonDone}
              lastPercent={quiz.lastAttempt?.percent ?? null}
              nextHref={next}
            />
          )}

          {decision.allowed && lesson.kind === "problem" && (
            <>
              <ProblemLessonStatus lessonId={lesson.id} completed={lessonDone} />
              {question ? (
                <div className="h-[80svh] overflow-hidden rounded-xl border">
                  <Workspace question={question} signedIn />
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">The problem for this lesson isn&apos;t available right now.</p>
              )}
            </>
          )}

          {decision.allowed && (enrollment || isAdmin) && (
            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes">My notes</TabsTrigger>
                <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
                {lesson.kind !== "problem" && <TabsTrigger value="mentor">AI mentor</TabsTrigger>}
              </TabsList>
              {lesson.kind !== "problem" && (
                <TabsContent value="mentor" className="mt-4">
                  <div className="h-[28rem] overflow-hidden rounded-xl border">
                    <MentorPanel context="lesson" lessonId={lesson.id} />
                  </div>
                </TabsContent>
              )}
              <TabsContent value="notes" className="mt-4"><LessonNotes lessonId={lesson.id} /></TabsContent>
              <TabsContent value="qa" className="mt-4"><LessonQuestions lessonId={lesson.id} /></TabsContent>
            </Tabs>
          )}

          {decision.allowed && lesson.bodyMd && (
            <div className="rounded-xl border bg-card p-5">
              <Markdown>{lesson.bodyMd}</Markdown>
            </div>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          {progress && (
            <p className="text-sm text-muted-foreground">
              {progress.completed} of {progress.total} lessons · {progress.percent}%
            </p>
          )}
          <LessonRail
            courseSlug={course.slug}
            sections={course.sections}
            currentLessonId={lesson.id}
            completedIds={completedIds}
            openableIds={openableIds}
          />
        </aside>
      </div>
      </LessonPlayerProvider>
    </div>
  );
}
