"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Flame,
  GraduationCap,
  Map,
  Menu,
  Sparkles,
  Star,
  Terminal,
  Trophy,
  Users,
  X,
  Zap,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { APP_NAME, APP_VERSION, LANGUAGES } from "@/lib/constants";
import { FAQS } from "./faqs";
import {
  SiJavascript,
  SiTypescript,
  SiPython,
  SiOpenjdk,
  SiC,
  SiCplusplus,
  SiSharp,
  SiGo,
  SiPhp,
  SiRust,
  SiKotlin,
  SiSwift,
} from "react-icons/si";
import type { IconType } from "react-icons";
import { FaLinkedin, FaInstagram } from "react-icons/fa6";
import { cn } from "@/lib/utils";

/* ── ReactBits (SSR-safe: static imports) ─────────────────────────── */
import SplitText from "@/components/reactbits/SplitText";
import RotatingText from "@/components/reactbits/RotatingText";
import ShinyText from "@/components/reactbits/ShinyText";
import GradientText from "@/components/reactbits/GradientText";
import RBCountUp from "@/components/reactbits/CountUp";
import StarBorder from "@/components/reactbits/StarBorder";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import AnimatedContent from "@/components/reactbits/AnimatedContent";
import LogoLoop from "@/components/reactbits/LogoLoop";
import GlassIcons from "@/components/reactbits/GlassIcons";
import ClickSpark from "@/components/reactbits/ClickSpark";
import Magnet from "@/components/reactbits/Magnet";
import { HeroCompiler } from "./hero-compiler";

/* ── ReactBits (WebGL / window at mount: client-only) ─────────────── */
const Aurora = dynamic(() => import("@/components/reactbits/Aurora"), { ssr: false });
const Particles = dynamic(() => import("@/components/reactbits/Particles"), { ssr: false });
const MagicBento = dynamic(() => import("@/components/reactbits/MagicBento"), { ssr: false });
const GlassSurface = dynamic(() => import("@/components/reactbits/GlassSurface"), { ssr: false });
const DotGrid = dynamic(() => import("@/components/reactbits/DotGrid"), { ssr: false });

const PricingCards = dynamic(
  () => import("@/features/subscription/pricing-cards").then((m) => m.PricingCards),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-2xl border border-black/[0.08] bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]" />
    ),
  },
);

/** Brand logos for the language marquee, keyed by LANGUAGES id. */
const LANG_ICONS: Record<string, IconType> = {
  javascript: SiJavascript,
  typescript: SiTypescript,
  python: SiPython,
  java: SiOpenjdk,
  c: SiC,
  cpp: SiCplusplus,
  csharp: SiSharp,
  go: SiGo,
  php: SiPhp,
  rust: SiRust,
  kotlin: SiKotlin,
  swift: SiSwift,
};

export interface LandingProblem {
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  acceptanceRate: number | null;
}

/* ── dual-theme design tokens ─────────────────────────────────────── */
const ACCENT = "#006bff";
const ACCENT_L = "#4d9bff";
/** Page backgrounds used by canvas overlays (marquee fades) per theme. */
const BG_DARK = "#030308";
const BG_LIGHT = "#f7f8fb";

const pageCls = "bg-[#f7f8fb] text-neutral-900 dark:bg-[#030308] dark:text-neutral-50";
const glass =
  "border border-black/[0.08] bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]";
const glassCard =
  "rounded-2xl border border-black/[0.08] bg-white/80 dark:border-white/10 dark:bg-white/[0.04]";
const inkHead = "text-neutral-900 dark:text-white";
const inkSub = "text-neutral-600 dark:text-neutral-400";
const inkFaint = "text-neutral-500 dark:text-neutral-500";
const lineCls = "border-black/[0.06] dark:border-white/[0.07]";
const hoverRow = "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com/CodeForgeAI-io/Codeforge-AI", Icon: null },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/codeforge-ai/", Icon: FaLinkedin },
  { label: "Instagram", href: "https://www.instagram.com/codeforgeai.io/", Icon: FaInstagram },
] as const;

/* ── data ─────────────────────────────────────────────────────────── */

