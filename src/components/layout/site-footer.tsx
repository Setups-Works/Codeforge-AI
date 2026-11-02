import Link from "next/link";
import { Heart } from "@/components/icons";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

/** Shared public site footer (matches the landing/info pages). */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/help" className="transition-colors hover:text-foreground">Docs</Link>
          <Link href="/blog" className="transition-colors hover:text-foreground">Blog</Link>
          <Link href="/careers" className="transition-colors hover:text-foreground">Careers</Link>
          <Link href="/about" className="transition-colors hover:text-foreground">About</Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/changelog" className="transition-colors hover:text-foreground">Changelog</Link>
          <a href="https://github.com/Setups-Works/setups-works-lab" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
          <a href="https://www.linkedin.com/company/codeforge-ai/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">LinkedIn</a>
          <a href="https://www.instagram.com/codeforgeai.io/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Instagram</a>
        </nav>
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
  );
}
