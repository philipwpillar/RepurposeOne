"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UsageInfo } from "@/types";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Library,
  Menu,
  Mic,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  email: string | undefined;
  name: string;
  avatarUrl: string | undefined;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Sparkles },
  { href: "/history", label: "Library", icon: Library },
  { href: "/brand-voice", label: "Brand Voice", icon: Mic },
  { href: "/upgrade", label: "Billing", icon: CreditCard },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function UserAvatar({ user, size = "md" }: { user: DashboardUser; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={cn(sizeClass, "rounded-full object-cover ring-2 ring-white")}
      />
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full bg-teal-100 font-medium text-teal-700 ring-2 ring-white"
      )}
    >
      {initials}
    </div>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-teal-50 text-teal-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-teal-600" : "text-slate-400")} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: DashboardUser;
  usage: UsageInfo;
}

function UsageIndicator({ usage, compact = false }: { usage: UsageInfo; compact?: boolean }) {
  const atLimit = usage.used >= usage.limit;
  const usagePercent = Math.min(100, (usage.used / usage.limit) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={cn("font-medium", atLimit ? "text-red-600" : "text-slate-700")}>
          {usage.used} / {usage.limit}
        </span>
        <Link
          href="/upgrade"
          className="text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">Monthly usage</span>
        <span className={cn("font-semibold", atLimit ? "text-red-600" : "text-slate-800")}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            atLimit ? "bg-red-500" : "bg-teal-500"
          )}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">repurposes this month</span>
        <Link
          href="/upgrade"
          className="text-[11px] font-medium text-teal-600 hover:text-teal-700"
        >
          Upgrade →
        </Link>
      </div>
    </div>
  );
}

export function DashboardShell({ children, user, usage }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-14 items-center border-b border-slate-200 px-5">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-slate-900">
            Repurpose<span className="text-teal-600">One</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="space-y-3 border-t border-slate-200 p-4">
          <UsageIndicator usage={usage} />
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              {user.email ? (
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              ) : null}
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight text-slate-900 md:hidden"
            >
              Repurpose<span className="text-teal-600">One</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <UsageIndicator usage={usage} compact />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-slate-700"
              aria-label="Notifications"
              onClick={() => {
                // TODO: connect notifications panel
              }}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <div className="hidden items-center gap-2 sm:flex">
              <UserAvatar user={user} size="sm" />
              <span className="max-w-[140px] truncate text-sm font-medium text-slate-700">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 [&:has(.max-w-screen-md)]:p-0">{children}</main>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                Repurpose<span className="text-teal-600">One</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </nav>

            <div className="space-y-3 border-t border-slate-200 p-4">
              <UsageIndicator usage={usage} />
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <UserAvatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                  {user.email ? (
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  ) : null}
                </div>
              </div>
              <SignOutButton />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
