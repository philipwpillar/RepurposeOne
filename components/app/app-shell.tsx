"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UsageInfo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/app/sign-out-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New Repurpose" },
  { href: "/history", label: "History" },
];

interface AppShellProps {
  children: React.ReactNode;
  usage: UsageInfo;
}

function planLabel(plan: UsageInfo["plan"]): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function AppShell({ children, usage }: AppShellProps) {
  const pathname = usePathname();
  const atLimit = usage.used >= usage.limit;
  const usagePercent = Math.min(100, (usage.used / usage.limit) * 100);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            RepurposeOne
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-4 border-t border-border p-4">
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {planLabel(usage.plan)} plan
              </span>
              <Badge variant={atLimit ? "destructive" : "secondary"}>
                {usage.used} / {usage.limit}
              </Badge>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  atLimit ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              repurposes this month
            </p>
            <Button asChild size="sm" className="w-full" variant={atLimit ? "default" : "outline"}>
              <Link href="/upgrade">Upgrade</Link>
            </Button>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-card md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" className="text-lg font-bold">
              RepurposeOne
            </Link>
            <Badge variant={atLimit ? "destructive" : "secondary"}>
              {usage.used}/{usage.limit}
            </Badge>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
