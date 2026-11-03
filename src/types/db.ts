// Plain TypeScript row/document shapes.
import type { Difficulty, RoadmapTrack } from "@/lib/constants";

export interface RoadmapTopic {
  key: string;
  title: string;
  description: string;
  /** Question categories/tags that count toward this topic */
  matchTags: string[];
  /** Number of accepted solves required to complete the topic */
  requiredSolves: number;
}

export interface RoadmapSection {
  key: string;
  title: string;
  tier: "Beginner" | "Intermediate" | "Advanced";
  topics: RoadmapTopic[];
}

export interface RoadmapDoc {
  _id: string;
  track: RoadmapTrack;
  title: string;
  description: string;
  sections: RoadmapSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponDoc {
  _id: string;
  code: string; // stored uppercase
  description?: string;
  type: "percent" | "flat";
  value: number; // percent (0–100) or flat rupees
  minAmount: number; // minimum order (rupees) to qualify
  maxRedemptions: number; // -1 = unlimited
  usedCount: number;
  oncePerUser: boolean;
  plans: ("go" | "plus")[]; // empty = all paid plans
  expiresAt?: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteConfigDoc {
  _id: string;
  // SEO
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  siteKeywords: string;
  ogImage: string;
  twitterHandle: string;
  // Analytics
  gaId: string;
  clarityId: string;
  gscVerification: string;
  // SMTP
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  // AI
  groqApiKey: string;
  groqModel: string;
  // Execution
  executionProvider: string;
  judge0Url: string;
  judge0ApiKey: string;
  paizaUrl: string;
  paizaApiKey: string;
  pistonUrl: string;
  // Redis
  redisUrl: string;
  redisToken: string;
  // OAuth
  googleClientId: string;
  googleClientSecret: string;
  githubClientId: string;
  githubClientSecret: string;
  // Razorpay
  razorpayKeyId: string;
  razorpayKeySecret: string;
}

export interface QuestionExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface QuestionTestCase {
  input: string;
  expected: string;
  hidden: boolean;
}

export interface QuestionDoc {
  _id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  companies: string[];
  description: string;
  examples: QuestionExample[];
  constraints: string[];
  /** language id -> starter code */
  starterCode: Map<string, string>;
  testCases: QuestionTestCase[];
  solution?: string;
  editorial?: string;
  hints: string[];
  isPublished: boolean;
  source: "manual" | "json-import" | "ai-generated";
  createdBy?: string;
  stats: { submissions: number; accepted: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  xp: number;
  level: number;
  solved: { easy: number; medium: number; hard: number; total: number };
  frontendCompleted: number;
  streak: {
    current: number;
    longest: number;
    /** YYYY-MM-DD of last day with an accepted submission */
    lastActiveDate: string | null;
  };
}

export interface UserPreferences {
  editorFontSize: number;
  editorTheme: "vs-dark" | "light";
  vimMode: boolean;
  defaultLanguage: string;
}

export interface UserOnboarding {
  completed: boolean;
  goal?: string;
  level?: string;
  topics: string[];
  companies: string[];
  dailyGoal: number;
  completedAt?: Date;
}

export interface UserDoc {
  _id: string;
  name: string;
  username: string;
  email: string;
  password?: string | null;
  image?: string | null;
  role: "user" | "admin";
  providers: string[];
  banned: boolean;
  /** True if the user opted out of newsletters/marketing (one-click unsubscribe). */
  emailOptOut?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  stats: UserStats;
  preferences: UserPreferences;
  onboarding: UserOnboarding;
  plan: "free" | "go" | "plus";
  planExpiresAt?: Date | null;
  trialEndsAt?: Date | null;
  billingCycle?: "monthly" | "yearly" | null;
  razorpaySubscriptionId?: string | null;
  subscriptionStatus?: "active" | "pending" | "halted" | "cancelled" | "completed" | null;
  cancelAtPeriodEnd?: boolean;
  billing?: {
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  betaUser?: boolean;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
