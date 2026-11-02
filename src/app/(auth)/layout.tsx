import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { CheckCircle2, Flame } from "@/components/icons";
import { APP_NAME } from "@/lib/constants";

// Auth pages (sign in / sign up / password reset) must never be indexed —
// they were ranking as "Sign in | Setups Works Lab" for the brand query.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const HIGHLIGHTS = [
  "AI mentor that reviews your code line by line",
  "135+ real interview problems across DSA & frontend",
  "Mock interviews, contests, and a spaced-repetition tracker",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.05fr]">
      {/* ── Form column ─────────────────────────────────────────────── */}
      <div className="relative flex flex-col px-6 py-8 sm:px-10">
        {/* faint top accent so the plain side still feels designed */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/[0.04] to-transparent" />

        <div className="relative">
          <Logo />
        </div>

        <main className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>

        <footer className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/help" className="transition-colors hover:text-foreground">Help</Link>
        </footer>
      </div>

      {/* ── Brand column (desktop) ──────────────────────────────────── */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* deep gradient base */}
        <div className="absolute inset-0 bg-[#070711]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,#0b3ea8_0%,#0a1230_42%,#070711_100%)]" />
        {/* glow */}
        <div className="absolute -right-24 top-[-10%] size-[520px] rounded-full bg-[#006bff]/25 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] size-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(100% 100% at 70% 20%, #000 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(100% 100% at 70% 20%, #000 40%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white xl:p-16">
          {/* brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#006bff] shadow-lg shadow-[#006bff]/30">
              <Flame className="size-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </div>

          {/* headline + highlights */}
          <div className="max-w-md">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/70">
              Your AI interview coach
            </span>
            <h2 className="mt-5 text-[2.6rem] font-bold leading-[1.08] tracking-tight">
              Crack your next
              <br />
              coding interview.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              Practice like the real thing — with an AI mentor, real problems, and
              the analytics to know exactly what to work on next.
            </p>

            <ul className="mt-8 space-y-3.5">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-start gap-3 text-[14px] text-white/85">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#4d9dff]" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* proof */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-2xl font-bold">135+</div>
              <div className="text-xs text-white/50">curated problems</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-2xl font-bold">AI-graded</div>
              <div className="text-xs text-white/50">every submission</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-2xl font-bold">7-day</div>
              <div className="text-xs text-white/50">free trial</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
