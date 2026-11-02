import { complete } from "@/services/ai/groq";

const CLASSIFIER_SYSTEM = `You are a topic gate for "Setups Works Lab", a coding-interview mentor chatbot.
Classify the user's latest message and reply with EXACTLY one word: ALLOW or BLOCK.

ALLOW when the message is about: programming, code, debugging, data structures, algorithms,
complexity/Big-O, software engineering, system design, web/frontend/backend, databases, APIs,
developer tooling, technical interviews or tech careers — OR is a short conversational
follow-up inside such a chat (e.g. "yes", "thanks", "why", "explain more", "continue",
"what about edge cases").

BLOCK when the message is clearly unrelated to software or this platform: cooking/recipes,
food, general trivia, sports, travel, relationships, health/medical, legal, finance/investing,
politics, religion, non-coding homework, generating stories/essays/images, or asking you to
act as a general-purpose assistant.

When unsure, prefer ALLOW. Output only the single word ALLOW or BLOCK.`;

/**
 * Lightweight pre-model gate: returns false only when the classifier is
 * confident the message is off-topic. Fails OPEN (returns true) on any error or
 * for short follow-ups, so legitimate users are never blocked.
 */
export async function isOnTopic(message: string): Promise<boolean> {
  const msg = message.trim();
  if (msg.length < 12) return true; // short follow-ups ("yes", "thanks", …)
  try {
    const verdict = await complete(
      [
        { role: "system", content: CLASSIFIER_SYSTEM },
        { role: "user", content: msg.slice(0, 1500) },
      ],
      { temperature: 0, maxTokens: 3 },
    );
    return !/\bBLOCK\b/i.test(verdict);
  } catch {
    return true; // never block a real user because the classifier failed
  }
}

export const OFF_TOPIC_REPLY =
  "I'm your coding mentor on Setups Works Lab, so I can only help with programming, DSA and interview-prep questions. Try asking me about a problem, an algorithm, or your code!";
