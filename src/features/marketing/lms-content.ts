import { Bot, Code2, GraduationCap, ListChecks, Medal, StickyNote, Video, CreditCard, type LucideIcon } from "@/components/icons";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import type { Faq } from "./faqs";

/**
 * Copy for the landing page's Courses section. Anything that depends on live
 * data (course cards, prices, counts) is passed in by the page; this file only
 * holds wording, and pulls policy numbers from their single source of truth.
 */

export interface LandingCourse {
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  level: string | null;
  priceInr: number;
  compareAtInr: number | null;
  isFree: boolean;
  instructorName: string | null;
  lessonCount: number;
  durationS: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface LandingLearn {
  courses: LandingCourse[];
  total: number;
  /** Any course is included with a subscription plan. */
  hasPlanIncluded: boolean;
  /** Any bundle is on sale. */
  hasBundles: boolean;
}

export const LEARN_STEPS = [
  { title: "Pick a course", desc: "Browse the catalogue, preview free lessons and read verified reviews." },
  { title: "Get access", desc: "Buy once, grab a bundle, or start free if your plan includes it." },
  { title: "Learn and practise", desc: "Watch lessons, solve real coding problems and pass quizzes that unlock what's next." },
  { title: "Earn your certificate", desc: "Finish the course and get a certificate anyone can verify with its code." },
] as const;

export const LEARN_FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Video, title: "Video lessons that remember you", desc: "Progress tracking, Continue watching and resume where you stopped." },
  { icon: Code2, title: "Coding lessons, not just videos", desc: "Lessons can be real problems in the same workspace you already use. Solve it and the lesson completes." },
  { icon: ListChecks, title: "Quizzes and guided paths", desc: "Pass a quiz to unlock the next lesson, or let lessons open on a schedule." },
  { icon: Bot, title: "An AI mentor that knows the lesson", desc: "Ask about what you're watching right now. It never gives away quiz answers." },
  { icon: StickyNote, title: "Notes, Q&A and reviews", desc: "Private timestamped notes, per-lesson questions with instructor replies, and honest reviews from verified learners." },
  { icon: Medal, title: "Verifiable certificates", desc: "A shareable certificate for every course you finish, with a code anyone can check." },
  { icon: GraduationCap, title: "Earn XP while you learn", desc: "Lessons and courses count toward your streak, level and badges." },
  { icon: CreditCard, title: "Simple, fair billing", desc: `One place for plans, courses and invoices. No extra taxes or fees, and a ${COURSE_REFUND_DAYS}-day refund window.` },
];

export const LEARN_FAQS: Faq[] = [
  { q: "How do courses work on Setups Works Lab?", a: "Courses are video lessons organised into sections. You can mix in coding-problem lessons and quizzes, track your progress, and earn a certificate when you finish. Switch between Practice and Learn from the top bar." },
  { q: "Can I try a course before buying?", a: "Yes. Courses can mark lessons as free previews, and the course page shows the full curriculum, outcomes and reviews from verified learners." },
  { q: "Are any courses included with my plan?", a: "Some courses are included with the Go or Plus plan. When one is, the course page shows a one-click start with your plan. Access lasts while your subscription does." },
  { q: "What is your refund policy for courses?", a: `You can request a refund within ${COURSE_REFUND_DAYS} days of buying a course. Prices are final — no extra taxes or fees are added at checkout.` },
  { q: "How do certificates work?", a: "Finish every lesson in a course and a certificate is issued automatically. It has a unique code and a public page where anyone can verify it." },
];
