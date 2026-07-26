"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UsageInfo } from "@/types";
import {
  LayoutDashboard,
  Layers,
  Library,
  Menu,
  Mic,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { SignOutButton } from "@/components/app/sign-out-button";
import { PaymentFailedBanner } from "@/components/billing/payment-failed-banner";
import { Button } from "@/components/ui/button";
import { planLabel } from "@/lib/plan-label";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  email: string | undefined;
  name: string;
  avatarUrl: string | undefined;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Sparkles },
  { href: "/bundles", label: "Bundles", icon: Layers },
  { href: "/library", label: "Library", icon: Library },
  { href: "/brand-voice", label: "Brand Voice", icon: Mic },
  { href: "/account", label: "Account", icon: Settings },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function UserAvatar({ user, size = "md" }: { user: DashboardUser; size?: "sm" | "md" }) {
  const px = size === "sm" ? 32 : 36;
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt=""
        width={px}
        height={px}
        className={cn(sizeClass, "rounded-full object-cover ring-2 ring-background")}
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
      aria-hidden="true"
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full bg-primary/20 font-medium text-primary ring-2 ring-background"
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
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
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
  paymentFailed?: boolean;
}

function UsageIndicator({ usage, compact = false }: { usage: UsageInfo; compact?: boolean }) {
  const atLimit = usage.used >= usage.limit;
  const usagePercent = Math.min(100, (usage.used / usage.limit) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn("font-medium", atLimit ? "text-destructive" : "text-foreground")}
          title={`${planLabel(usage.plan)} · ${usage.used} of ${usage.limit} generations this month`}
        >
          {usage.used} / {usage.limit}
        </span>
        <Link
          href="/account#plans"
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary px-3 py-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Monthly usage</span>
        <span className={cn("font-semibold", atLimit ? "text-destructive" : "text-foreground")}>
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
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {planLabel(usage.plan)} · generations
        </span>
        <Link
          href="/account#plans"
          className="text-[11px] font-medium text-primary hover:text-primary/80"
        >
          Upgrade →
        </Link>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  user,
  usage,
  paymentFailed = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isFullBleed = pathname.startsWith("/studio");

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        className="chrome-dark hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex"
        aria-label="Primary"
      >
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link
            href="/dashboard"
            className="font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Voice<span className="text-primary">ora</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="App">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          <UsageIndicator usage={usage} />
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              {user.email ? (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="chrome-dark sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link
              href="/dashboard"
              className="font-display text-lg font-semibold tracking-tight text-foreground md:hidden"
            >
              Voice<span className="text-primary">ora</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <UsageIndicator usage={usage} compact />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <UserAvatar user={user} size="sm" />
              <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "flex-1 outline-none",
            isFullBleed ? "p-0" : "p-4 md:p-8"
          )}
        >
          {paymentFailed ? <PaymentFailedBanner /> : null}
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" id="mobile-nav">
          <button
            type="button"
            className="vo-fade-in absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className="vo-slide-in-left chrome-dark absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl"
            aria-label="Primary"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
                className="font-display text-lg font-semibold tracking-tight text-foreground"
              >
                Voice<span className="text-primary">ora</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="App">
              <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </nav>

            <div className="space-y-3 border-t border-border p-4">
              <UsageIndicator usage={usage} />
              <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
                <UserAvatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  {user.email ? (
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
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
