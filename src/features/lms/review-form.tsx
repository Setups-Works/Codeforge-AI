"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Star } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/lms/api";
import { cn } from "@/lib/utils";

/** Create / edit / remove the learner's own review. */
export function ReviewForm({ courseId, initial }: { courseId: string; initial: { rating: number; body: string | null } | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const url = `/api/learn/courses/${courseId}/review`;

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <p className="text-sm font-medium">{initial ? "Your review" : "Rate this course"}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className="rounded p-0.5 focus-visible:outline-2"
          >
            <Star className={cn("size-6 transition-colors", n <= rating ? "text-amber-500" : "text-muted-foreground/30 hover:text-amber-500/60")} />
          </button>
        ))}
      </div>
      <Textarea rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think? (optional)" />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || rating === 0} onClick={() => run(() => api(url, { method: "PUT", json: { rating, body: body.trim() || null } }), initial ? "Review updated" : "Thanks for your review")}>
          {busy && <Loader2 className="size-4 animate-spin" />} {initial ? "Update review" : "Submit review"}
        </Button>
        {initial && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm("Delete your review?") && run(() => api(url, { method: "DELETE" }), "Review deleted")}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
