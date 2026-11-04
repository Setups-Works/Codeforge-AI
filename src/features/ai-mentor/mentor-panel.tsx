"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Loader2, SendHorizonal, Sparkles, X } from "@/components/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/shared/markdown";
import { cn } from "@/lib/utils";

interface MentorMessage {
  role: "user" | "assistant";
  content: string;
}

interface QuickAction {
  key: string;
  label: string;
  message: string;
}

const QUESTION_ACTIONS: QuickAction[] = [
  { key: "explain-problem", label: "Explain problem", message: "Explain this problem" },
  { key: "hint", label: "Hint", message: "Give me a hint" },
  { key: "why-failing", label: "Why failing?", message: "Why is my solution failing?" },
  { key: "explain-solution", label: "Explain my code", message: "Explain my solution" },
  { key: "optimize", label: "Optimize", message: "Optimize my code" },
  { key: "complexity", label: "Complexity", message: "What's the complexity?" },
  { key: "similar-questions", label: "Similar", message: "Suggest similar questions" },
];

const LESSON_ACTIONS = [
  { label: "Summarise", message: "Summarise this lesson in a few bullet points" },
  { label: "Explain simply", message: "Explain the main idea of this lesson in simple terms" },
  { label: "Quiz me", message: "Ask me three short questions to check my understanding of this lesson, one at a time" },
];

interface MentorPanelProps {
  context: "question" | "challenge" | "interview" | "general" | "lesson";
  questionId?: string;
  lessonId?: string;
  challengeId?: string;
  code?: string;
  language?: string;
  failureContext?: string;
  onClose?: () => void;
}

export function MentorPanel({
  context,
  questionId,
  challengeId,
  lessonId,
  code,
  language,
  failureContext,
  onClose,
}: MentorPanelProps) {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate persisted conversation
  const { data: existing } = useQuery<{ messages: MentorMessage[] }>({
    queryKey: ["ai-chat", context, questionId ?? "", challengeId ?? "", lessonId ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams({ context });
      if (questionId) params.set("questionId", questionId);
      if (challengeId) params.set("challengeId", challengeId);
      if (lessonId) params.set("lessonId", lessonId);
      const res = await fetch(`/api/ai/chat?${params.toString()}`);
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (existing?.messages?.length && messages.length === 0) {
      setMessages(existing.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(action: string, displayMessage: string) {
    if (streaming) return;
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: displayMessage },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: displayMessage,
          action,
          context,
          questionId,
          challengeId,
          lessonId,
          code: code || undefined,
          language,
          failureContext: failureContext || undefined,
          hintLevel: action === "hint" ? hintLevel : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "AI request failed");
      }

      if (action === "hint") setHintLevel((level) => Math.min(level + 1, 3));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: reply };
          return next;
        });
      }
    } catch (sendError) {
      setMessages((prev) => prev.slice(0, -2));
      toast.error(
        sendError instanceof Error ? sendError.message : "AI request failed",
      );
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    send("chat", trimmed);
  }

  return (
    <div className="flex h-full flex-col border-l bg-card/40">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <Bot className="size-4 text-primary" />
        <span className="text-sm font-medium">AI Mentor</span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7"
            onClick={onClose}
            aria-label="Close AI mentor"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {context === "lesson" && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b p-2">
          {LESSON_ACTIONS.map((action) => (
            <button
              key={action.label}
              disabled={streaming}
              onClick={() => send("chat", action.message)}
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {context === "question" && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b p-2">
          {QUESTION_ACTIONS.map((action) => (
            <button
              key={action.key}
              disabled={streaming}
              onClick={() =>
                send(
                  action.key,
                  action.key === "hint"
                    ? `Give me hint ${hintLevel} of 3`
                    : action.message,
                )
              }
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto mb-2 size-6 text-primary/60" />
              <p className="text-xs text-muted-foreground">
                {context === "lesson"
                  ? "Ask anything about this lesson — explanations, examples, or a quick check of your understanding."
                  : "Ask anything about this problem — hints, debugging help, complexity analysis, or interview tips."}
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "ml-6 bg-primary/10"
                  : "mr-2 border bg-card",
              )}
            >
              {message.role === "assistant" ? (
                message.content ? (
                  <Markdown>{message.content}</Markdown>
                ) : (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-2">
        <div className="flex items-end gap-1.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask the AI mentor..."
            rows={2}
            className="min-h-0 resize-none text-sm"
          />
          <Button
            size="icon"
            className="shrink-0"
            disabled={streaming || !input.trim()}
            onClick={handleSubmit}
            aria-label="Send message"
          >
            {streaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
