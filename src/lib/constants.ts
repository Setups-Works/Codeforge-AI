export const APP_NAME = "Setups Works Lab";
export const APP_VERSION = "3.4.0";
export const APP_DESCRIPTION =
  "Setups Works Lab is an AI-powered coding interview prep platform — practice DSA, run code in an online compiler for 12 languages, get an AI mentor and pair programmer, and ace your next technical interview.";

export type LanguageId =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "php"
  | "rust"
  | "kotlin"
  | "swift";

export interface LanguageConfig {
  id: LanguageId;
  label: string;
  /** Monaco editor language id */
  monaco: string;
  /** Piston runtime language name */
  piston: string;
  /** Judge0 CE language id */
  judge0: number;
  /** File extension used by execution providers */
  extension: string;
  defaultSnippet: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    piston: "javascript",
    judge0: 63,
    extension: "js",
    defaultSnippet: "// Write your solution here\n",
  },
  {
    id: "typescript",
    label: "TypeScript",
    monaco: "typescript",
    piston: "typescript",
    judge0: 74,
    extension: "ts",
    defaultSnippet: "// Write your solution here\n",
  },
  {
    id: "python",
    label: "Python",
    monaco: "python",
    piston: "python",
    judge0: 71,
    extension: "py",
    defaultSnippet: "# Write your solution here\n",
  },
  {
    id: "java",
    label: "Java",
    monaco: "java",
    piston: "java",
    judge0: 62,
    extension: "java",
    defaultSnippet:
      "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n",
  },
  {
    id: "c",
    label: "C",
    monaco: "c",
    piston: "c",
    judge0: 50,
    extension: "c",
    defaultSnippet:
      "#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n",
  },
  {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    piston: "c++",
    judge0: 54,
    extension: "cpp",
    defaultSnippet:
      "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n",
  },
  {
    id: "csharp",
    label: "C#",
    monaco: "csharp",
    piston: "csharp",
    judge0: 51,
    extension: "cs",
    defaultSnippet:
      "using System;\n\npublic class Program {\n    public static void Main() {\n        \n    }\n}\n",
  },
  {
    id: "go",
    label: "Go",
    monaco: "go",
    piston: "go",
    judge0: 60,
    extension: "go",
    defaultSnippet:
      'package main\n\nimport "fmt"\n\nfunc main() {\n    _ = fmt.Sprint\n}\n',
  },
  {
    id: "php",
    label: "PHP",
    monaco: "php",
    piston: "php",
    judge0: 68,
    extension: "php",
    defaultSnippet: "<?php\n// Write your solution here\n",
  },
  {
    id: "rust",
    label: "Rust",
    monaco: "rust",
    piston: "rust",
    judge0: 73,
    extension: "rs",
    defaultSnippet: "fn main() {\n    \n}\n",
  },
  {
    id: "kotlin",
    label: "Kotlin",
    monaco: "kotlin",
    piston: "kotlin",
    judge0: 78,
    extension: "kt",
    defaultSnippet: "fun main() {\n    \n}\n",
  },
  {
    id: "swift",
    label: "Swift",
    monaco: "swift",
    piston: "swift",
    judge0: 83,
    extension: "swift",
    defaultSnippet: "// Write your solution here\n",
  },
];

export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id) as [
  LanguageId,
  ...LanguageId[],
];

export function getLanguage(id: string): LanguageConfig | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

export const QUESTION_CATEGORIES = [
  // DSA
  "Arrays",
  "Strings",
  "HashMaps",
  "Linked List",
  "Stack",
  "Queue",
  "Recursion",
  "Binary Search",
  "Sorting",
  "Two Pointers",
  "Sliding Window",
  "Trees",
  "Graphs",
  "Heap",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
  "Tries",
  "Bit Manipulation",
  "Math",
  // JavaScript
  "JavaScript Basics",
  "ES6+ Features",
  "Closures & Scope",
  "Arrays & Objects",
  "Async & Promises",
  "DOM & Events",
  "Error Handling",
  "Modules",
  // React
  "React Components",
  "JSX & Rendering",
  "Props & State",
  "React Events",
  "Conditional Rendering",
  "Lists & Keys",
  "Forms & Controlled Components",
  "React Hooks",
  "Component Lifecycle",
  "React Router",
  "API Integration",
  "Context & State Management",
  "React Best Practices",
  "Debugging & Performance",
] as const;

export const FRONTEND_TECHS = [
  "html-css",
  "javascript",
  "react",
  "react-tailwind",
] as const;
export type FrontendTech = (typeof FRONTEND_TECHS)[number];

export const FRONTEND_TECH_LABELS: Record<FrontendTech, string> = {
  "html-css": "HTML & CSS",
  javascript: "JavaScript",
  react: "React",
  "react-tailwind": "React + Tailwind",
};

/** XP awarded for first accepted solve, by difficulty */
export const XP_REWARDS: Record<Difficulty, number> = {
  Easy: 10,
  Medium: 25,
  Hard: 50,
};

export const XP_DAILY_CHALLENGE_BONUS = 15;
export const XP_FRONTEND_CHALLENGE: Record<Difficulty, number> = {
  Easy: 15,
  Medium: 30,
  Hard: 60,
};

/** Total XP required to reach a given level (level 1 = 0 XP) */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * (level - 1) * level);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level++;
  return level;
}

export const COMPANIES = [
  "Google",
  "Amazon",
  "Microsoft",
  "Meta",
  "Netflix",
  "Uber",
  "Atlassian",
] as const;

export const SUBMISSION_STATUSES = [
  "Accepted",
  "Wrong Answer",
  "Time Limit Exceeded",
  "Runtime Error",
  "Compilation Error",
  "Internal Error",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const ROADMAP_TRACKS = ["dsa", "frontend"] as const;
export type RoadmapTrack = (typeof ROADMAP_TRACKS)[number];

export const CONTEST_TYPES = ["weekly", "daily", "custom"] as const;
export type ContestType = (typeof CONTEST_TYPES)[number];

export const EXECUTION_LIMITS = {
  /** Max wall time per test case (ms) communicated to providers */
  timeoutMs: 10_000,
  maxCodeLength: 64_000,
  maxStdinLength: 16_000,
  maxTestCasesPerRun: 20,
};

export const BETA_LIMIT = 50;

export const RATE_LIMITS = {
  auth: { requests: 10, window: "60 s" },
  execute: { requests: 12, window: "60 s" },
  submit: { requests: 8, window: "60 s" },
  ai: { requests: 20, window: "300 s" },
  aiGenerate: { requests: 5, window: "300 s" },
  api: { requests: 120, window: "60 s" },
  payment: { requests: 10, window: "60 s" },
} as const;
