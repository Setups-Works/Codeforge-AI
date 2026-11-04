"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/lms/api";
import { formatTimestamp, parseTimestamp } from "@/lib/lms/format";
import { useLessonPlayer } from "@/features/lms/player-context";
import type { LessonNote } from "@/services/lms-engagement";

/** Private, optionally timestamped notes for one lesson. Drive can't report the playhead, so the time is typed. */
export function LessonNotes({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const key = ["lesson-notes", lessonId] as const;
  const [body, setBody] = useState("");
  const [time, setTime] = useState("");
  const player = useLessonPlayer();

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api<{ notes: (Omit<LessonNote, "createdAt"> & { createdAt: string })[] }>(`/api/learn/notes?lessonId=${lessonId}`),
  });

  const add = useMutation({
    mutationFn: () => {
      const at = time.trim() ? parseTimestamp(time) : null;
      if (time.trim() && at === null) throw new Error("Use a time like 2:05 or 1:02:05");
      return api("/api/learn/notes", { method: "POST", json: { lessonId, body, atSeconds: at } });
    },
    onSuccess: () => {
      setBody("");
      setTime("");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/learn/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e.message),
  });

  const notes = data?.notes ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Jot something down…" />
        <div className="flex gap-2">
          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Time (optional) e.g. 2:05" className="max-w-48" aria-label="Timestamp" />
          {player.currentTime() !== null && (
            <Button type="button" variant="outline" onClick={() => setTime(formatTimestamp(player.currentTime() ?? 0))}>
              Use video time
            </Button>
          )}
          <Button onClick={() => add.mutate()} disabled={add.isPending || !body.trim()}>
            {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add note
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes for this lesson yet. Only you can see them.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-3 p-3 text-sm">
              {n.atSeconds != null && (
                <button
                  type="button"
                  title="Jump to this moment"
                  onClick={() => player.seek(n.atSeconds as number)}
                  className="shrink-0 rounded bg-[#006bff]/10 px-1.5 py-0.5 font-mono text-xs text-[#006bff] hover:bg-[#006bff]/20"
                >
                  {formatTimestamp(n.atSeconds)}
                </button>
              )}
              <p className="min-w-0 flex-1 whitespace-pre-line">{n.body}</p>
              <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Delete note" onClick={() => remove.mutate(n.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
