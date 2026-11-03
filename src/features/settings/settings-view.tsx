"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Settings } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface SettingsSection {
  id: string;
  label: string;
  /** A pre-rendered icon element — passing a bare component function across the
   *  server→client boundary is not allowed, so the page renders it first. */
  icon: ReactNode;
  desc: string;
  node: ReactNode;
}

export function SettingsView({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const current = sections.find((s) => s.id === active) ?? sections[0];

  // Deep links like /settings#billing open that section.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && sections.some((s) => s.id === id)) setActive(id);
    // Run once on mount: later section clicks must not be reset by the hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-5 md:grid-cols-[224px_1fr] md:gap-10">
      {/* Sidebar on desktop; sticky, edge-to-edge scrolling tab bar on mobile */}
      <aside
        className={cn(
          // min-w-0 lets the nav's overflow-x scroll internally instead of
          // widening the grid column (which caused horizontal page overflow)
          "min-w-0",
          // mobile: pinned under the top bar so sections stay reachable while scrolling
          "sticky top-14 z-20 border-b bg-background/90 pb-2 backdrop-blur-sm",
          // desktop: plain sticky sidebar, no chrome
          "md:top-20 md:self-start md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none",
        )}
      >
        <div className="mb-3 flex items-center gap-2 px-1 pt-1 md:mb-4">
          <Settings className="size-4 text-muted-foreground" />
          <h1 className="text-base font-semibold tracking-tight md:text-lg">Settings</h1>
        </div>
        <nav className="flex snap-x gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-col md:gap-0.5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => {
            const on = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors md:w-full",
                  on
                    ? "bg-[#006bff]/8 font-medium text-foreground ring-1 ring-inset ring-[#006bff]/15"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className={cn("flex shrink-0", on && "text-[#006bff]")}>{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="min-w-0">
        <div className="mb-4 md:mb-5">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">{current?.label}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{current?.desc}</p>
        </div>
        {sections.map((s) => (
          <div key={s.id} className={cn("space-y-4", s.id !== active && "hidden")}>
            {s.node}
          </div>
        ))}
      </div>
    </div>
  );
}
