"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/lms/api";
import { cn } from "@/lib/utils";
import type { QuizResult } from "@/services/lms-quiz";

interface Props {
  lessonId: string;
  passPercent: number;
  questions: { id: string; prompt: string; options: string[] }[];
  alreadyPassed: boolean;
  lastPercent: number | null;
  nextHref: string | null;
}

/** Take a quiz. Correct answers are only revealed (by the server) once the quiz is passed. */
export function QuizRunner({ lessonId, passPercent, questions, alreadyPassed, lastPercent, nextHref }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (questions.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">This quiz doesn&apos;t have any questions yet.</p>;
  }

  const answered = answers.filter((a) => a !== null).length;

  async function submit() {
    setBusy(true);
    try {
      const { result } = await api<{ result: QuizResult }>("/api/learn/quiz", { method: "POST", json: { lessonId, answers } });
      setResult(result);
      if (result.passed) {
        toast.success(result.xpEarned ? `Quiz passed — +${result.xpEarned} XP` : "Quiz passed");
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit the quiz");
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setAnswers(questions.map(() => null));
    setResult(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{questions.length} questions · pass mark {passPercent}%</span>
        {alreadyPassed && !result && <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Passed{lastPercent != null ? ` · ${lastPercent}%` : ""}</span>}
      </div>

      {result && (
        <div className={cn("rounded-xl border p-4", result.passed ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5")}>
          <p className="font-semibold">
            {result.passed ? "Passed" : "Not quite"} — {result.score} of {result.total} correct ({result.percent}%)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.passed
              ? result.courseCompleted
                ? "That finishes the course. Your certificate is ready."
                : "Lesson complete."
              : `You need ${result.passPercent}% to pass. Review the marked questions and try again.`}
          </p>
          <div className="mt-3 flex gap-2">
            {!result.passed && <Button size="sm" onClick={retry}>Try again</Button>}
            {result.passed && nextHref && (
              <Button asChild size="sm"><Link href={nextHref}>Next lesson</Link></Button>
            )}
          </div>
        </div>
      )}

      <ol className="space-y-5">
        {questions.map((q, qi) => {
          const review = result?.review[qi];
          return (
            <li key={q.id} className="space-y-2">
              <p className="flex items-start gap-2 text-sm font-medium">
                <span className="text-muted-foreground">{qi + 1}.</span> {q.prompt}
                {review && (review.correct ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" />)}
              </p>
              <div className="space-y-1.5 pl-5">
                {q.options.map((o, oi) => {
                  const picked = answers[qi] === oi;
                  const isRight = review?.correctIndex === oi;
                  return (
                    <label
                      key={oi}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        picked && !result && "border-primary bg-primary/5",
                        result && isRight && "border-primary bg-primary/10",
                        result && picked && review && !review.correct && "border-destructive/50 bg-destructive/5",
                        result && "cursor-default",
                      )}
                    >
                      <input type="radio" name={`q-${q.id}`} className="accent-primary" checked={picked} disabled={!!result || busy} onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))} />
                      {o}
                    </label>
                  );
                })}
              </div>
              {review?.explanation && <p className="pl-5 text-xs text-muted-foreground">{review.explanation}</p>}
            </li>
          );
        })}
      </ol>

      {!result && (
        <Button onClick={submit} disabled={busy || answered < questions.length}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {alreadyPassed ? "Retake quiz" : "Submit answers"}
        </Button>
      )}
      {!result && answered < questions.length && <p className="text-xs text-muted-foreground">Answer all {questions.length} questions to submit.</p>}
    </div>
  );
}
