"use client";

import Link from "next/link";
import {
  CreditCard,
  Gauge,
  LogOut,
  Mic,
  Palette,
  Sparkles,
  User,
} from "lucide-react";
import type { DashboardUser } from "@/app/(dashboard)/_components/dashboard-shell";
import { UserAvatar } from "@/components/app/user-avatar";
import { useSignOut } from "@/components/app/use-sign-out";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { planLabel } from "@/lib/plan-label";
import { cn } from "@/lib/utils";
import type { UsageInfo } from "@/types";

interface AccountMenuProps {
  user: DashboardUser;
  usage: UsageInfo;
}

const ACCOUNT_LINKS = [
  { href: "/account#profile", label: "Profile", icon: User },
  { href: "/account#appearance", label: "Appearance", icon: Palette },
  { href: "/account#usage", label: "Usage", icon: Gauge },
  { href: "/account#plans", label: "Plans", icon: Sparkles },
  { href: "/account#billing", label: "Billing", icon: CreditCard },
] as const;

export function AccountMenu({ user, usage }: AccountMenuProps) {
  const signOut = useSignOut();
  const atLimit = usage.used >= usage.limit;
  const usagePercent = Math.min(100, (usage.used / usage.limit) * 100);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full p-0"
          aria-label="Account menu"
        >
          <UserAvatar user={user} size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="space-y-3 border-b border-border px-3 py-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              {user.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg bg-secondary/60 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {planLabel(usage.plan)} · generations
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  atLimit ? "text-destructive" : "text-foreground"
                )}
              >
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-background"
              role="progressbar"
              aria-valuenow={usage.used}
              aria-valuemin={0}
              aria-valuemax={usage.limit}
              aria-label="Monthly generation usage"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  atLimit ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <Link
              href="/account#plans"
              className="inline-block text-[11px] font-medium text-primary hover:text-primary/80"
            >
              Upgrade →
            </Link>
          </div>
        </div>

        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild>
              <Link href={href} className="gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/brand-voice" className="gap-2">
              <Mic className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Brand Voice
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="p-1">
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
