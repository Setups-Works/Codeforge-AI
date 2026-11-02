"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Loader2, Zap, Crown, Tag as TagIcon, RotateCcw,
  Code2, Bot, Trophy, Flame, Search, Settings, Play, Download,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { MarketingHeader, MarketingFooter, pageCls } from "./chrome";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* All values mirror src/app/globals.css — the single source of truth. */

const BRAND = [
  { name: "Blue 400", hex: "#cae7ff", token: "--heat-1" },
  { name: "Blue 500", hex: "#94ccff", token: "--heat-2" },
  { name: "Blue 600", hex: "#48aeff", token: "--heat-3" },
  { name: "Brand Blue 700", hex: "#006bff", token: "--ring / --chart-1" },
  { name: "Deep Navy", hex: "#0b3ea8", token: "email masthead" },
];

const NEUTRAL_LIGHT = [
  { name: "Background", hex: "#ffffff", token: "--background" },
  { name: "Muted", hex: "#f7f7f7", token: "--muted" },
  { name: "Accent hover", hex: "#f2f2f2", token: "--accent" },
  { name: "Border", hex: "#ebebeb", token: "--border" },
  { name: "Muted text", hex: "#666666", token: "--muted-foreground" },
  { name: "Foreground", hex: "#171717", token: "--foreground / --primary" },
];

const NEUTRAL_DARK = [
  { name: "Background", hex: "#0a0a0a", token: "--background" },
  { name: "Card", hex: "#18181b", token: "--card" },
  { name: "Muted", hex: "#1d1d20", token: "--muted" },
  { name: "Accent hover", hex: "#262629", token: "--accent" },
  { name: "Muted text", hex: "#a1a1a1", token: "--muted-foreground" },
  { name: "Foreground", hex: "#ededed", token: "--foreground / --primary" },
];

const SEMANTIC = [
  { name: "Success / Easy", hex: "#28a948", token: "--success / --easy" },
  { name: "Warning", hex: "#ffae00", token: "--warning" },
  { name: "Medium", hex: "#d97706", token: "--medium" },
  { name: "Destructive / Hard", hex: "#e5484d", token: "--destructive / --hard" },
];

const CHARTS = [
  { name: "Chart 1", hex: "#006bff", token: "--chart-1" },
  { name: "Chart 2", hex: "#28a948", token: "--chart-2" },
  { name: "Chart 3", hex: "#ffae00", token: "--chart-3" },
  { name: "Chart 4", hex: "#a000f8", token: "--chart-4" },
  { name: "Chart 5", hex: "#f22782", token: "--chart-5" },
];

const HEAT = ["#ebebeb", "#cae7ff", "#94ccff", "#48aeff", "#006bff"];

const NAV = [
  ["Logo", "#logo"],
  ["Typography", "#typography"],
  ["Color", "#color"],
  ["Illustration", "#illustration"],
  ["Motion", "#motion"],
  ["Components", "#components"],
  ["Voice", "#voice"],
  ["Assets", "#assets"],
] as const;

const ASSETS = [
  { name: "Wordmark · light", file: "/logo.png", download: "setups-works-lab-logo-light.png", meta: "PNG · 774×186", dark: false },
  { name: "Wordmark · dark", file: "/logo-dark.png", download: "setups-works-lab-logo-dark.png", meta: "PNG · 774×186", dark: true },
  { name: "App icon · vector", file: "/icon.svg", download: "setups-works-lab-icon.svg", meta: "SVG", dark: false },
  { name: "App icon · 512", file: "/icon-512.png", download: "setups-works-lab-icon-512.png", meta: "PNG · 512×512", dark: false },
];

