"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/lms/api";

interface Props {
  lessonId: string;
  /** Null when progress isn't tracked (preview or admin viewing). */
  completed: boolean | null;
  prevHref: string | null;
  nextHref: string | null;
}

/** Mark-complete toggle plus previous/next navigation under the player. */
export function LessonActions({ lessonId, completed, prevHref, nextHref }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(completed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !done;
    setBusy(true);
    try {
      const { progress } = await api<{ progress: { courseCompleted: boolean } }>("/api/learn/progress", {
        method: "POST",
        json: { lessonId, status: next ? "completed" : "started" },
      });
      setDone(next);
      if (next && progress.courseCompleted) toast.success("Course complete — well done!");
      else if (next) toast.success("Lesson completed");
      router.refresh();
      if (next && nextHref) router.push(nextHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save progress");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {done !== null && (
        <Button onClick={toggle} disabled={busy} variant={done ? "outline" : "default"}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {done ? "Completed — undo" : "Mark complete"}
        </Button>
      )}
      <div className="ml-auto flex gap-2">
        {prevHref && (
          <Button asChild variant="outline" size="sm">
            <Link href={prevHref}><ArrowLeft className="size-4" /> Previous</Link>
          </Button>
        )}
        {nextHref && (
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>Next <ArrowRight className="size-4" /></Link>
          </Button>
        )}
      </div>
    </div>
  );
}
