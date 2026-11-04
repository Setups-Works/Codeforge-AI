import { z } from "zod";

export const aiChatRequestSchema = z.object({
  message: z.string().min(1).max(8_000),
  context: z
    .enum(["question", "challenge", "interview", "general", "lesson"])
    .default("general"),
  questionId: z.string().regex(/^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  challengeId: z.string().regex(/^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  /** Course lesson the learner is watching (context "lesson") */
  lessonId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  /** User's current editor code, sent for context-aware help */
  code: z.string().max(64_000).optional(),
  language: z.string().max(20).optional(),
  /** Last failing test output, for "why is my solution failing?" */
  failureContext: z.string().max(8_000).optional(),
  /** Quick action key (explain, hint, optimize, complexity, ...) */
  action: z
    .enum([
      "chat",
      "explain-problem",
      "hint",
      "explain-solution",
      "optimize",
      "complexity",
      "similar-questions",
      "why-failing",
      "interview-coach",
    ])
    .default("chat"),
  /** Hint level 1-3 for progressive hints */
  hintLevel: z.coerce.number().int().min(1).max(3).optional(),
});

export const interviewFeedbackSchema = z.object({
  topic: z.string().max(100),
  durationMinutes: z.number().int().min(1).max(240),
  questions: z
    .array(
      z.object({
        title: z.string().max(200),
        difficulty: z.string().max(20),
        solved: z.boolean(),
        timeSpentSeconds: z.number().int().min(0),
        code: z.string().max(64_000).optional(),
        language: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(10),
});

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type InterviewFeedbackRequest = z.infer<typeof interviewFeedbackSchema>;
