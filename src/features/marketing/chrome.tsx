"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FaLinkedin, FaInstagram } from "react-icons/fa6";
import { ArrowRight, Menu, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Marketing chrome shared by the landing page and standalone marketing pages
 * (e.g. /join), so they stay visually identical. The landing page's own header
 * keeps its in-page smooth-scroll behaviour; this header links to real routes,
 * which is what a non-home page needs.
 */

/* Same visual language as the landing page. */
export const pageCls = "bg-[#f7f8fb] text-neutral-900 dark:bg-[#030308] dark:text-neutral-50";
const glass =
  "border border-black/[0.08] bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]";
const inkSub = "text-neutral-600 dark:text-neutral-400";
const inkFaint = "text-neutral-500 dark:text-neutral-500";
const lineCls = "border-black/[0.06] dark:border-white/[0.07]";
const hoverRow = "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]";
const primaryBtn =
  "h-9 rounded-xl bg-neutral-900 px-4 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com/CodeForgeAI-io/Codeforge-AI", Icon: null },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/codeforge-ai/", Icon: FaLinkedin },
  { label: "Instagram", href: "https://www.instagram.com/codeforgeai.io/", Icon: FaInstagram },
] as const;

/** Anchors resolve against the home page since this header ships on subpages. */
const NAV = [
  ["Features", "/#features"],
  ["AI Suite", "/#ai"],
  ["Problems", "/problems"],
  ["Pricing", "/pricing"],
  ["Blog", "/blog"],
] as const;

const FOOTER_COLS = [
  { heading: "Platform", links: [{ label: "Problems", href: "/problems" }, { label: "Challenges", href: "/challenges" }, { label: "Contests", href: "/contests" }, { label: "Roadmaps", href: "/roadmaps" }, { label: "Leaderboard", href: "/leaderboard" }] },
  { heading: "AI Tools", links: [{ label: "Learning Coach", href: "/ai-tools" }, { label: "Pair Programmer", href: "/ai-tools" }, { label: "Study Planner", href: "/ai-tools" }, { label: "Resume Analyzer", href: "/ai-tools" }] },
  { heading: "Community", links: [{ label: "Forum", href: "/forum" }, { label: "Discussions", href: "/discuss" }, { label: "Notes", href: "/notes" }, { label: "Company Prep", href: "/companies" }] },
  { heading: "Legal", links: [{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }, { label: "Changelog", href: "/changelog" }, { label: "Status", href: "/status" }, { label: "Design", href: "/design-guidelines" }] },
];

/** Inline mark — matches the landing page's footer social icons. */
function GithubIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.04 10.04 0 0 0 22 12.25C22 6.58 17.52 2 12 2" /></svg>;
}

export function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div className={cn("mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-3 sm:px-5", glass, "bg-white/80 dark:bg-[#0a0e1a]/70")}>
        <Logo />
        <nav className={cn("hidden items-center gap-6 text-sm md:flex", inkSub)}>
          {NAV.map(([label, href]) => (
            <Link key={label} href={href} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              {label}
            </Link>
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
                <Link key={label} href={href} onClick={() => setMobileMenu(false)} className={cn("rounded-xl px-3 py-2.5 text-sm", inkSub, hoverRow)}>
                  {label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function MarketingFooter() {
  return (
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
  );
}
