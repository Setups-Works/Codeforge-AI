import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceAiCredit } from "@/services/ai-credits";
import { enforceRateLimit } from "@/lib/rate-limit";
import { aiChatRequestSchema } from "@/schemas/ai";
import {
isAiConfigured,
streamCompletion,
type ChatMessage,
} from "@/services/ai/groq";
import { getPrompt } from "@/services/ai/prompts";
import { isOnTopic,OFF_TOPIC_REPLY } from "@/services/ai/topic-guard";
import { getPostHogServer } from "@/lib/posthog-server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
findOrCreateAiChat,
saveAiChatMessages,
getAiChatMessages,
type StoredChatMessage,
} from "@/services/ai-store";

export const maxDuration = 60;

const HISTORY_LIMIT = 12;

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const credit = await enforceAiCredit(session.user.id, session.user.plan);
  if (credit) return credit;

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI features are not configured. Add GROQ_API_KEY to your environment (free key at console.groq.com).",
      },
      { status: 503 },
    );
  }

  const limited = await enforceRateLimit("ai", req, session.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = aiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Build problem context for the system prompt
  let contextBlock = "";
  if (input.questionId) {
    const { data } = await supabaseAdmin()
      .from("questions")
      .select("title,difficulty,category,description,constraints")
      .eq("id", input.questionId)
      .maybeSingle();
    const question = data as {
      title: string;
      difficulty: string;
      category: string;
      description: string;
      constraints: string[];
    } | null;
    if (question) {
      contextBlock += `Current problem: "${question.title}" (${question.difficulty}, ${question.category})\n\nProblem statement:\n${question.description.slice(0, 4000)}\n\nConstraints: ${(question.constraints ?? []).join("; ")}\n`;
    }
  }
  if (input.challengeId) {
    const { data } = await supabaseAdmin()
      .from("frontend_challenges")
      .select("title,difficulty,tech,description")
      .eq("id", input.challengeId)
      .maybeSingle();
    const challenge = data as { title: string; difficulty: string; tech: string; description: string } | null;
    if (challenge) {
      contextBlock += `Current frontend challenge: "${challenge.title}" (${challenge.difficulty}, ${challenge.tech})\n\nBrief:\n${challenge.description.slice(0, 3000)}\n`;
    }
  }
  if (input.code) {
    contextBlock += `\nUser's current ${input.language ?? ""} code:\n\`\`\`\n${input.code.slice(0, 8000)}\n\`\`\`\n`;
  }
  if (input.failureContext && input.action === "why-failing") {
    contextBlock += `\nFailing test details:\n${input.failureContext.slice(0, 4000)}\n`;
  }

  const system = await getPrompt("mentor-system", { context: contextBlock });

  // Quick actions get a canned instruction as the user turn
  let userMessage = input.message;
  if (input.action !== "chat") {
    const action = await getPrompt(input.action, {
      level: String(input.hintLevel ?? 1),
    });
    userMessage = action.text;
  }

  // Load conversation history for this context
  const chat = await findOrCreateAiChat({
    userId: session.user.id,
    context: input.context,
    questionId: input.questionId,
    challengeId: input.challengeId,
  });

  const history: ChatMessage[] = chat.messages
    .slice(-HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));

  const messages: ChatMessage[] = [
    { role: "system", content: system.text },
    ...history,
    { role: "user", content: userMessage },
  ];

  const posthog = getPostHogServer();
  posthog?.capture({
    distinctId: session.user.id,
    event: "ai_mentor_messaged",
    properties: {
      action: input.action,
      context: input.context,
      has_question: !!input.questionId,
      has_challenge: !!input.challengeId,
    },
  });

  // Hard gate: for free-form messages, classify the topic before spending a
  // full model call. Off-topic messages get the canned refusal and never reach
  // the mentor model. Quick actions always operate on a problem, so skip them.
  const offTopic =
    input.action === "chat" && !(await isOnTopic(input.message));

  const encoder = new TextEncoder();
  let assistantReply = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (offTopic) {
          assistantReply = OFF_TOPIC_REPLY;
          controller.enqueue(encoder.encode(OFF_TOPIC_REPLY));
          controller.close();
        } else {
          for await (const delta of streamCompletion(messages, {
            temperature: system.temperature,
            maxTokens: system.maxTokens,
          })) {
            assistantReply += delta;
            controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        }
      } catch (streamError) {
        controller.enqueue(
          encoder.encode(
            "\n\n_The AI mentor hit an error. Please try again._",
          ),
        );
        controller.close();
        console.error("AI stream error:", streamError);
      }

      // Persist the exchange after the stream completes
      try {
        const next: StoredChatMessage[] = [
          ...chat.messages,
          { role: "user", content: userMessage, createdAt: new Date().toISOString() },
          {
            role: "assistant",
            content: assistantReply || "(no response)",
            createdAt: new Date().toISOString(),
          },
        ];
        await saveAiChatMessages(chat.id, next.slice(-60));
      } catch (persistError) {
        console.error("Failed to persist AI chat:", persistError);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

/** Fetch existing conversation for a context (panel hydration) */
export async function GET(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;

  const questionId = req.nextUrl.searchParams.get("questionId");
  const challengeId = req.nextUrl.searchParams.get("challengeId");
  const context = req.nextUrl.searchParams.get("context") ?? "general";

  const messages = await getAiChatMessages({
    userId: session.user.id,
    context,
    questionId,
    challengeId,
  });

  return NextResponse.json({ messages });
}
