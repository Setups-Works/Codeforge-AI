"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, Trash2 } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/lms/api";
import type { Question } from "@/services/lms-engagement";

type Post = Omit<Question, "createdAt" | "replies"> & { createdAt: string };
type Thread = Post & { replies: Post[] };

/** Per-lesson Q&A for enrolled learners; admin replies are labelled Instructor. */
export function LessonQuestions({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const key = ["lesson-questions", lessonId] as const;
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api<{ questions: Thread[]; me: string; admin: boolean }>(`/api/learn/questions?lessonId=${lessonId}`),
  });

  const post = useMutation({
    mutationFn: (v: { body: string; parentId?: string }) => api("/api/learn/questions", { method: "POST", json: { lessonId, ...v } }),
    onSuccess: () => {
      setBody("");
      setReply("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/learn/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e.message),
  });

  const canDelete = (p: Post) => data && (data.admin || p.userId === data.me);
  const when = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

  const line = (p: Post) => (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{p.authorName}</span>
          {p.isStaff && <Badge variant="secondary">Instructor</Badge>}
          {when(p.createdAt)}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-sm">{p.body}</p>
      </div>
      {canDelete(p) && (
        <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Delete" onClick={() => confirm("Delete this post?") && remove.mutate(p.id)}>
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask a question about this lesson…" />
        <Button onClick={() => post.mutate({ body })} disabled={post.isPending || !body.trim()}>
          {post.isPending && !replyTo && <Loader2 className="size-4 animate-spin" />} Ask
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (data?.questions.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet. Be the first to ask.</p>
      ) : (
        <ul className="space-y-4">
          {data!.questions.map((q) => (
            <li key={q.id} className="space-y-3 rounded-lg border p-3">
              {line(q)}
              {q.replies.length > 0 && <div className="space-y-3 border-l-2 pl-3">{q.replies.map((r) => <div key={r.id}>{line(r)}</div>)}</div>}
              {replyTo === q.id ? (
                <div className="space-y-2">
                  <Textarea rows={2} autoFocus maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => post.mutate({ body: reply, parentId: q.id })} disabled={post.isPending || !reply.trim()}>Reply</Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setReplyTo(q.id); setReply(""); }}>Reply</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
