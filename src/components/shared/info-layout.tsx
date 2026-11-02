import Link from "next/link";
import { Heart } from "@/components/icons";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { PageAura } from "@/components/shared/reactbits-kit";

export function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh bg-background text-foreground flex flex-col overflow-hidden">
      <PageAura height={520} />
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-background/70 backdrop-blur-xl dark:border-white/[0.08]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-bold text-primary">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/problems" className="hover:text-foreground transition-colors hidden sm:block">Problems</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors hidden sm:block">Pricing</Link>
            <Link href="/help" className="hover:text-foreground transition-colors hidden sm:block">Docs</Link>
            <Link href="/about" className="hover:text-foreground transition-colors hidden sm:block">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors hidden sm:block">Contact</Link>
            <Link href="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
            <Link href="/beta/join" className="rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-colors">
              Join Beta
            </Link>
            <Link href="/login" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-4xl px-4 py-12">
        {children}
      </main>

      <footer className="relative z-10 border-t">
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 text-xs text-muted-foreground">
          {/* link row — wraps and stays centered */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/help" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
            <Link href="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
            <a href="https://github.com/Setups-Works/setups-works-lab" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://www.linkedin.com/company/codeforge-ai/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a>
            <a href="https://www.instagram.com/codeforgeai.io/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Instagram</a>
          </nav>

          {/* meta row */}
          <div className="flex flex-col items-center gap-3 border-t pt-4 sm:flex-row sm:justify-between">
            <p className="order-2 sm:order-1">© {new Date().getFullYear()} {APP_NAME}</p>
            <div className="order-1 flex items-center gap-1.5 sm:order-2">
              from the
              <Heart className="size-3 fill-red-500 text-red-500" />
              <img src="/white.png" alt="Setups Works" className="hidden h-5 w-auto dark:inline-block" />
              <img src="/black.png" alt="Setups Works" className="inline-block h-5 w-auto dark:hidden" />
            </div>
            <span className="order-3 rounded-full border px-2 py-0.5 font-mono">v{APP_VERSION}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
