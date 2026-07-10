"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronsUpDown } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MonstaLogo } from "@/components/monsta-logo";
import { signOutAction } from "@/lib/actions/auth";

export function AppSidebar({ email }: { email: string | null }) {
  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border/60 px-4">
        <MonstaLogo />
      </div>
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <SidebarNav />
      </div>
      <div className="border-t border-sidebar-border/60 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-accent/60">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/20 text-xs text-primary">{initial}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sidebar-foreground/80">{email ?? "Account"}</span>
            <ChevronsUpDown className="size-4 text-sidebar-foreground/40" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled className="opacity-70">
              {email ?? "Signed in"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<form action={signOutAction} className="w-full" />}>
              <button type="submit" className="w-full text-left">
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