export function DesignGuidelinesView({ signedIn }: { signedIn: boolean }) {
  return (
    <div className={cn("min-h-svh", pageCls)}>
      <MarketingHeader signedIn={signedIn} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/[0.06] dark:border-white/[0.07]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(800px 380px at 50% -10%, rgba(0,107,255,0.14), transparent 70%)" }}
        />
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-28 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006bff]">Brand & product</p>
          <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Design guidelines</h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-neutral-600 dark:text-neutral-400">
            The system behind {APP_NAME} — logo, typography, color, illustration and motion. Use it to keep
            everything we ship looking and moving like one product.
          </p>
        </div>

        {/* Section nav */}
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-1.5 px-4 pb-6 sm:px-6">
          {NAV.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-[#006bff]/40 hover:text-[#006bff] dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-400"
            >
              {label}
            </a>
          ))}
        </nav>
      </section>

      <div className="mx-auto max-w-4xl space-y-16 px-4 py-14 sm:px-6">
        {/* ── 1 · Logo ── */}
        <Section id="logo" no="01" title="Logo" sub="The wordmark adapts to its surface; the icon stands alone at small sizes.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex h-36 items-center justify-center rounded-2xl border border-black/[0.08] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Setups Works Lab logo on light" className="h-9 w-auto" />
            </div>
            <div className="flex h-36 items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-dark.png" alt="Setups Works Lab logo on dark" className="h-9 w-auto" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-center rounded-2xl border border-black/[0.08] bg-white py-6 dark:border-white/10 dark:bg-white/[0.04]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="App icon" className="size-14 rounded-2xl" />
            </div>
            <Rule ok text="Keep clear space around the mark equal to the icon's height ÷ 2." />
            <Rule ok={false} text="Don't recolor, stretch, add effects, or place the mark on low-contrast imagery." />
          </div>
        </Section>

        {/* ── 2 · Typography ── */}
        <Section id="typography" no="02" title="Typography" sub="Three faces, three jobs: Space Grotesk for marketing display, Geist Sans for the interface, Geist Mono for code. Tight tracking on display sizes.">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-display text-3xl font-bold tracking-tight">Ag</p>
              <p className="mt-1.5 text-sm font-semibold">Space Grotesk</p>
              <p className="font-mono text-[11px] text-neutral-500">font-display · marketing headlines</p>
            </div>
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-3xl font-bold tracking-tight">Ag</p>
              <p className="mt-1.5 text-sm font-semibold">Geist Sans</p>
              <p className="font-mono text-[11px] text-neutral-500">font-sans · interface & body</p>
            </div>
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-mono text-3xl font-medium tracking-tight">Ag</p>
              <p className="mt-1.5 text-sm font-semibold">Geist Mono</p>
              <p className="font-mono text-[11px] text-neutral-500">font-mono · code & metadata</p>
            </div>
          </div>
          <div className="space-y-5 rounded-2xl border border-black/[0.08] bg-white p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
            <TypeRow spec="font-display · text-5xl · font-bold · tracking-[-0.03em]"><span className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Master coding interviews</span></TypeRow>
            <TypeRow spec="text-2xl · font-bold · tracking-tight"><span className="text-2xl font-bold tracking-tight">Section heading</span></TypeRow>
            <TypeRow spec="text-lg · font-semibold"><span className="text-lg font-semibold">Card title</span></TypeRow>
            <TypeRow spec="text-sm · body"><span className="text-sm">Body copy explains one idea per sentence, in plain language, at 14px.</span></TypeRow>
            <TypeRow spec="text-xs · muted"><span className="text-xs text-neutral-500">Supporting caption or metadata.</span></TypeRow>
            <TypeRow spec="font-mono · text-[13px]"><code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[13px] dark:bg-white/10">const solve = (input: string) =&gt; output;</code></TypeRow>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Rule ok text="Numbers in stats and prices use tabular-nums so they never jitter." />
            <Rule ok={false} text="Never letter-space body text; tight tracking is for display sizes only." />
          </div>
        </Section>

        {/* ── 3 · Color ── */}
        <Section id="color" no="03" title="Color" sub="Near-black primary actions, one decisive blue accent, honest semantic colors. Click any swatch to copy its hex.">
          <Palette label="Brand blue" items={BRAND} />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Palette label="Neutrals · light" items={NEUTRAL_LIGHT} />
            <Palette label="Neutrals · dark" items={NEUTRAL_DARK} />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Palette label="Semantic" items={SEMANTIC} />
            <Palette label="Charts" items={CHARTS} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Rule ok text="Blue #006bff is an accent: focus rings, links, active states, key stats — not large fills." />
            <Rule ok text="Difficulty is always Easy green · Medium amber · Hard red, in both themes." />
          </div>
        </Section>

        {/* ── 4 · Illustration ── */}
        <Section id="illustration" no="04" title="Illustration" sub="We don't use stock art. Atmosphere comes from light, glass and data — rendered, never pasted.">
          <div className="grid gap-4 sm:grid-cols-2">
            <DemoCard label="Radial glow — hero atmosphere">
              <div className="relative h-36 overflow-hidden rounded-xl border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-[#05070d]">
                <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(0,107,255,0.22), transparent 70%)" }} />
                <p className="absolute inset-x-0 bottom-3 text-center font-mono text-[11px] text-neutral-500">radial-gradient · blue at 14–22% alpha</p>
              </div>
            </DemoCard>
            <DemoCard label="Glass surface — floating chrome">
              <div className="relative h-36 overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.07]" style={{ background: "linear-gradient(135deg, #cae7ff, #006bff)" }}>
                <div className="absolute inset-x-6 top-1/2 flex h-14 -translate-y-1/2 items-center justify-between rounded-2xl border border-white/40 bg-white/70 px-4 backdrop-blur-xl dark:border-white/20 dark:bg-white/10">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">Glass card</span>
                  <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-200">backdrop-blur-xl</span>
                </div>
              </div>
            </DemoCard>
            <DemoCard label="Data as decoration — activity heatmap">
              <div className="flex h-36 flex-col items-center justify-center gap-3 rounded-xl border border-black/[0.06] bg-white px-6 dark:border-white/[0.07] dark:bg-white/[0.03]">
                <div className="grid w-full max-w-[280px] grid-cols-12 gap-1.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} className="aspect-square w-full rounded-[4px]" style={{ background: HEAT[(i * 7 + (i % 5)) % 5] }} />
                  ))}
                </div>
                <p className="text-center font-mono text-[11px] text-neutral-500">--heat-0 → --heat-4 · real data, never fake</p>
              </div>
            </DemoCard>
            <DemoCard label="Iconography — one set, filled">
              <div className="flex h-36 flex-col items-center justify-center gap-4 rounded-xl border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-white/[0.03]">
                <div className="flex items-center gap-5 text-neutral-700 dark:text-neutral-300">
                  <Code2 className="size-5" /><Bot className="size-5" /><Trophy className="size-5" />
                  <Flame className="size-5" /><Search className="size-5" /><Settings className="size-5" />
                  <Play className="size-5 text-[#006bff]" />
                </div>
                <p className="font-mono text-[11px] text-neutral-500">Font Awesome solid · 16/20px · currentColor</p>
              </div>
            </DemoCard>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Rule ok text="Mock UI, terminals and editors are drawn with real components — screenshots of ourselves, not clipart." />
            <Rule ok={false} text="No stock photos, 3D blobs, or emoji as UI. One accent color per illustration." />
          </div>
        </Section>

        {/* ── 5 · Motion ── */}
        <Section id="motion" no="05" title="Motion" sub="Fast, purposeful, transform/opacity only. UI feedback ≤ 200ms; entrances 600–800ms; ambient loops are subtle and infinite.">
          <MotionDemos />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Rule ok text="Animate transform and opacity only — never width, height or top/left." />
            <Rule ok text="Entrances rise 30–60px and fade in once; scroll-stacking uses CSS position: sticky, no JS." />
            <Rule ok={false} text="Nothing bounces for attention. Motion explains hierarchy; it never begs for it." />
          </div>
        </Section>

        {/* ── Components ── */}
        <Section id="components" no="06" title="Components" sub="Live from the product's UI kit — these are the real components, not pictures.">
          <div className="grid gap-4 md:grid-cols-2">
            <DemoCard label="Buttons">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button disabled><Loader2 className="size-4 animate-spin" /> Loading</Button>
              </div>
            </DemoCard>
            <DemoCard label="Badges & difficulty">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <DifficultyBadge difficulty="Easy" />
                <DifficultyBadge difficulty="Medium" />
                <DifficultyBadge difficulty="Hard" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500"><Zap className="size-2.5" /> GO</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-500"><Crown className="size-2.5" /> PLUS</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#006bff]/30 bg-[#006bff]/10 px-2 py-0.5 text-[10px] font-semibold text-[#006bff]"><TagIcon className="size-2.5" /> LAUNCH30</span>
              </div>
            </DemoCard>
            <DemoCard label="Inputs">
              <div className="grid gap-2.5">
                <Input placeholder="you@example.com" />
                <Input placeholder="Focused state shows the blue ring" className="ring-2 ring-[#006bff]/40" />
              </div>
            </DemoCard>
            <DemoCard label="Card">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Two Sum</CardTitle>
                  <CardDescription className="text-xs">Arrays · Hash Map</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <DifficultyBadge difficulty="Easy" />
                  <Button size="sm">Solve</Button>
                </CardContent>
              </Card>
            </DemoCard>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Rule ok text="Radius: 6px controls, 12px cards, 24px marketing surfaces (rounded-3xl)." />
            <Rule ok text="One primary action per view. Everything else is outline or ghost." />
          </div>
        </Section>

        {/* ── Voice ── */}
        <Section id="voice" no="07" title="Voice" sub="How Setups Works Lab talks, everywhere from buttons to billing emails.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Rule ok text="Plain and direct: “Run code”, “Start free trial”, “Cancel anytime”." />
            <Rule ok text="Honest about money and terms — the first-charge date is always shown before payment." />
            <Rule ok={false} text="No hype words (“revolutionary”), no guilt-tripping cancel flows, no dark patterns." />
            <Rule ok={false} text="Never spoil a solution — hints guide, they don't solve." />
          </div>
        </Section>

        {/* ── Brand assets ── */}
        <Section id="assets" no="08" title="Brand assets" sub="Official marks, ready to use. Grab individual files or the whole kit with usage notes and colors.">
          <div className="grid gap-4 sm:grid-cols-2">
            {ASSETS.map((a) => (
              <div key={a.file} className="overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/10">
                <div className={cn("flex h-28 items-center justify-center", a.dark ? "bg-[#0a0a0a]" : "bg-white")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.file} alt={a.name} className={a.file.includes("logo") ? "h-8 w-auto" : "size-14"} />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] bg-white px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.04]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="font-mono text-[11px] text-neutral-500">{a.meta}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                    <a href={a.file} download={a.download}>
                      <Download className="size-3.5" /> Download
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* One-page bento poster */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/setups-works-lab-brand-bento.png" alt="The full Setups Works Lab brand system on one bento poster" className="w-full" />
            <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] bg-white px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.04]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">The whole system, one poster</p>
                <p className="font-mono text-[11px] text-neutral-500">PNG · 3200×2000 · bento</p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                <a href="/brand/setups-works-lab-brand-bento.png" download="setups-works-lab-brand-bento.png">
                  <Download className="size-3.5" /> Download
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-[#006bff]/25 bg-[#006bff]/5 p-6 text-center">
            <p className="text-sm font-semibold">Everything in one kit</p>
            <p className="max-w-md text-xs text-neutral-600 dark:text-neutral-400">
              Wordmarks, icons (SVG + PNG), maskable icon, the bento poster, plus a README with clear-space rules and the color palette.
            </p>
            <Button asChild className="mt-2 gap-2">
              <a href="/brand/setups-works-lab-brand-assets.zip" download>
                <Download className="size-4" /> Download brand kit (.zip)
              </a>
            </Button>
          </div>
        </Section>
      </div>

      <MarketingFooter />
    </div>
  );
}

