"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Briefcase,
  CreditCard,
  FileQuestion,
  GraduationCap,
  ListChecks,
  Lock,
  Mail,
  MessageSquare,
  Newspaper,
  Paintbrush,
  Settings,
  ShieldCheck,
  Tag,
  Trophy,
  TrendingUp,
  Users,
  type LucideIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { lmsEnabled } from "@/lib/lms/flag";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AdminNavSection {
  heading: string;
  items: AdminNavItem[];
}

const SECTIONS: AdminNavSection[] = [
  {
    heading: "Overview",
    items: [
      { href: "/admin", label: "Analytics", icon: BarChart3 },
      { href: "/admin/insights", label: "Live Insights", icon: TrendingUp },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/questions", label: "Questions", icon: FileQuestion },
      { href: "/admin/challenges", label: "Challenges", icon: Paintbrush },
      { href: "/admin/contests", label: "Contests", icon: Trophy },
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
      ...(lmsEnabled() ? [{ href: "/admin/courses", label: "Courses", icon: GraduationCap }] : []),
    ],
  },
  {
    heading: "Community",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/submissions", label: "Submissions", icon: ListChecks },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
      { href: "/admin/careers", label: "Applications", icon: Briefcase },
      { href: "/admin/qa", label: "QA", icon: ShieldCheck },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  {
    heading: "Revenue",
    items: [
      { href: "/admin/billing", label: "Billing & Usage", icon: CreditCard },
      { href: "/admin/coupons", label: "Coupons", icon: Tag },
    ],
  },
  {
    heading: "AI",
    items: [{ href: "/admin/prompts", label: "Prompts", icon: Bot }],
  },
  {
    heading: "Config",
    items: [
      { href: "/admin/features", label: "Feature Access", icon: Lock },
      { href: "/api-docs", label: "API Reference", icon: FileQuestion },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Desktop: grouped left sidebar */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-52 shrink-0 overflow-y-auto border-r bg-sidebar md:block">
      <nav className="space-y-5 p-3">
        {SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Mobile: horizontal scrollable nav */
export function AdminMobileNav() {
  const pathname = usePathname();
  const items = SECTIONS.flatMap((section) => section.items);

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-2 md:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
