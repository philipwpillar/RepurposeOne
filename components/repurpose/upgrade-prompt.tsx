import type { UsageInfo } from "@/types";
import { getUpgradeMessage } from "@/lib/usage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface UpgradePromptProps {
  usage: UsageInfo;
  upgradeMessage?: string;
}

export function UpgradePrompt({ usage, upgradeMessage }: UpgradePromptProps) {
  const message = upgradeMessage ?? getUpgradeMessage(usage.plan);

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <CardTitle className="text-xl">You&apos;ve hit your monthly limit</CardTitle>
        <CardDescription className="text-amber-900/80">
          {usage.used} of {usage.limit} repurposes used on your{" "}
          {usage.plan} plan this month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-amber-950/90">{message}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/upgrade">Upgrade now</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/history">View past repurposes</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
