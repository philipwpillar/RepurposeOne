"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import type { DashboardUser } from "@/app/(dashboard)/_components/dashboard-shell";
import { UserAvatar } from "@/components/app/user-avatar";
import { useSignOut } from "@/components/app/use-sign-out";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountMenuProps {
  user: DashboardUser;
}

export function AccountMenu({ user }: AccountMenuProps) {
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 rounded-full p-0 md:inline-flex"
          aria-label="Account menu"
        >
          <UserAvatar user={user} size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/account">Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/brand-voice">Brand Voice</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-muted-foreground"
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
