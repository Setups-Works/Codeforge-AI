import { QUIZ_LIMITS } from "@/lib/lms/constants";

export interface QuizQuestionKey {
  correctIndex: number;
  optionCount: number;
}

export interface GradeResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  /** Per question: true if correct. Unanswered counts as wrong. */
  correct: boolean[];
}

/** Grade submitted answers (option indexes, null/undefined = unanswered). */
export function gradeQuiz(questions: QuizQuestionKey[], answers: (number | null | undefined)[], passPercent: number): GradeResult {
  const correct = questions.map((q, i) => {
    const a = answers[i];
    return Number.isInteger(a) && (a as number) >= 0 && (a as number) < q.optionCount && a === q.correctIndex;
  });
  const score = correct.filter(Boolean).length;
  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  return { score, total, percent, passed: total > 0 && percent >= passPercent, correct };
}

export interface QuizDraftQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

/** Validate an admin-authored quiz; returns an error message or null. */
export function validateQuiz(questions: QuizDraftQuestion[]): string | null {
  if (questions.length === 0) return "Add at least one question";
  if (questions.length > QUIZ_LIMITS.questions) return `A quiz can have at most ${QUIZ_LIMITS.questions} questions`;
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    if (!q.prompt.trim()) return `Question ${n} needs a prompt`;
    const options = q.options.map((o) => o.trim());
    if (options.length < QUIZ_LIMITS.options.min || options.length > QUIZ_LIMITS.options.max) {
      return `Question ${n} needs ${QUIZ_LIMITS.options.min}–${QUIZ_LIMITS.options.max} options`;
    }
    if (options.some((o) => !o)) return `Question ${n} has an empty option`;
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return `Question ${n} has duplicate options`;
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) {
      return `Question ${n} needs a correct answer`;
    }
  }
  return null;
}
