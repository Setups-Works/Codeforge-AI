"use client";

import { useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { PlanBadge } from "@/features/subscription/plan-badge";
import type { PlanId } from "@/lib/plans";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Trophy,
  BookOpen,
  Lightbulb,
  Zap,
  Target,
  Flame,
  Rocket,
  Coffee,
  Sprout,
  Star,
  Sparkles,
  Loader2,
  ExternalLink,
} from "@/components/icons";

/* ── data ──────────────────────────────────────────────────────── */

const GOALS = [
  { id: "faang", icon: Trophy, label: "Crack FAANG / MAANG", desc: "Google, Amazon, Meta, Apple, Netflix" },
  { id: "competitive", icon: Zap, label: "Competitive Programming", desc: "Codeforces, LeetCode contests, ICPC" },
  { id: "learn-dsa", icon: BookOpen, label: "Learn DSA from Scratch", desc: "Build a strong foundation step by step" },
  { id: "improve", icon: Lightbulb, label: "Improve Problem-Solving", desc: "Get sharper and faster at algorithms" },
];

const LEVELS = [
  { id: "beginner", icon: Sprout, label: "Beginner", desc: "Just getting started with coding challenges", color: "text-green-500" },
  { id: "intermediate", icon: Star, label: "Intermediate", desc: "Comfortable with basics, want to level up", color: "text-blue-500" },
  { id: "advanced", icon: Flame, label: "Advanced", desc: "Experienced, targeting top-tier companies", color: "text-blue-600" },
];

const TOPICS = [
  "Arrays", "Strings", "Linked Lists", "Trees", "Graphs",
  "Dynamic Programming", "Backtracking", "Binary Search",
  "Heap / Priority Queue", "Sliding Window", "Two Pointers",
  "Stack / Queue", "Bit Manipulation", "Greedy", "Math",
  "Sorting", "Tries", "Union Find",
];

const COMPANIES = [
  "Google", "Amazon", "Meta", "Microsoft", "Apple",
  "Netflix", "Uber", "Stripe", "Adobe", "Flipkart",
  "Goldman Sachs", "Atlassian", "Salesforce", "Oracle",
];

const DAILY_GOALS = [
  { value: 1, icon: Coffee, label: "1 / day", tag: "Casual", desc: "Perfect for building a habit slowly" },
  { value: 3, icon: Target, label: "3 / day", tag: "Consistent", desc: "Solid daily practice routine" },
  { value: 5, icon: Rocket, label: "5 / day", tag: "Focused", desc: "Serious preparation mode" },
  { value: 10, icon: Flame, label: "10+ / day", tag: "Intensive", desc: "All-in grind for fast results" },
];

const TOTAL_STEPS = 7; // 0=welcome, 1=goal, 2=level, 3=topics, 4=companies, 5=daily, 6=plan

/* ── animation ──────────────────────────────────────────────────── */

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, scale: 0.98 }),
};

/* Staggered entrance for option grids/chips inside each step. */
const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};
const popItem = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 28 },
  },
};