/* ── Motion demos (framer-motion, replayable) ─────────────────────── */

function MotionDemos() {
  const [runId, setRunId] = useState(0);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DemoCard label="Entrance — rise & fade (0.6s ease-out)">
        <div className="flex h-36 flex-col items-center justify-center gap-3 rounded-xl border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-white/[0.03]">
          <motion.div
            key={runId}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-xl border border-[#006bff]/30 bg-[#006bff]/10 px-5 py-2.5 text-sm font-semibold text-[#006bff]"
          >
            Content enters once
          </motion.div>
          <Button size="sm" variant="ghost" onClick={() => setRunId((n) => n + 1)} className="gap-1.5 text-xs">
            <RotateCcw className="size-3.5" /> Replay
          </Button>
        </div>
      </DemoCard>

      <DemoCard label="Feedback — hover, press, focus (≤200ms)">
        <div className="flex h-36 flex-col items-center justify-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-4 dark:border-white/[0.07] dark:bg-white/[0.03] sm:flex-row sm:gap-3">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="whitespace-nowrap rounded-xl border border-black/[0.08] bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.06]"
          >
            Hover & press me
          </motion.button>
          <span className="text-center font-mono text-[11px] text-neutral-500">transform + shadow only</span>
        </div>
      </DemoCard>

      <DemoCard label="Live state — pulse (1.8s loop)">
        <div className="flex h-36 items-center justify-center gap-6 rounded-xl border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-white/[0.03]">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#28a948]">
            <span className="size-2 animate-pulse rounded-full bg-[#28a948]" /> live
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Loader2 className="size-4 animate-spin text-[#006bff]" /> verifying…
          </span>
        </div>
      </DemoCard>

      <DemoCard label="Ambient — gentle float (5s infinite)">
        <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-[#05070d]">
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(50% 70% at 50% 100%, rgba(0,107,255,0.15), transparent 70%)" }} />
          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl border border-black/[0.08] bg-white px-5 py-3 text-sm font-semibold shadow-lg dark:border-white/10 dark:bg-white/[0.08]"
          >
            Floating card
          </motion.div>
        </div>
      </DemoCard>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

function Section({ id, no, title, sub, children }: { id: string; no: string; title: string; sub: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm font-semibold text-[#006bff]">{no}</span>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{sub}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Palette({ label, items }: { label: string; items: { name: string; hex: string; token: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/10">
        {items.map((c) => (
          <button
            key={c.name + c.hex}
            type="button"
            onClick={() => navigator.clipboard.writeText(c.hex).then(() => toast.success(`${c.hex} copied`))}
            className="flex w-full items-center gap-3 border-b border-black/[0.06] bg-white px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-black/[0.02] dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            title="Click to copy"
          >
            <span className="size-8 shrink-0 rounded-lg border border-black/10 dark:border-white/10" style={{ background: c.hex }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{c.name}</span>
              <span className="block truncate font-mono text-[11px] text-neutral-500">{c.token}</span>
            </span>
            <span className="font-mono text-xs text-neutral-500">{c.hex}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeRow({ spec, children }: { spec: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/[0.06] pb-4 last:border-0 last:pb-0 dark:border-white/[0.07]">
      {children}
      <span className="font-mono text-[11px] text-neutral-500">{spec}</span>
    </div>
  );
}

function DemoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      {children}
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-black/[0.08] bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#28a948]" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-[#e5484d]" />
      )}
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{text}</p>
    </div>
  );
}
