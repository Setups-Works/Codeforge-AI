import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshCw } from "@/components/icons";
import { format } from "date-fns";
import { ArrowRight, Code2, Flame, GraduationCap, Sparkles } from "@/components/icons";
import { getSession } from "@/lib/session";
import { getDashboardData } from "@/services/stats";
import { getDailyChallenge } from "@/services/contests";
import { StatsOverview } from "@/features/dashboard/stats-overview";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Button } from "@/components/ui/button";
import { XP_DAILY_CHALLENGE_BONUS } from "@/lib/constants";
import { lmsEnabled } from "@/lib/lms/flag";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const firstName = (session.user.name ?? "there").split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* greeting — renders immediately from JWT, no DB needed */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, <span className="text-2xl font-bold tracking-tight sm:text-3xl text-[#006bff]" >{firstName}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} — keep the streak alive.
          </p>
        </div>
        <div className="flex gap-2">
          {lmsEnabled() && (
            <Button asChild variant="outline" size="sm">
              <Link href="/learn">
                <GraduationCap className="size-4 text-primary" /> Go learn
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/generate">
              <Sparkles className="size-4 text-primary" /> Generate
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/problems">
              <Code2 className="size-4" /> Solve problems
            </Link>
          </Button>
        </div>
      </div>

      {/* heavy data streams in — page shell is already visible */}
      <Suspense fallback={<DashboardDataSkeleton />}>
        <DashboardData userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function DashboardData({ userId }: { userId: string }) {
  let data, daily;
  try {
    [data, daily] = await Promise.all([
      getDashboardData(userId),
      getDailyChallenge().catch(() => null),
    ]);
  } catch {
    [data, daily] = [null, null];
  }

  // redirect() can't be called inside a Suspense streaming boundary after
  // the page shell has already been flushed — show a recoverable error instead
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <RefreshCw className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
        <a href="/dashboard" className="text-sm text-primary hover:underline">Refresh</a>
      </div>
    );
  }

  return (
    <>
      {daily && (
        <Link href={`/problems/${daily.slug}`} className="group mb-5 block sm:mb-6">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors group-hover:border-foreground/30">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#006bff] text-white">
              <Flame className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Daily challenge · +{XP_DAILY_CHALLENGE_BONUS} bonus XP
              </p>
              <p className="truncate text-sm font-semibold">{daily.title}</p>
            </div>
            <DifficultyBadge difficulty={daily.difficulty} />
            <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      <StatsOverview data={data} isOwner />
    </>
  );
}

function DashboardDataSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {/* daily challenge placeholder */}
      <div className="h-16 rounded-xl bg-muted" />
      {/* stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}
      </div>
      {/* heatmap + submissions */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-52 rounded-xl bg-muted" />
        <div className="h-52 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
