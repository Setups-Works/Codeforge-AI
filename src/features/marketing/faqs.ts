/** Landing-page FAQs — shared by the UI and the FAQPage JSON-LD (SEO). */
export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  { q: "What is Setups Works Lab?", a: "Setups Works Lab (labs.setups.works) is an AI-powered coding-interview prep platform. It combines LeetCode-style DSA problems, an online compiler for 12 languages, frontend sandbox challenges, live contests, personalized roadmaps, spaced-repetition revision and a real-time streaming AI mentor and pair programmer — all in one developer workspace." },
  { q: "Is Setups Works Lab really free?", a: "Yes. Problems, the online compiler, frontend challenges, contests, roadmaps, all 9 AI tools and the forum are completely free. Just create an account." },
  { q: "Can I just run code without a problem?", a: "Yes — the built-in Compiler gives you a blank editor for any of 12 languages with custom stdin, real stdout/stderr and runtime + memory stats. No problem or test cases required. Open it from the nav or head to /compiler." },
  { q: "Which languages can I code in?", a: "JavaScript, TypeScript, Python, Java, C, C++, C#, Go, PHP, Rust, Kotlin and Swift — all in a secure cloud sandbox, in both problems and the compiler." },
  { q: "How does the AI mentor differ from just asking ChatGPT?", a: "It sees your exact problem statement and current code in real time, so hints are specific to your approach. It also won't give you the full solution, by design." },
  { q: "What is spaced repetition?", a: "The SM-2 algorithm schedules reviews at increasing intervals based on recall quality. You review Two Sum at day 1, day 6, day 14 — cementing the pattern." },
  { q: "Can I prepare for specific companies?", a: "Yes — pick Google, Amazon, Microsoft, Meta, Netflix, Uber or Atlassian and track progress against each company's question patterns." },
  { q: "What's the AI Pair Programmer?", a: "A real-time streaming AI that reads your code and converses with you — suggests approaches, debugs errors and explains concepts." },
];
