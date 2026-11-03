import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StickyNote } from "@/components/icons";
import { getSession } from "@/lib/session";
import { formatTimestamp } from "@/lib/lms/format";
import { listAllNotes } from "@/services/lms-engagement";

export const metadata: Metadata = { title: "Course notes" };
export const dynamic = "force-dynamic";

export default async function LearnNotesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const groups = await listAllNotes(session.user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Course notes</h1>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-muted-foreground">
          <StickyNote className="size-8" />
          <p className="text-sm">Notes you take while watching lessons will collect here.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.courseId} className="space-y-3">
            <h2 className="text-lg font-semibold">{g.courseTitle}</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {g.notes.map((n) => (
                <li key={n.id} className="space-y-1 p-4">
                  <Link href={`/learn/watch/${g.courseSlug}/${n.lessonId}`} className="text-xs font-medium text-primary hover:underline">
                    {n.lessonTitle}
                    {n.atSeconds != null && ` · ${formatTimestamp(n.atSeconds)}`}
                  </Link>
                  <p className="whitespace-pre-line text-sm">{n.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
