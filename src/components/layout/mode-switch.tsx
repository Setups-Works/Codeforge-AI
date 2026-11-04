"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { lmsEnabled } from "@/lib/lms/flag";
import { isLearnPath } from "./nav-items";

const MODES = [
  { id: "practice", label: "Practice", href: "/dashboard" },
  { id: "learn", label: "Learn", href: "/learn" },
] as const;

/**
 * Practice ⇄ Learn switch. The mode is derived from the URL (`/learn*` is
 * Learn), so there is no hidden state and deep links always land in the right
 * sidebar. Renders nothing while the LMS flag is off.
 */
export function ModeSwitch({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  if (!lmsEnabled()) return null;
  const current = isLearnPath(pathname) ? "learn" : "practice";

  return (
    <div role="tablist" aria-label="Mode" className={cn("items-center rounded-lg border bg-muted/50 p-0.5", className)}>
      {MODES.map((mode) => {
        const active = mode.id === current;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            role="tab"
            aria-selected={active}
            onClick={onNavigate}
            className={cn(
              "flex-1 rounded-md px-3 py-1 text-center text-xs font-medium transition-colors",
              active ? (mode.id === "learn" ? "bg-[#006bff] text-white" : "bg-background text-foreground") : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode.label}
          </Link>
        );
      })}
    </div>
  );
}