const NAV = [
  ["Features", "#features"],
  ["Workflow", "#workflow"],
  ["AI Suite", "#ai"],
  ["Problems", "/problems"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
] as const;

const STATS = [
  { value: 500, suffix: "+", label: "Problems solved daily" },
  { value: 12, suffix: "", label: "Languages supported" },
  { value: 9, suffix: "", label: "AI-powered tools" },
  { value: 27, suffix: "+", label: "Platform features" },
];

const COMPANY_LOGOS = ["Google", "Meta", "Amazon", "Microsoft", "Netflix", "Uber", "Atlassian", "Apple"];

const ROTATING_WORDS = ["interviews", "algorithms", "frontend", "contests", "system design"];

const AI_TOOLS = [
  { icon: GraduationCap, label: "Learning Coach", desc: "Personalized guidance for your weak areas", color: "blue" },
  { icon: Users, label: "Pair Programmer", desc: "Conversational, real-time coding help", color: "indigo" },
  { icon: Map, label: "Roadmap Generator", desc: "A study path toward your target role", color: "purple" },
  { icon: FileText, label: "Resume Analyzer", desc: "Feedback tuned to engineering roles", color: "green" },
  { icon: Code2, label: "Code Reviewer", desc: "Correctness, style and edge cases", color: "orange" },
  { icon: BarChart3, label: "Complexity Visualizer", desc: "Big-O for any snippet, explained", color: "red" },
];

/** Feature cards rendered by MagicBento (always on the dark band). */
const BENTO_CARDS = [
  { color: "#070b16", label: "Editor", title: "VS Code-style workspace", description: "Monaco editor with Vim mode, IntelliSense and instant verdicts." },
  { color: "#070b16", label: "AI", title: "Live AI mentor", description: "Progressive hints that see your code — never the full answer." },
  { color: "#070b16", label: "Visualize", title: "See your code run", description: "Run your solution and watch it animate step by step — correct or wrong, it shows you exactly what your code does." },
  { color: "#070b16", label: "Compiler", title: "Instant online compiler", description: "A blank editor for 12 languages with custom stdin, real stdout/stderr and runtime + memory stats. Plus a Web mode: HTML/CSS/JS, React with npm packages, and Next.js — right in the browser." },
  { color: "#070b16", label: "Memory", title: "Spaced repetition", description: "SM-2 resurfaces problems right before you forget them, so patterns stick for the long term." },
  { color: "#070b16", label: "Compete", title: "Contests & streaks", description: "Leaderboards, XP, badges and a GitHub-style heatmap." },
  { color: "#070b16", label: "Insights", title: "Skill analytics", description: "Weakness detection shows exactly where to focus next." },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "SDE @ FAANG", avatar: "P", quote: "The AI mentor is the closest thing to a senior engineer next to you. Finally internalized sliding window." },
  { name: "Marcus T.", role: "Frontend Engineer", avatar: "M", quote: "Every other platform ignores frontend folks. The sandbox challenges with AI design review are exactly what I needed." },
  { name: "Aditi R.", role: "CS Student", avatar: "A", quote: "94-day streak and counting — went from failing easies to clearing mediums in one sitting." },
  { name: "Rohan K.", role: "Backend Dev → SDE-2", avatar: "R", quote: "Pair Programmer plus spaced repetition changed how I retain algorithms. Stopped forgetting patterns." },
  { name: "Sara M.", role: "Final Year Student", avatar: "S", quote: "Generated my entire 8-week study plan in 30 seconds. It even accounted for my weak topics." },
  { name: "James L.", role: "Senior SDE", avatar: "J", quote: "Weakness detection put my graph acceptance at 20%. Three weeks later it's 85%. Data-driven practice works." },
];

// FAQs live in ./faqs so the home page can also emit FAQPage JSON-LD (SEO).

const STEPS = [
  { n: "01", title: "Create your free account", body: "Sign up with email, Google or GitHub. Pick your track: DSA, Frontend, or both. Takes 30 seconds." },
  { n: "02", title: "Solve, practice, and learn", body: "Code in a full editor. The AI mentor gives hints. Spaced repetition locks in patterns." },
  { n: "03", title: "Level up and get hired", body: "Earn XP, keep streaks, climb leaderboards, and walk into any interview prepared." },
];

const FOOTER_COLS = [
  { heading: "Platform", links: [{ label: "Problems", href: "/problems" }, { label: "Challenges", href: "/challenges" }, { label: "Contests", href: "/contests" }, { label: "Roadmaps", href: "/roadmaps" }, { label: "Leaderboard", href: "/leaderboard" }] },
  { heading: "AI Tools", links: [{ label: "Learning Coach", href: "/ai-tools" }, { label: "Pair Programmer", href: "/ai-tools" }, { label: "Study Planner", href: "/ai-tools" }, { label: "Resume Analyzer", href: "/ai-tools" }] },
  { heading: "Community", links: [{ label: "Forum", href: "/forum" }, { label: "Discussions", href: "/discuss" }, { label: "Notes", href: "/notes" }, { label: "Company Prep", href: "/companies" }] },
  { heading: "Legal", links: [{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }, { label: "Changelog", href: "/changelog" }, { label: "Status", href: "/status" }, { label: "Design", href: "/design-guidelines" }, { label: "Feedback", href: "/feedback" }] },
];

/* ── helpers ──────────────────────────────────────────────────────── */

/** True once we know the browser can create a WebGL context — the ogl-based
 *  backgrounds (Aurora/Particles) throw without one, so we skip them instead
 *  of letting the whole page hit the error boundary. */
function useWebGL(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setOk(!!(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

/** Resolved theme after mount (SSR-safe): defaults to dark until hydrated. */
function useIsLight(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "light";
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.175, 0.885, 0.32, 1.1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ eyebrow, title, sub, dark }: { eyebrow: string; title: ReactNode; sub?: string; dark?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-2xl px-4 text-center">
      <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1", dark ? "border border-white/10 bg-white/[0.05] backdrop-blur-xl" : glass)}>
        <span className="size-1.5 rounded-full" style={{ background: ACCENT_L }} />
        <ShinyText text={eyebrow} speed={3.5} className="text-[12px] font-medium tracking-wide" />
      </span>
      <h2 className={cn("mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl", dark ? "text-white" : inkHead)}>{title}</h2>
      {sub && <p className={cn("mt-3 text-base sm:text-lg", dark ? "text-neutral-400" : inkSub)}>{sub}</p>}
    </Reveal>
  );
}

function slowScrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = el.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: target, behavior: "smooth" });
}

/* ── mock visuals (theme-aware) ───────────────────────────────────── */

