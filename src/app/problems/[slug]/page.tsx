import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, LogIn } from "@/components/icons";
import { auth } from "@/lib/auth";
import { getQuestionBySlug } from "@/services/questions";
import { Workspace } from "@/features/workspace/workspace";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { JsonLd } from "@/components/json-ld";
import { APP_NAME } from "@/lib/constants";
import { problemGraph, problemKeywords } from "@/lib/seo";

const SITE = "https://labs.setups.works";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contest?: string }>;
}

/** Strip markdown to a clean, truncated meta-description sentence. */
function summarize(md: string, max = 155): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug).catch(() => null);
  if (!question) return { title: "Problem" };

  const tagBit = question.tags?.length ? ` covering ${question.tags.slice(0, 3).join(", ")}` : "";
  const description =
    summarize(question.description) ||
    `Solve ${question.title}, a ${question.difficulty} coding-interview problem${tagBit}, in the online compiler with an AI mentor on ${APP_NAME}.`;
  const url = `${SITE}/problems/${question.slug}`;

  return {
    title: `${question.title} — ${question.difficulty} Coding Problem`,
    description,
    keywords: problemKeywords(question),
    alternates: { canonical: `/problems/${question.slug}` },
    openGraph: {
      type: "article",
      url,
      title: `${question.title} — ${question.difficulty} Coding Problem`,
      description,
      section: question.category,
      tags: [...(question.tags ?? []), ...(question.companies ?? [])],
    },
    twitter: { card: "summary_large_image", title: question.title, description },
  };
}

/**
 * Full-screen problem workspace. Publicly viewable; running/submitting
 * code and the AI mentor require signing in.
 */
export default async function ProblemPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const signedIn = !!session?.user;

  const [{ slug }, { contest }] = await Promise.all([params, searchParams]);
  const question = await getQuestionBySlug(slug);
  if (!question) notFound();

  const problemLd = problemGraph(question, summarize(question.description));

  return (
    <div className="flex h-svh flex-col">
      <JsonLd data={problemLd} />
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3">
        <Logo href={signedIn ? "/dashboard" : "/"} compact />
        <Button asChild variant="ghost" size="sm">
          <Link href="/problems">
            <ArrowLeft className="size-4" /> Problems
          </Link>
        </Button>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="truncate text-sm font-medium">{question.title}</span>
          <DifficultyBadge difficulty={question.difficulty} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!signedIn && (
            <Button asChild size="sm">
              <Link href={`/login?callbackUrl=/problems/${question.slug}`}>
                <LogIn className="size-4" /> Sign in to solve
              </Link>
            </Button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Workspace
          question={question}
          contestSlug={contest}
          signedIn={signedIn}
        />
      </div>
    </div>
  );
}
