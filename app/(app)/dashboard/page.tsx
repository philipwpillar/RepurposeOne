import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { XThreadOutput } from "@/types";

function formatLabel(targetFormat: string): string {
  if (targetFormat === "x_thread") return "X Thread";
  return targetFormat;
}

function getPreview(output: XThreadOutput | null): string {
  if (!output?.tweets?.length) return "No preview available";
  return output.tweets[0].text;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { usage } = await checkUsageLimit(supabase, user.id);

  const { data: recent } = await supabase
    .from("repurposes")
    .select("id, target_format, output, created_at")
    .eq("user_id", user.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(5);

  const atLimit = usage.used >= usage.limit;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Turn one piece of content into platform-native outputs.
          </p>
        </div>
        <Button asChild size="lg" disabled={atLimit}>
          <Link href={atLimit ? "/upgrade" : "/new"}>
            <Plus />
            New Repurpose
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan</CardDescription>
            <CardTitle className="capitalize">{usage.plan}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Used this month</CardDescription>
            <CardTitle>
              {usage.used} / {usage.limit}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle>{Math.max(0, usage.limit - usage.used)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {atLimit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <p className="text-sm text-amber-950">
              You&apos;ve used all your repurposes this month. Upgrade to keep
              creating.
            </p>
            <Button asChild>
              <Link href="/upgrade">Upgrade plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent repurposes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {!recent?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No repurposes yet. Create your first one!
              </p>
              <Button asChild className="mt-4">
                <Link href="/new">Get started</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recent.map((item) => (
              <Link key={item.id} href={`/history/${item.id}`}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary">
                          {formatLabel(item.target_format)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="truncate text-sm">
                        {getPreview(item.output as XThreadOutput | null)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
