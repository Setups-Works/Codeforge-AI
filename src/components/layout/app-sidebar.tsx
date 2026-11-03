"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "./sidebar-nav";
import { LEARN_MOBILE_NAV_ITEMS, MOBILE_NAV_ITEMS, MOBILE_MORE_ITEMS, isLearnPath, type NavItem } from "./nav-items";

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Logo href="/dashboard" />
      </div>
      <SidebarNav />
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const learnMode = isLearnPath(pathname);
  const tabItems = learnMode ? LEARN_MOBILE_NAV_ITEMS : MOBILE_NAV_ITEMS;
  const moreItems = learnMode ? [] : MOBILE_MORE_ITEMS;

  const isActive = (href: string, item?: NavItem) =>
    item?.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  // Close the "More" sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreActive = moreItems.some((item) => isActive(item.href));

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
      active ? "text-primary" : "text-muted-foreground",
    );
  const pillClass = (active: boolean) =>
    cn(
      "flex h-6 w-12 items-center justify-center rounded-full transition-colors",
      active && "bg-primary/10",
    );

  return (
    <>
      {/* Backdrop for the More sheet */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {/* More sheet — anchored just above the bar, regardless of bar height */}
        <div
          className={cn(
            "absolute inset-x-3 bottom-full z-50 mb-2 overflow-hidden rounded-2xl border bg-popover shadow-lg transition duration-200",
            moreOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            More
          </p>
          <div className="grid grid-cols-2 gap-1 p-2 pt-1">
            {moreItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  <item.icon className="size-4.5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>

        {tabItems.map((item) => {
          const active = isActive(item.href, item);
          return (
            <Link key={item.href} href={item.href} className={tabClass(active)}>
              <span className={pillClass(active)}>
                <item.icon className="size-4.5" />
              </span>
              {item.title}
            </Link>
          );
        })}
        {moreItems.length > 0 && (
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-label="More"
          className={tabClass(moreActive || moreOpen)}
        >
          <span className={pillClass(moreActive || moreOpen)}>
            <Ellipsis className="size-4.5" />
          </span>
          More
        </button>
        )}
      </nav>
    </>
  );
}
