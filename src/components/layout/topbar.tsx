"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, Menu, Search, Settings, User } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "./sidebar-nav";
import { CommandSearch, useCommandSearch } from "./command-search";
import { ModeSwitch } from "./mode-switch";

export function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setOpen } = useCommandSearch();
  const [navOpen, setNavOpen] = useState(false);

  const user = session?.user;
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 glass-strong sm:gap-3 sm:px-4">
      {/* mobile: full-nav drawer + compact logo */}
      <div className="flex items-center gap-1 md:hidden">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b px-4">
              <Logo href="/dashboard" />
            </div>
            <div className="px-3 pt-3">
              <ModeSwitch className="flex w-full" onNavigate={() => setNavOpen(false)} />
            </div>
            <SidebarNav onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <Logo href="/dashboard" compact />
      </div>
      <ModeSwitch className="hidden md:inline-flex" />
      {/* desktop: wide search field */}
      <Button
        variant="outline"
        className="hidden h-9 w-64 justify-start gap-2 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="text-sm">Search...</span>
        <kbd className="pointer-events-none ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>
      {/* mobile: icon-only search */}
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto sm:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
      <div className="flex items-center gap-1 sm:ml-auto">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-9 rounded-full p-0">
              <Avatar className="size-8">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                @{user?.username}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/profile/${user?.username}`}>
                <User className="size-4" /> Public profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                signOut({ callbackUrl: "/" })
              }
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommandSearch />
    </header>
  );
}
