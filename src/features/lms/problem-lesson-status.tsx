"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Code2 } from "@/components/icons";
import { api } from "@/lib/lms/api";

/**
 * Banner for a coding-problem lesson. The lesson completes server-side when a
 * submission is accepted; this polls while the tab is visible and refreshes
 * the page (rail ticks, unlocks) as soon as it flips.
 */
export function ProblemLessonStatus({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(completed);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { completed } = await api<{ completed: boolean }>(`/api/learn/lessons/${lessonId}/status`);
        if (completed) {
          setDone(true);
          toast.success("Problem solved — lesson complete");
          router.refresh();
        }
      } catch {
        // transient; try again next tick
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [done, lessonId, router]);

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
      {done ? <Check className="size-4 text-primary" /> : <Code2 className="size-4 text-muted-foreground" />}
      {done ? "Solved — this lesson is complete." : "Solve the problem below. This lesson completes automatically when your solution is accepted."}
    </div>
  );
}
