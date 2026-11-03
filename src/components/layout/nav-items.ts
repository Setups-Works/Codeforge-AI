import {
  Bookmark,
  BarChart3,
  Brain,
  Building2,
  CalendarDays,
  Code2,
  FileText,
  Globe,
  BookOpen,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Map,
  Medal,
  MessageSquare,
  MonitorPlay,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Terminal,
  Trophy,
  Users,
  type LucideIcon,
} from "@/components/icons";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  /** Match the path exactly instead of as a prefix (for section roots like /learn). */
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Main" },
  { title: "Problems", href: "/problems", icon: Code2, group: "Main" },
  { title: "Compiler", href: "/compiler", icon: Terminal, group: "Main" },
  { title: "Generate", href: "/generate", icon: Sparkles, group: "Main" },
  { title: "Challenges", href: "/challenges", icon: Paintbrush, group: "Main" },
  { title: "Roadmaps", href: "/roadmaps", icon: Map, group: "Main" },
  { title: "Contests", href: "/contests", icon: Trophy, group: "Main" },
  { title: "Companies", href: "/companies", icon: Building2, group: "Main" },
  { title: "Interview", href: "/interview", icon: MonitorPlay, group: "Main" },
  { title: "Leaderboard", href: "/leaderboard", icon: Medal, group: "Main" },
  { title: "Community", href: "/community", icon: Users, group: "Community" },
  { title: "Discuss", href: "/discuss", icon: MessageSquare, group: "Community" },
  { title: "Forum", href: "/forum", icon: Globe, group: "Community" },
  { title: "Bookmarks", href: "/bookmarks", icon: Bookmark, group: "Community" },
  { title: "My Notes", href: "/notes", icon: StickyNote, group: "Community" },
  { title: "QA Program", href: "/qa", icon: ShieldCheck, group: "Community" },
  { title: "Tracks", href: "/tracks", icon: ListChecks, group: "Learning" },
  { title: "Weakness", href: "/weakness", icon: BarChart3, group: "Learning" },
  { title: "Revision", href: "/revision", icon: Brain, group: "Learning" },
  { title: "Analytics", href: "/analytics", icon: LineChart, group: "Learning" },
  { title: "Learning Coach", href: "/ai-tools?tool=coach", icon: GraduationCap, group: "AI Tools" },
  { title: "Pair Programmer", href: "/ai-tools?tool=pair", icon: Users, group: "AI Tools" },
  { title: "Study Planner", href: "/ai-tools?tool=study", icon: CalendarDays, group: "AI Tools" },
  { title: "Complexity", href: "/ai-tools?tool=complexity", icon: BarChart3, group: "AI Tools" },
  { title: "Code Review", href: "/ai-tools?tool=code", icon: Code2, group: "AI Tools" },
  { title: "Roadmap", href: "/ai-tools?tool=roadmap", icon: Map, group: "AI Tools" },
  { title: "Contest Gen", href: "/ai-tools?tool=contest", icon: Trophy, group: "AI Tools" },
  { title: "Resume", href: "/ai-tools?tool=resume", icon: FileText, group: "AI Tools" },
  { title: "Project Review", href: "/ai-tools?tool=project", icon: MonitorPlay, group: "AI Tools" },
];

const byHref = (href: string): NavItem => {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (!item) throw new Error(`nav-items: no NAV_ITEM for ${href}`);
  return item;
};

/** Primary items pinned in the mobile bottom navigation bar (in display order). */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  "/dashboard",
  "/problems",
  "/generate",
  "/compiler",
].map(byHref);

/** Items revealed by the "More" button in the mobile bottom navigation. */
export const MOBILE_MORE_ITEMS: NavItem[] = [
  "/roadmaps",
  "/contests",
].map(byHref);

/** True for every route that belongs to the Learn (LMS) mode. */
export const isLearnPath = (pathname: string): boolean =>
  pathname === "/learn" || pathname.startsWith("/learn/");

/** Sidebar shown in Learn mode. Add entries here as LMS pages ship. */
export const LEARN_NAV_ITEMS: NavItem[] = [
  { title: "Home", href: "/learn", icon: GraduationCap, group: "Learn", exact: true },
  { title: "Browse courses", href: "/learn/courses", icon: BookOpen, group: "Learn" },
  { title: "My courses", href: "/learn/my-courses", icon: ListChecks, group: "Learn" },
  { title: "Billing & orders", href: "/settings#billing", icon: CreditCard, group: "Account" },
  { title: "Back to Practice", href: "/dashboard", icon: LayoutDashboard, group: "Account" },
];

/** Mobile bottom-bar items in Learn mode (no "More" sheet needed yet). */
export const LEARN_MOBILE_NAV_ITEMS: NavItem[] = [
  LEARN_NAV_ITEMS[0],
  LEARN_NAV_ITEMS[1],
  LEARN_NAV_ITEMS[2],
  LEARN_NAV_ITEMS[4],
];
