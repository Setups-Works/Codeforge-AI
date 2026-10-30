import Groq from "groq-sdk";
import { traceable } from "langsmith/traceable";

export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

export function isAiConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add it to .env.local to enable AI features.",
    );
  }
  if (!client) {
    // NOTE: do NOT wrap with langsmith's wrapOpenAI — it expects the OpenAI
    // SDK's `.completions` namespace, which groq-sdk doesn't have, and throws
    // at construction. LangSmith tracing comes from the `traceable` wrappers
    // on complete()/streamCompletion() below instead.
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Non-streaming completion that returns plain text.
 *  traceable adds a named LangSmith span (input/output) when tracing is on. */
export const complete = traceable(
  async (
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; json?: boolean },
  ): Promise<string> => {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    });
    return response.choices[0]?.message?.content ?? "";
  },
  { name: "groq.complete", run_type: "chain" },
);

/** Streaming completion as an async iterable of text chunks. */
export const streamCompletion = traceable(
  async function* (
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<string> {
    const groq = getGroqClient();
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
  { name: "groq.streamCompletion", run_type: "chain" },
);

/** Vision-capable model for image understanding (configurable). */
export const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

/**
 * Multimodal completion: send a system prompt, a text instruction and an image
 * (as a base64 data URL) to a vision model. Returns the text/JSON response.
 */
export const completeVision = traceable(
  async (
    system: string,
    instruction: string,
    imageDataUrl: string,
    options?: { temperature?: number; maxTokens?: number; json?: boolean },
  ): Promise<string> => {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      // groq-sdk types are OpenAI-compatible; multimodal content is supported.
       
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      temperature: options?.temperature ?? 0.6,
      max_tokens: options?.maxTokens ?? 2048,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    });
    return response.choices[0]?.message?.content ?? "";
  },
  { name: "groq.completeVision", run_type: "chain" },
);
