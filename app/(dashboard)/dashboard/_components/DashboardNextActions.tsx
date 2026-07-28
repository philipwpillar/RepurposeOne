import Link from "next/link";
import { AlertTriangle, ArrowRight, Mic, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { planLabel } from "@/lib/plan-label";
import type { Plan } from "@/types";

export type NextActionKind =
  | "payment_failed"
  | "at_limit"
  | "setup_voice"
  | "try_studio"
  | "create"
  | "review";

export type DashboardNextAction = {
  kind: NextActionKind;
  title: string;
  description: string;
  href: string;
  cta: string;
  tone?: "default" | "warning" | "destructive";
};

type DashboardNextActionsProps = {
  actions: DashboardNextAction[];
  plan: Plan;
  used: number;
  limit: number;
  remaining: number;
  resetsOn: string;
  bundleUsed?: number | null;
  bundleLimit?: number | null;
};

function toneClasses(tone: DashboardNextAction["tone"]) {
  if (tone === "destructive") {
    return "border-destructive/30 bg-destructive/5";
  }
  if (tone === "warning") {
    return "border-amber-500/30 bg-amber-500/10";
  }
  return "border-primary/20 bg-primary/5";
}

function ActionIcon({ kind }: { kind: NextActionKind }) {
  if (kind === "payment_failed") {
    return <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />;
  }
  if (kind === "at_limit") {
    return <Zap className="h-4 w-4 text-amber-700" aria-hidden />;
  }
  if (kind === "setup_voice") {
    return <Mic className="h-4 w-4 text-primary" aria-hidden />;
  }
  return <Sparkles className="h-4 w-4 text-primary" aria-hidden />;
}

export function DashboardNextActions({
  actions,
  plan,
  used,
  limit,
  remaining,
  resetsOn,
  bundleUsed = null,
  bundleLimit = null,
}: DashboardNextActionsProps) {
  const primary = actions[0];
  const secondary = actions.slice(1, 3);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{planLabel(plan)}</span>
            <span className="text-muted-foreground">
              {" "}
              · {used} / {limit} generations · {remaining} remaining
            </span>
          </p>
          <p className="text-xs text-muted-foreground">Resets {resetsOn}</p>
        </div>
        {bundleUsed !== null && bundleLimit !== null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Moment Bundles {bundleUsed} / {bundleLimit} this month
          </p>
        ) : null}
      </div>

      {primary ? (
        <div
          className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${toneClasses(primary.tone)}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <ActionIcon kind={primary.kind} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {primary.title}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {primary.description}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href={primary.href}>
              {primary.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {secondary.map((action) => (
            <Link
              key={action.kind}
              href={action.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 text-sm transition-colors hover:bg-muted/40"
            >
              <span className="font-medium text-foreground">{action.title}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function buildDashboardNextActions(input: {
  paymentFailed: boolean;
  atLimit: boolean;
  hasVoice: boolean;
  hasRecent: boolean;
  onboardingComplete: boolean;
}): DashboardNextAction[] {
  const actions: DashboardNextAction[] = [];

  if (input.paymentFailed) {
    actions.push({
      kind: "payment_failed",
      title: "Update your payment method",
      description:
        "Your latest payment failed. Fix billing to avoid interruption.",
      href: "/account#billing",
      cta: "Open billing",
      tone: "destructive",
    });
  }

  if (input.atLimit) {
    actions.push({
      kind: "at_limit",
      title: "You've used this month's generations",
      description: "Upgrade to keep creating, or wait until usage resets.",
      href: "/account#plans",
      cta: "View plans",
      tone: "warning",
    });
  }

  if (!input.hasVoice) {
    actions.push({
      kind: "setup_voice",
      title: "Set up Brand Voice",
      description:
        "Teach Voiceora how you write so every output sounds like you.",
      href: "/brand-voice",
      cta: "Create voice",
    });
  }

  if (!input.hasRecent && input.onboardingComplete) {
    actions.push({
      kind: "try_studio",
      title: "Try Studio with an example",
      description: "See drafts for X, LinkedIn, Instagram, and email from one piece of content.",
      href: "/studio?example=1",
      cta: "Try it now",
    });
  } else if (!input.atLimit) {
    actions.push({
      kind: "create",
      title: "Create in Studio",
      description: "Paste source content and generate platform-native drafts.",
      href: "/studio",
      cta: "New repurpose",
    });
  }

  if (input.hasRecent) {
    actions.push({
      kind: "review",
      title: "Review recent work",
      description: "Open Library to copy, edit, or reuse a past source.",
      href: "/library",
      cta: "Open Library",
    });
  }

  // Dedupe by kind while preserving priority order
  const seen = new Set<NextActionKind>();
  return actions.filter((action) => {
    if (seen.has(action.kind)) return false;
    seen.add(action.kind);
    return true;
  });
}