function Stagger({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

function Pop({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={popItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── component ──────────────────────────────────────────────────── */

export function OnboardingWizard({ name }: { name: string }) {
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState(3);

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function toggleTopic(t: string) {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function toggleCompany(c: string) {
    setCompanies((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  async function finish(chosenPlan: PlanId = "free") {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, level, topics, companies, dailyGoal }),
      });
      if (!res.ok) throw new Error();

      await update();
      // Paid plan → card-on-file free trial: capture the card in checkout so the
      // first charge fires automatically when the 7-day trial ends.
      if (chosenPlan !== "free") {
        window.location.href = `/checkout?plan=${chosenPlan}&cycle=monthly&trial=1`;
        return;
      }
      // Hard reload ensures middleware reads the refreshed JWT cookie
      window.location.href = "/dashboard";
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const progress = step === 0 ? 0 : Math.round(((step) / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* top bar */}
      <div className="flex h-14 items-center justify-between px-6 border-b">
        <Logo href="/" />
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <span className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS - 2}</span>
        )}
      </div>

      {/* progress bar */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      {/* step content */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-full max-w-2xl"
          >
            {step === 0 && <StepWelcome name={name} onNext={() => go(1)} />}
            {step === 1 && (
              <StepGoal
                value={goal}
                onChange={setGoal}
                onBack={() => go(0)}
                onNext={() => go(2)}
              />
            )}
            {step === 2 && (
              <StepLevel
                value={level}
                onChange={setLevel}
                onBack={() => go(1)}
                onNext={() => go(3)}
              />
            )}
            {step === 3 && (
              <StepTopics
                level={level}
                value={topics}
                onToggle={toggleTopic}
                onBack={() => go(2)}
                onNext={() => go(4)}
              />
            )}
            {step === 4 && (
              <StepCompanies
                value={companies}
                onToggle={toggleCompany}
                onBack={() => go(3)}
                onNext={() => go(5)}
                onSkip={() => go(5)}
              />
            )}
            {step === 5 && (
              <StepDailyGoal
                value={dailyGoal}
                onChange={setDailyGoal}
                onBack={() => go(4)}
                onNext={() => go(6)}
              />
            )}
            {step === 6 && (
              <StepPlan
                onBack={() => go(5)}
                onFinish={finish}
                submitting={submitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── step components ────────────────────────────────────────────── */

function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  return (
    <Stagger className="flex flex-col items-center text-center gap-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.05 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Setups Works Labs" width={956} height={223} className="h-16 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-dark.png" alt="Setups Works Labs" width={956} height={223} className="hidden h-16 w-auto dark:inline-block" />
      </motion.div>
      <Pop>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome, {name.split(" ")[0]}! 👋
        </h1>
        <p className="mt-3 text-muted-foreground text-base max-w-md mx-auto">
          Let&apos;s take 2 minutes to personalise your Setups Works Lab experience so you hit your goals faster.
        </p>
      </Pop>
      <Stagger className="flex flex-wrap justify-center gap-2 mt-1">
        {["SM-2 Spaced Repetition", "AI Pair Programmer", "Company Prep", "Smart Analytics"].map((f) => (
          <Pop key={f} className="inline-block">
            <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <Check className="size-3 text-primary" /> {f}
            </span>
          </Pop>
        ))}
      </Stagger>
      <Pop>
        <Button size="lg" className="mt-2 px-8" onClick={onNext}>
          Get Started <ArrowRight className="size-4" />
        </Button>
      </Pop>
    </Stagger>
  );
}

function StepGoal({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        step={1}
        title="What's your main goal?"
        desc="We'll tailor your problem set and AI recommendations around this."
      />
      <Stagger className="grid gap-3 sm:grid-cols-2">
        {GOALS.map(({ id, icon: Icon, label, desc }) => (
          <Pop key={id} className="h-full">
          <button
            onClick={() => onChange(id)}
            className={cn(
              "group flex h-full w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
              value === id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", value === id ? "bg-[#006bff] text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            {value === id && <Check className="ml-auto size-4 text-primary shrink-0 mt-0.5" />}
          </button>
          </Pop>
        ))}
      </Stagger>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}

function StepLevel({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        step={2}
        title="What's your experience level?"
        desc="Be honest — we'll give you appropriately challenging problems."
      />
      <Stagger className="grid gap-3">
        {LEVELS.map(({ id, icon: Icon, label, desc, color }) => (
          <Pop key={id}>
          <button
            onClick={() => onChange(id)}
            className={cn(
              "group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
              value === id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background", value === id ? "border-primary" : "border-border")}>
              <Icon className={cn("size-6", color)} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            {value === id && <Check className="size-5 text-primary shrink-0" />}
          </button>
          </Pop>
        ))}
      </Stagger>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}

type GenState =
  | { status: "loading" }
  | { status: "done"; slug: string; title: string; difficulty: string; category: string }
  | { status: "error" };

const LEVEL_DIFFICULTY: Record<string, string> = { beginner: "Easy", intermediate: "Medium", advanced: "Hard" };

function StepTopics({
  level,
  value,
  onToggle,
  onBack,
  onNext,
}: {
  level: string;
  value: string[];
  onToggle: (t: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [gen, setGen] = useState<Record<string, GenState>>({});
  const [active, setActive] = useState<string | null>(null);
  const started = useRef(new Set<string>());

  async function generateFor(topic: string) {
    if (started.current.has(topic)) return;
    started.current.add(topic);
    setGen((g) => ({ ...g, [topic]: { status: "loading" } }));
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create a practice coding question about ${topic}`,
          count: 1,
          difficulty: LEVEL_DIFFICULTY[level] ?? "Easy",
        }),
      });
      const data = await res.json().catch(() => null);
      const q = data?.created?.[0];
      if (!res.ok || !q) throw new Error("failed");
      setGen((g) => ({ ...g, [topic]: { status: "done", ...q } }));
    } catch {
      started.current.delete(topic);
      setGen((g) => ({ ...g, [topic]: { status: "error" } }));
    }
  }

  function pick(topic: string) {
    const selecting = !value.includes(topic);
    onToggle(topic);
    if (selecting) {
      setActive(topic);
      void generateFor(topic);
    } else if (active === topic) {
      setActive(null);
    }
  }

  const current = active ? gen[active] : undefined;

  return (
    <div className="space-y-6">
      <StepHeader
        step={3}
        title="Which topics do you want to focus on?"
        desc="Pick at least 1 — tap a topic and we'll create a practice question for it live. You can change this any time from your settings."
      />
      <Stagger className="flex flex-wrap gap-2">
        {TOPICS.map((t) => {
          const sel = value.includes(t);
          return (
            <Pop key={t} className="inline-block">
              <button
                onClick={() => pick(t)}
                className={cn(
                  "rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all",
                  sel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/60 hover:bg-muted/50",
                )}
              >
                {sel && <Check className="inline size-3 mr-1 -mt-0.5" />}
                {t}
              </button>
            </Pop>
          );
        })}
      </Stagger>
      <AnimatePresence mode="wait">
        {active && current && (
          <motion.div
            key={active + current.status}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative overflow-hidden rounded-xl border bg-muted/30 p-4"
          >
            {current.status === "loading" && (
              <div className="flex items-center gap-3">
                <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  <Sparkles className="size-5 text-primary" />
                </motion.span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Creating a {active} question for you…</p>
                  <motion.div
                    className="h-1.5 rounded-full bg-primary/20 overflow-hidden"
                  >
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-primary"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {current.status === "done" && (
              <div className="flex items-start gap-3">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600"
                >
                  <Check className="size-3.5" />
                </motion.span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-green-600">Published · {current.difficulty} · {current.category}</p>
                  <p className="mt-0.5 font-semibold leading-snug">{current.title}</p>
                  <a
                    href={`/problems/${current.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open question <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            )}
            {current.status === "error" && (
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t create a sample question right now — you can still continue.{" "}
                <button className="text-primary hover:underline" onClick={() => generateFor(active)}>
                  Retry
                </button>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2">
        <button
          className="text-xs text-primary hover:underline"
          onClick={() => TOPICS.forEach((t) => !value.includes(t) && onToggle(t))}
        >
          Select all
        </button>
        {value.length > 0 && (
          <>
            <span className="text-muted-foreground text-xs">·</span>
            <button className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => value.forEach(onToggle)}>
              Clear
            </button>
            <span className="ml-auto text-xs text-muted-foreground">{value.length} selected</span>
          </>
        )}
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={value.length === 0} />
    </div>
  );
}

function StepCompanies({
  value,
  onToggle,
  onBack,
  onNext,
  onSkip,
}: {
  value: string[];
  onToggle: (c: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        step={4}
        title="Any target companies?"
        desc="We'll surface company-tagged problems in your feed. Totally optional."
        optional
      />
      <Stagger className="flex flex-wrap gap-2">
        {COMPANIES.map((c) => {
          const sel = value.includes(c);
          return (
            <Pop key={c} className="inline-block">
              <button
                onClick={() => onToggle(c)}
                className={cn(
                  "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                  sel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/60 hover:bg-muted/50",
                )}
              >
                {sel && <Check className="inline size-3 mr-1 -mt-0.5" />}
                {c}
              </button>
            </Pop>
          );
        })}
      </Stagger>
      <StepNav onBack={onBack} onNext={onNext} nextDisabled={false} onSkip={onSkip} />
    </div>
  );
}

function StepDailyGoal({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: number;
  onChange: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        step={5}
        title="How many problems per day?"
        desc="Consistency beats intensity. Pick what you can realistically commit to."
      />
      <Stagger className="grid gap-3 sm:grid-cols-2">
        {DAILY_GOALS.map(({ value: v, icon: Icon, label, tag, desc }) => (
          <Pop key={v} className="h-full">
          <button
            onClick={() => onChange(v)}
            className={cn(
              "group flex h-full w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
              value === v
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", value === v ? "bg-[#006bff] text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>
              <Icon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{label}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", value === v ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  {tag}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            {value === v && <Check className="ml-auto size-4 text-primary shrink-0 mt-0.5" />}
          </button>
          </Pop>
        ))}
      </Stagger>
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button onClick={onNext} size="lg" className="px-8">
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function StepPlan({
  onBack,
  onFinish,
  submitting,
}: {
  onBack: () => void;
  onFinish: (plan: PlanId) => void;
  submitting: boolean;
}) {
  const [chosen, setChosen] = useState<PlanId>("free");
  const plans = [PLANS.free, PLANS.go, PLANS.plus] as const;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold text-primary uppercase tracking-widest">Step 6 / 6</span>
        <h2 className="text-2xl font-bold tracking-tight mt-0.5">Choose your plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All paid plans start with a <strong>7-day free trial</strong> — you won&apos;t be charged until it ends, and you can cancel anytime.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const isFree = plan.id === "free";
          return (
            <button
              key={plan.id}
              onClick={() => setChosen(plan.id as PlanId)}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all",
                chosen === plan.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
                plan.highlighted && chosen !== plan.id && "border-primary/40",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  <Zap className="size-2.5" /> Popular
                </span>
              )}
              <div className="mb-3 flex items-center justify-between">
                <PlanBadge plan={plan.id} size="md" />
                {chosen === plan.id && <Check className="size-4 text-primary" />}
              </div>
              <p className="font-bold text-lg">{isFree ? "Free" : `₹${plan.price.monthly}/mo`}</p>
              {!isFree && (
                <p className="text-[10px] text-primary font-semibold mt-0.5">{plan.trialDays}-day free trial</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-3 space-y-1">
                {plan.features.slice(0, 4).map((f, i) => (
                  <li key={i} className={cn("flex items-center gap-1.5 text-[10px]", !f.included && "opacity-40")}>
                    {f.included ? <Check className="size-2.5 shrink-0 text-primary" /> : <span className="size-2.5">—</span>}
                    {f.text}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          onClick={() => onFinish(chosen)}
          disabled={submitting}
          size="lg"
          className="px-8"
        >
          {submitting
            ? "Setting up…"
            : chosen === "free"
            ? "Continue with Free"
            : `Start ${PLANS[chosen].trialDays}-day trial on ${PLANS[chosen].name}`}
          {!submitting && <ChevronRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

/* ── shared sub-components ──────────────────────────────────────── */

function StepHeader({
  step,
  title,
  desc,
  optional,
}: {
  step: number;
  title: string;
  desc: string;
  optional?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-primary uppercase tracking-widest">Step {step} / 5</span>
        {optional && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Optional</span>
        )}
      </div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  onSkip,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" /> Back
      </Button>
      <div className="flex items-center gap-2">
        {onSkip && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip}>
            Skip
          </Button>
        )}
        <Button onClick={onNext} disabled={nextDisabled} size="sm" className="px-6">
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

