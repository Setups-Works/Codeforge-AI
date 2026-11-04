"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "@/components/icons";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/lms/api";
import { formatPrice } from "@/lib/plans";
import type { FunnelStep } from "@/lib/lms/analytics";
import type { CourseStat, Overview } from "@/services/lms-analytics";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last year" },
];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AnalyticsView() {
  const [days, setDays] = useState(30);
  const [courseId, setCourseId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lms-analytics", days],
    queryFn: () => api<{ overview: Overview; courses: CourseStat[] }>(`/api/admin/analytics?days=${days}`),
  });
  const funnel = useQuery({
    queryKey: ["lms-funnel", courseId],
    enabled: Boolean(courseId),
    queryFn: () => api<{ enrolled: number; steps: FunnelStep[] }>(`/api/admin/analytics/courses/${courseId}`),
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-24"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  const { overview: o, courses } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Course analytics</h1>
          <p className="text-sm text-muted-foreground">Revenue, learners and where they drop off.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40" aria-label="Date range"><SelectValue /></SelectTrigger>
          <SelectContent>{RANGES.map((r) => <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net revenue" value={formatPrice(o.window.net)} hint={`${formatPrice(o.window.gross)} gross · ${formatPrice(o.window.refunded)} refunded`} />
        <Stat label="Orders" value={o.window.paidOrders} hint={`${o.window.refundedOrders} refunded`} />
        <Stat label="New enrolments" value={o.enrolments.inWindow} hint={`${o.enrolments.total} all time`} />
        <Stat label="Completions" value={o.completions.inWindow} hint={`${o.completions.total} all time`} />
        <Stat label="Active learners (7d)" value={o.activeLearners7d} />
        <Stat label="Certificates issued" value={o.certificates} />
        <Stat label="Published courses" value={o.publishedCourses} />
        <Stat label="All-time net revenue" value={formatPrice(o.allTime.net)} hint={`${o.allTime.paidOrders} orders`} />
      </div>

      <section className="overflow-x-auto rounded-xl border bg-card">
        <h2 className="border-b p-4 text-sm font-semibold">Courses</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Learners</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead>Net revenue</TableHead>
              <TableHead>Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" data-state={courseId === c.id ? "selected" : undefined} onClick={() => setCourseId(c.id)}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell className="tabular-nums">{c.students}</TableCell>
                <TableCell className="tabular-nums">{c.completed} ({c.completionRate}%)</TableCell>
                <TableCell className="tabular-nums">{formatPrice(c.netRevenueInr)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.ratingAvg != null ? `${c.ratingAvg.toFixed(1)} (${c.ratingCount})` : "—"}</TableCell>
              </TableRow>
            ))}
            {courses.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No courses yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>

      {courseId && (
        <section className="rounded-xl border bg-card">
          <h2 className="border-b p-4 text-sm font-semibold">Lesson funnel · {courses.find((c) => c.id === courseId)?.title}</h2>
          {funnel.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : !funnel.data || funnel.data.steps.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No lessons yet.</p>
          ) : (
            <ul className="divide-y">
              {funnel.data.steps.map((s, i) => (
                <li key={s.lessonId} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <Progress value={s.percent} className="hidden h-1.5 w-32 sm:block" />
                  <span className="w-24 text-right tabular-nums text-muted-foreground">{s.completed}/{funnel.data!.enrolled} · {s.percent}%</span>
                  <span className={`w-14 text-right text-xs tabular-nums ${s.dropOff >= 20 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{s.dropOff > 0 ? `−${s.dropOff}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