const mockShell =
  "overflow-hidden rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#0a0e1a]";
const mockBar = "flex items-center gap-1.5 border-b border-black/[0.06] px-4 py-3 dark:border-white/10";
const mockText = "text-neutral-700 dark:text-neutral-300";
const mockMeta = "text-neutral-500 dark:text-neutral-400";
const mockDots = (
  <>
    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
    <span className="size-2.5 rounded-full bg-[#febc2e]" />
    <span className="size-2.5 rounded-full bg-[#28c840]" />
  </>
);

function EditorMock() {
  return (
    <div className={cn(mockShell, "shadow-[0_24px_80px_rgba(0,40,120,0.18)] dark:shadow-[0_24px_80px_rgba(0,40,120,0.35)]")}>
      <div className={mockBar}>
        {mockDots}
        <span className={cn("ml-2 font-mono text-xs", inkFaint)}>solution.py</span>
        <span className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: ACCENT }}>AI</span>
      </div>
      <pre tabIndex={0} className={cn("overflow-x-auto p-4 font-mono text-[11.5px] leading-relaxed sm:p-5 sm:text-[12.5px]", mockText)}>
{`def maxProfit(prices):
    min_price = float("inf")
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit`}
      </pre>
      <div className={cn("flex items-center gap-2 border-t border-black/[0.06] px-5 py-3 text-xs dark:border-white/10", mockMeta)}>
        <Check className="size-4" style={{ color: ACCENT }} />
        12/12 test cases passed · 48 ms · beats 97%
      </div>
    </div>
  );
}

function CompilerMock() {
  return (
    <div className={mockShell}>
      <div className={mockBar}>
        {mockDots}
        <span className={cn("ml-2 font-mono text-xs", inkFaint)}>main.py</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: ACCENT }}>Run ▶</span>
      </div>
      <pre tabIndex={0} className={cn("overflow-x-auto px-5 py-4 font-mono text-[12px] leading-relaxed", mockText)}>
{`name = input()
print(f"Hello, {name}!")
for i in range(3):
    print(i * i)`}
      </pre>
      <div className="border-t border-black/[0.06] bg-neutral-950 px-5 py-3 font-mono text-[11.5px] leading-relaxed text-neutral-300 dark:border-white/10 dark:bg-black/60">
        <div className="text-neutral-400">{"// output"}</div>
        <div>Hello, Ada!</div>
        <div>0</div>
        <div>1</div>
        <div>4</div>
      </div>
      <div className={cn("flex items-center gap-2 border-t border-black/[0.06] px-5 py-2.5 text-xs dark:border-white/10", mockMeta)}>
        <span className="size-1.5 rounded-full bg-[#28c840]" />
        exited 0 · 14 ms · 9.2 MB
      </div>
    </div>
  );
}

function MentorChatMock() {
  return (
    <div className={cn(mockShell, "space-y-2.5 p-4")}>
      <div className="ml-10 rounded-xl rounded-br-sm bg-neutral-100 px-3.5 py-2.5 text-xs text-neutral-800 dark:bg-[#1c2740] dark:text-neutral-100">Why is this O(n²)?</div>
      <div className="mr-8 rounded-xl rounded-bl-sm px-3.5 py-2.5 text-xs text-white" style={{ background: ACCENT }}>Think about what you re-compute on every pass. What structure gives O(1) lookups?</div>
      <div className="ml-10 rounded-xl rounded-br-sm bg-neutral-100 px-3.5 py-2.5 text-xs text-neutral-800 dark:bg-[#1c2740] dark:text-neutral-100">A hash map of complements!</div>
      <div className="mr-8 rounded-xl rounded-bl-sm px-3.5 py-2.5 text-xs text-white" style={{ background: ACCENT }}>Exactly — one pass, O(n). Try it, then we can talk edge cases. ✓</div>
    </div>
  );
}

