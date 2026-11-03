import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "@/components/icons";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { lmsEnabled } from "@/lib/lms/flag";

const NAV_LINKS = [
  { label: "Problems", href: "/problems" },
  ...(lmsEnabled() ? [{ label: "Courses", href: "/courses" }] : []),
  { label: "Forum", href: "/forum" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/help" },
  { label: "Blog", href: "/blog" },
];

/** Slim header for public pages (forum, profile, problems) */
export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo href={signedIn ? "/dashboard" : "/"} />
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <LayoutDashboard className="size-4" /> Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">
                  Get started <ArrowRight className="size-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