function AnalyticsMock() {
  return (
    <div className={cn(mockShell, "p-5")}>
      <div className="space-y-2.5">
        {[["Arrays", 91], ["Strings", 78], ["DP", 34], ["Graphs", 19]].map(([t, v]) => (
          <div key={t as string}>
            <div className={cn("mb-1 flex justify-between text-[11px]", mockMeta)}><span>{t}</span><span>{v as number}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${v}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_L})` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-12 gap-1">
        {Array.from({ length: 24 }).map((_, i) => {
          const on = [2, 3, 4, 7, 8, 9, 13, 14, 16, 17, 21, 22].includes(i);
          return <span key={i} className={cn("aspect-square rounded-[3px]", !on && "bg-black/[0.06] dark:bg-white/10")} style={on ? { background: ACCENT } : undefined} />;
        })}
      </div>
    </div>
  );
}

const VIZ_FRAMES = [
  { arr: [5, 2, 8, 1, 6], hi: [0, 1], note: "Compare 5 and 2 → swap" },
  { arr: [2, 5, 8, 1, 6], hi: [2, 3], note: "Compare 8 and 1 → swap" },
  { arr: [2, 5, 1, 8, 6], hi: [3, 4], note: "Compare 8 and 6 → swap" },
  { arr: [2, 5, 1, 6, 8], hi: [4], note: "Largest bubbled to the end ✓" },
];

/** Auto-cycling mini algorithm visualizer for the workflow stack. */
function VisualizerMock() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % VIZ_FRAMES.length), 1100);
    return () => clearInterval(t);
  }, [reduce]);
  const f = VIZ_FRAMES[i];
  return (
    <div className={cn(mockShell, "shadow-[0_24px_80px_rgba(0,40,120,0.18)] dark:shadow-[0_24px_80px_rgba(0,40,120,0.35)]")}>
      <div className={mockBar}>
        {mockDots}
        <span className={cn("ml-2 font-mono text-xs", mockMeta)}>visualizer.run</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: ACCENT }}>
          <Sparkles className="size-2.5" /> live
        </span>
      </div>
      <div className="p-5">
        <div className="flex h-28 items-end justify-center gap-2">
          {f.arr.map((v, idx) => {
            const active = f.hi.includes(idx);
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <motion.div
                  layout
                  animate={{ height: 20 + (v / 8) * 80 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className={cn(
                    "flex w-7 items-start justify-center rounded-md pt-1 text-[11px] font-semibold tabular-nums",
                    active ? "text-white" : "text-neutral-700 dark:text-neutral-200",
                  )}
                  style={{ background: active ? ACCENT : `${ACCENT}26` }}
                >
                  {v}
                </motion.div>
                <span className={cn("text-[9px]", mockMeta)}>{idx}</span>
              </div>
            );
          })}
        </div>
        <p className={cn("mt-3 rounded-md bg-black/[0.04] px-3 py-1.5 text-center text-[11px] dark:bg-white/[0.06]", mockText)}>
          {f.note}
        </p>
      </div>
    </div>
  );
}

function FloatChip({ className, children, delay = 0 }: { className?: string; children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("absolute z-10 hidden items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:flex", glass, inkHead, className)}
      animate={reduce ? undefined : { y: [0, -7, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── page ─────────────────────────────────────────────────────────── */

export function Landing({ problems, totalProblems, featuresByPlan, paymentsEnabled }: { problems: LandingProblem[]; totalProblems: number; featuresByPlan?: Record<"free" | "go" | "plus", { text: string; included: boolean }[]>; paymentsEnabled?: boolean }) {
  // Read auth on the client so the page itself can be statically rendered (no
  // per-request server work) — the header CTA hydrates to the right state.
  const { data: session } = useSession();
  const signedIn = !!session?.user;
  const ctaHref = signedIn ? "/dashboard" : "/register";
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const webgl = useWebGL();
  const isLight = useIsLight();

  const bg = isLight ? BG_LIGHT : BG_DARK;
  const particleColors = isLight ? [ACCENT, "#9dbdf5"] : [ACCENT_L, "#ffffff"];

  const navClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      e.preventDefault();
      slowScrollTo(href.slice(1));
      setMobileMenu(false);
    }
  }, []);

  const langLogos = LANGUAGES.slice(0, 12).map((lang) => {
    const Icon = LANG_ICONS[lang.id];
    return {
      node: (
        <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium", glass, inkSub)}>
          {Icon ? <Icon className="size-3.5" style={{ color: ACCENT }} aria-hidden /> : null}
          {lang.label}
        </span>
      ),
      title: lang.label,
    };
  });

  const companyLogos = COMPANY_LOGOS.map((name) => ({
    node: <span className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-600 dark:hover:text-neutral-300">{name}</span>,
    title: name,
  }));

  const primaryBtn = "h-9 rounded-xl bg-neutral-900 px-4 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200";
  const outlineBtn = "rounded-[18px] border-black/[0.12] bg-white/60 text-neutral-700 backdrop-blur hover:bg-black/[0.04] hover:text-neutral-900 dark:border-white/[0.16] dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-white/10 dark:hover:text-white";

  return (
    <ClickSpark sparkColor={isLight ? ACCENT : ACCENT_L} sparkSize={9} sparkRadius={18} sparkCount={8} duration={450}>
    <div className={cn("min-h-screen antialiased selection:bg-[#006bff]/30", pageCls)}>

      {/* ── FLOATING GLASS NAV ─────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
        <div className={cn("mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-3 sm:px-5", glass, "bg-white/80 dark:bg-[#0a0e1a]/70")}>
          <Logo />
          <nav className={cn("hidden items-center gap-6 text-sm md:flex", inkSub)}>
            {NAV.map(([label, href]) => (
              <a key={label} href={href} onClick={navClick} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden min-[360px]:inline-flex">
              <ThemeToggle />
            </span>
            {signedIn ? (
              <Button asChild size="sm" className={primaryBtn}>
                <Link href="/dashboard">Dashboard <ArrowRight className="size-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className={cn("hidden h-9 rounded-xl px-3 sm:inline-flex", inkSub, "hover:bg-black/[0.05] hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white")}>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className={primaryBtn}>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
            <button className={cn("md:hidden", inkSub)} onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
              {mobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className={cn("mx-auto mt-2 max-w-5xl overflow-hidden rounded-2xl md:hidden", glass, "bg-white/90 dark:bg-[#0a0e1a]/90")}
            >
              <nav className="flex flex-col gap-1 p-3">
                {NAV.map(([label, href]) => (
                  <a key={label} href={href} onClick={navClick} className={cn("rounded-xl px-3 py-2.5 text-sm", inkSub, hoverRow)}>{label}</a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ── HERO (centered · Aurora + Particles) ──────────────────── */}
        <section className="relative overflow-hidden">
          {/* CSS glow fallback so the hero never looks flat without WebGL */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(65%_60%_at_50%_0%,rgba(0,107,255,0.14),transparent)] dark:bg-[radial-gradient(65%_60%_at_50%_0%,rgba(0,107,255,0.20),transparent)]" />
          {webgl && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-40 dark:opacity-75">
              <Aurora colorStops={["#00224d", "#006bff", "#7cc4ff"]} amplitude={1.1} blend={0.55} speed={0.7} />
            </div>
          )}
          {webgl && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Particles
                key={isLight ? "l" : "d"}
                particleColors={particleColors}
                particleCount={150}
                particleSpread={11}
                speed={0.06}
                particleBaseSize={70}
                moveParticlesOnHover={false}
                alphaParticles
                disableRotation
              />
            </div>
          )}

          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-14 pt-32 text-center sm:pb-20 sm:pt-40">
            <Reveal>
              <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5", glass)}>
                <Sparkles className="size-3.5 shrink-0" style={{ color: ACCENT }} />
                <ShinyText text="27+ features · 9 AI tools · 100% free" speed={3} className="text-[12px] sm:text-[13px]" />
              </span>
            </Reveal>

            <h1 className={cn("font-display mt-7 text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-6xl sm:leading-[1.06]", inkHead)}>
              <SplitText
                text="Master coding"
                tag="span"
                className="inline"
                splitType="chars"
                delay={24}
                duration={0.8}
                from={{ opacity: 0, y: 30 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0}
                rootMargin="0px"
                textAlign="center"
              />
              <span className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                <RotatingText
                  texts={ROTATING_WORDS}
                  mainClassName="inline-flex overflow-hidden rounded-2xl px-3 py-0.5 text-white sm:px-4 sm:py-1"
                  staggerFrom="last"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-120%" }}
                  staggerDuration={0.02}
                  splitLevelClassName="overflow-hidden"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={2400}
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #0050c0)` }}
                />
                <span>with AI.</span>
              </span>
            </h1>

            <p className={cn("mt-6 max-w-xl text-pretty text-base leading-relaxed sm:text-lg", inkSub)}>
              <strong className={cn("font-semibold", inkHead)}>{APP_NAME}</strong> combines LeetCode-style problems, an online compiler, AI pair programming, spaced repetition and skill analytics — all free.
            </p>

            <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
              <Magnet padding={60} magnetStrength={7} wrapperClassName="w-full sm:w-auto" innerClassName="block">
                <StarBorder as={Link} href={ctaHref} color={ACCENT_L} speed="5s" className="block w-full text-center sm:w-auto">
                  <span className="inline-flex items-center gap-2 text-base font-medium">
                    Start for Free <ArrowRight className="size-4" />
                  </span>
                </StarBorder>
              </Magnet>
              <Button asChild variant="outline" size="lg" className={cn("h-12 w-full px-6 text-base sm:w-auto", outlineBtn)}>
                <Link href="/compiler">Try the Compiler</Link>
              </Button>
            </div>

            <div className={cn("mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm", inkSub)}>
              {["No credit card", "12 languages", "Instant compiler", "9 AI tools"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-4" style={{ color: ACCENT }} /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* hero showcase — a REAL working JS playground in a glass frame */}
          <div className="relative mx-auto max-w-3xl px-4 pb-16 sm:pb-24">
            <AnimatedContent distance={80} duration={0.9} scale={0.96}>
              <div className="relative">
                <div aria-hidden className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(60%_70%_at_50%_30%,rgba(0,107,255,0.14),transparent)] blur-xl dark:bg-[radial-gradient(60%_70%_at_50%_30%,rgba(0,107,255,0.22),transparent)]" />
                <div className={cn("relative rounded-2xl p-2", glass)}>
                  <HeroCompiler />
                </div>
                <FloatChip className="-left-8 top-16" delay={0.2}>
                  <Flame className="size-4" style={{ color: ACCENT }} /> 94-day streak
                </FloatChip>
                <FloatChip className="-right-8 top-1/2" delay={1}>
                  <Bot className="size-4" style={{ color: ACCENT }} /> AI hint ready
                </FloatChip>
                <FloatChip className="-bottom-5 -left-4" delay={1.6}>
                  <Trophy className="size-4" style={{ color: ACCENT }} /> Top 3% rank
                </FloatChip>
              </div>
            </AnimatedContent>

            {/* stats — GlassSurface bar on desktop, glass tiles on mobile */}
            <div className="mt-10 sm:mt-12">
              <div className="hidden md:block">
                <GlassSurface width="100%" height={86} borderRadius={22} backgroundOpacity={isLight ? 0.35 : 0.07}>
                  <div className="flex w-full items-center justify-around px-6">
                    {STATS.map((s) => (
                      <div key={s.label} className="text-center">
                        <p className={cn("text-2xl font-semibold tabular-nums", inkHead)}>
                          <RBCountUp to={s.value} duration={1.6} />{s.suffix}
                        </p>
                        <p className={cn("mt-0.5 text-[11px]", inkSub)}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </GlassSurface>
              </div>
              <div className="grid grid-cols-2 gap-3 md:hidden">
                {STATS.map((s) => (
                  <div key={s.label} className={cn(glassCard, "p-4 text-center")}>
                    <p className={cn("text-xl font-semibold tabular-nums", inkHead)}>
                      <RBCountUp to={s.value} duration={1.4} />{s.suffix}
                    </p>
                    <p className={cn("mt-0.5 text-[11px]", inkSub)}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* marquees */}
          <div className={cn("border-t py-5", lineCls)}>
            <LogoLoop logos={langLogos} speed={50} logoHeight={34} gap={14} pauseOnHover fadeOut fadeOutColor={bg} ariaLabel="Supported programming languages" />
          </div>
          <div className={cn("border-t py-6", lineCls)}>
            <p className={cn("mb-4 text-center text-[13px]", inkFaint)}>Engineers at world-class companies practice here</p>
            <LogoLoop logos={companyLogos} speed={30} direction="right" logoHeight={20} gap={56} fadeOut fadeOutColor={bg} ariaLabel="Companies whose engineers practice here" />
          </div>
        </section>

        {/* ── FEATURES · MAGIC BENTO (always a dark band) ───────────── */}
        <section id="features" className="relative overflow-hidden bg-[#050508] py-16 sm:py-24">
          <SectionHead
            dark
            eyebrow="FEATURES"
            title={
              <GradientText colors={[ACCENT_L, "#7cc4ff", "#ffffff", ACCENT_L]} animationSpeed={6}>
                27+ features. Zero paywalls.
              </GradientText>
            }
            sub="One platform for algorithms, the instant compiler, AI tools, community and analytics."
          />
          <div className="mx-auto mt-12 max-w-6xl">
            <MagicBento
              cards={BENTO_CARDS}
              glowColor="0, 107, 255"
              textAutoHide={false}
              enableSpotlight
              enableBorderGlow
              enableStars
              enableTilt={false}
              clickEffect
              enableMagnetism={false}
              spotlightRadius={320}
              particleCount={8}
            />
          </div>
        </section>

        {/* ── WORKFLOW · STICKY CARD STACK ──────────────────────────── */}
        <section id="workflow" className={cn("relative border-t py-16 sm:py-24", lineCls)}>
          {/* interactive dot-grid backdrop */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-40">
            <DotGrid
              key={isLight ? "l" : "d"}
              dotSize={2.5}
              gap={26}
              baseColor={isLight ? "#dbe6fb" : "#12203c"}
              activeColor={ACCENT}
              proximity={110}
              shockRadius={220}
              shockStrength={4}
            />
          </div>
          <div className="relative">
            <SectionHead eyebrow="THE WORKFLOW" title="Everything, one scroll away" sub="Write, run, learn and track — the full loop, stacked." />
            <div className="mx-auto mt-10 max-w-4xl px-4 sm:px-6">
              {[
                {
                  icon: Code2, title: "VS Code-style editor", desc: "Full IntelliSense, Vim mode, 12 languages, hidden test cases and instant verdicts — zero config.",
                  bullets: ["IntelliSense + Emmet", "Vim keybindings", "Instant verdicts"], mock: <EditorMock />,
                },
                {
                  icon: Terminal, title: "Instant online compiler", desc: "A blank editor, custom stdin and a secure cloud sandbox — plus a Web mode for HTML/CSS/JS, React and Next.js.",
                  bullets: ["Custom stdin", "React + npm deps", "Next.js in-browser"], mock: <CompilerMock />,
                },
                {
                  icon: Bot, title: "AI mentor that never spoils", desc: "Progressive hints that read your exact code and output — concept, approach, edge cases, optimization.",
                  bullets: ["Sees your code live", "Streams in real time", "On-topic by design"], mock: <MentorChatMock />,
                },
                {
                  icon: Sparkles, title: "Watch your code run", desc: "Run your solution and see it animate step by step. If it's right, watch how it works; if it's wrong, see exactly where it breaks.",
                  bullets: ["Animated on every run", "Pinpoints the bug", "Correct-vs-wrong verdict"], mock: <VisualizerMock />,
                },
                {
                  icon: BarChart3, title: "Analytics + spaced repetition", desc: "Weakness detection tells you where to focus; SM-2 resurfaces problems right before you forget.",
                  bullets: ["Weakness detection", "SM-2 scheduling", "Streak heatmap"], mock: <AnalyticsMock />,
                },
              ].map((f, i) => (
                /* CSS sticky stacking — each card pins slightly lower than the
                   previous one, so they pile up as you scroll. No JS, no dead
                   space, works on every device. */
                <div key={f.title} className="sticky mb-6" style={{ top: 88 + i * 26, zIndex: i + 1 }}>
                  <div className="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#0a0e1a] dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-9">
                    <div className="grid items-center gap-8 lg:grid-cols-2">
                      <div>
                        <span className={cn("flex size-11 items-center justify-center rounded-xl", glass)}>
                          <f.icon className="size-5" style={{ color: ACCENT }} />
                        </span>
                        <h3 className={cn("mt-4 text-xl font-semibold tracking-tight sm:text-2xl", inkHead)}>{f.title}</h3>
                        <p className={cn("mt-2 text-sm leading-relaxed sm:text-base", inkSub)}>{f.desc}</p>
                        <div className={cn("mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm", inkSub)}>
                          {f.bullets.map((b) => (
                            <span key={b} className="flex items-center gap-1.5">
                              <Check className="size-4" style={{ color: ACCENT }} /> {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="hidden lg:block">{f.mock}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI SUITE ──────────────────────────────────────────────── */}
        <section id="ai" className={cn("border-t py-16 sm:py-24", lineCls)}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="AI SUITE" title="9 AI tools. One platform." sub="From personalized coaching to pair programming — AI is woven into every part of your practice." />
            <AnimatedContent distance={60} duration={0.7} className="mt-14 hidden justify-center sm:flex">
              <GlassIcons
                className="!grid-cols-6 !gap-5 !p-0 !w-fit !mx-auto"
                items={AI_TOOLS.map((tool) => ({
                  icon: <tool.icon className="size-5 text-white" />,
                  color: tool.color,
                  label: tool.label,
                }))}
              />
            </AnimatedContent>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AI_TOOLS.map((tool, i) => (
                <Reveal key={tool.label} delay={(i % 3) * 0.05}>
                  <SpotlightCard
                    className="!rounded-2xl !border-black/[0.08] !bg-white h-full p-6 dark:!border-white/10 dark:!bg-white/[0.04]"
                    spotlightColor="rgba(0, 107, 255, 0.16)"
                  >
                    <span className={cn("flex size-10 items-center justify-center rounded-xl", glass)}>
                      <tool.icon className="size-4.5" style={{ color: ACCENT }} />
                    </span>
                    <h3 className={cn("mt-4 text-sm font-semibold", inkHead)}>{tool.label}</h3>
                    <p className={cn("mt-1.5 text-sm leading-relaxed", inkSub)}>{tool.desc}</p>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
        <section className={cn("border-t py-16 sm:py-24", lineCls)}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="HOW IT WORKS" title="From zero to offer in three steps" />
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <AnimatedContent key={step.n} distance={70} duration={0.7} delay={i * 0.12}>
                  <div className={cn(glassCard, "relative h-full overflow-hidden p-7")}>
                    <span aria-hidden className="pointer-events-none absolute -right-3 -top-6 select-none font-mono text-[92px] font-bold leading-none text-black/[0.04] dark:text-white/[0.04]">{step.n}</span>
                    <span className="inline-flex size-10 items-center justify-center rounded-xl font-mono text-sm font-semibold" style={{ background: `${ACCENT}1f`, color: ACCENT }}>{step.n}</span>
                    <h3 className={cn("mt-4 text-lg font-semibold tracking-tight", inkHead)}>{step.title}</h3>
                    <p className={cn("mt-2 text-sm leading-relaxed", inkSub)}>{step.body}</p>
                  </div>
                </AnimatedContent>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROBLEMS PREVIEW ──────────────────────────────────────── */}
        {problems.length > 0 && (
          <section className={cn("border-t py-16 sm:py-24", lineCls)}>
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
              <Reveal>
                <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1", glass)}>
                  <span className="size-1.5 rounded-full" style={{ background: ACCENT }} />
                  <ShinyText text="PROBLEM BANK" speed={3.5} className="text-[12px] font-medium tracking-wide" />
                </span>
                <h2 className={cn("mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl", inkHead)}>
                  <span style={{ color: ACCENT }}><RBCountUp to={totalProblems} duration={1.2} />+</span> real interview questions, ready to run.
                </h2>
                <p className={cn("mt-4", inkSub)}>DSA classics, JavaScript deep-dives and React pattern exercises — every problem executes against hidden test cases in the cloud.</p>
                <Button asChild size="lg" className={cn(primaryBtn, "mt-7 h-11 px-5")}>
                  <Link href="/problems">Browse All Problems <ArrowRight className="size-4" /></Link>
                </Button>
              </Reveal>
              <Reveal delay={0.05} className={cn(glassCard, "overflow-hidden")}>
                {problems.map((problem, index) => (
                  <Link
                    key={problem.slug}
                    href={`/problems/${problem.slug}`}
                    className={cn("group flex items-center gap-3 px-5 py-4 transition-colors", hoverRow, index !== 0 && cn("border-t", lineCls))}
                  >
                    <span className={cn("font-mono text-xs tabular-nums", inkFaint)}>{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", inkHead)}>{problem.title}</p>
                      <p className={cn("text-xs", inkFaint)}>{problem.category}</p>
                    </div>
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <ArrowUpRight className={cn("size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5", inkFaint)} />
                  </Link>
                ))}
              </Reveal>
            </div>
          </section>
        )}

        {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
        <section className={cn("border-t py-16 sm:py-24", lineCls)}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="TESTIMONIALS" title="Loved by thousands of coders" />
            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} delay={(i % 3) * 0.05}>
                  <SpotlightCard
                    className="!rounded-2xl !border-black/[0.08] !bg-white flex h-full flex-col p-6 dark:!border-white/10 dark:!bg-white/[0.04]"
                    spotlightColor="rgba(0, 107, 255, 0.13)"
                  >
                    <div className="mb-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="size-3.5" style={{ fill: ACCENT, color: ACCENT }} />)}
                    </div>
                    <blockquote className={cn("flex-1 text-sm leading-relaxed", inkSub)}>“{t.quote}”</blockquote>
                    <figcaption className={cn("mt-5 flex items-center gap-3 border-t pt-4", lineCls)}>
                      <span className="flex size-9 items-center justify-center rounded-full text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, #7c3aed)` }}>{t.avatar}</span>
                      <span>
                        <span className={cn("block text-sm font-medium", inkHead)}>{t.name}</span>
                        <span className={cn("block text-xs", inkFaint)}>{t.role}</span>
                      </span>
                    </figcaption>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────── */}
        <section id="pricing" className={cn("border-t py-16 sm:py-24", lineCls)}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHead eyebrow="PRICING" title="Start free, level up fast." sub="7-day free trial on all paid plans — you're not charged until it ends, and you can cancel anytime." />
            <Reveal delay={0.1} className="mt-12">
              <PricingCards featuresByPlan={featuresByPlan} paymentsEnabled={paymentsEnabled} />
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section id="faq" className={cn("border-t py-16 sm:py-24", lineCls)}>
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHead eyebrow="FAQ" title="Frequently asked" />
            <div className="mt-12 space-y-2.5">
              {FAQS.map((faq, i) => (
                <div key={faq.q} className={cn(glassCard, "overflow-hidden")}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className={cn("flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium", inkHead)}
                  >
                    {faq.q}
                    <ChevronDown className={cn("size-4 shrink-0 transition-transform", inkFaint, openFaq === i && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className={cn("border-t px-5 py-4 text-sm leading-relaxed", lineCls, inkSub)}>{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────── */}
        <section className={cn("relative overflow-hidden border-t py-20 sm:py-28", lineCls)}>
          {webgl && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Particles
                key={isLight ? "l" : "d"}
                particleColors={particleColors}
                particleCount={110}
                particleSpread={12}
                speed={0.05}
                particleBaseSize={60}
                moveParticlesOnHover={false}
                alphaParticles
                disableRotation
              />
            </div>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_50%_100%,rgba(0,107,255,0.12),transparent)] dark:bg-[radial-gradient(55%_60%_at_50%_100%,rgba(0,107,255,0.18),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Reveal>
              <span className={cn("inline-flex size-12 items-center justify-center rounded-2xl", glass)}>
                <Zap className="size-6" style={{ color: ACCENT }} />
              </span>
              <h2 className={cn("mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl", inkHead)}>
                {isLight ? (
                  <GradientText colors={["#0f172a", ACCENT, "#0050c0", "#0f172a"]} animationSpeed={7}>
                    Your next offer starts now.
                  </GradientText>
                ) : (
                  <GradientText colors={["#ffffff", "#7cc4ff", ACCENT_L, "#ffffff"]} animationSpeed={7}>
                    Your next offer starts now.
                  </GradientText>
                )}
              </h2>
              <p className={cn("mx-auto mt-4 max-w-lg text-lg", inkSub)}>
                Free forever. 27+ features. 9 AI tools. No credit card — just you, the editor, and an AI mentor that never sleeps.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Magnet padding={70} magnetStrength={6}>
                  <StarBorder as={Link} href={ctaHref} color={ACCENT_L} speed="5s">
                    <span className="inline-flex items-center gap-2 text-base font-medium">
                      Create Free Account <ArrowRight className="size-4" />
                    </span>
                  </StarBorder>
                </Magnet>
                <Button asChild variant="outline" size="lg" className={cn("h-12 px-7 text-base", outlineBtn)}>
                  <Link href="/pricing">Start 7-day free trial</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className={cn("border-t", lineCls)}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className={cn("mt-4 max-w-xs text-sm leading-relaxed", inkSub)}>
                Setups Works Lab is the AI-powered coding-interview platform for mastering data structures, algorithms and frontend engineering — built by Setups Works for your next interview.
              </p>
              <div className="mt-6 flex items-center gap-2">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={cn("inline-flex size-9 items-center justify-center rounded-xl transition-colors", glass, inkSub, "hover:text-neutral-900 dark:hover:text-white")}
                  >
                    {Icon ? <Icon className="size-4" /> : <GithubIcon className="size-4" />}
                  </a>
                ))}
              </div>
            </div>
            {FOOTER_COLS.map((col) => (
              <nav key={col.heading}>
                <h3 className={cn("mb-4 text-[13px] font-medium", inkFaint)}>{col.heading}</h3>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className={cn("text-sm transition-colors hover:text-neutral-900 dark:hover:text-white", inkSub)}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className={cn("border-t", lineCls)}>
          <div className={cn("mx-auto grid max-w-6xl grid-cols-1 gap-y-3 px-4 py-5 text-xs sm:grid-cols-3 sm:items-center sm:px-6", inkFaint)}>
            <p>© {new Date().getFullYear()} {APP_NAME}</p>
            <div className="flex items-center justify-center gap-2">
              <span>from</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/white.png" alt="Setups Works" className="hidden h-5 w-auto dark:inline-block" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/black.png" alt="Setups Works" className="inline-block h-5 w-auto dark:hidden" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:flex-nowrap sm:justify-end">
              <Link href="/help" className="hover:text-neutral-900 dark:hover:text-white">Docs</Link>
              <Link href="/blog" className="hover:text-neutral-900 dark:hover:text-white">Blog</Link>
              <Link href="/careers" className="hover:text-neutral-900 dark:hover:text-white">Careers</Link>
              <Link href="/about" className="hover:text-neutral-900 dark:hover:text-white">About</Link>
              <Link href="/contact" className="hover:text-neutral-900 dark:hover:text-white">Contact</Link>
              <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white">Terms</Link>
              <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white">Privacy</Link>
              <span className={cn("rounded-full border px-2 py-0.5 font-mono", lineCls)}>v{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </ClickSpark>
  );
}

/* ── icons ────────────────────────────────────────────────────────── */
function GithubIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.04 10.04 0 0 0 22 12.25C22 6.58 17.52 2 12 2" /></svg>;
}
