import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLabel } from "@/lib/format-output";
import { deriveSourceTitle } from "@/lib/source-title";
import type { TargetFormat } from "@/types";

interface SourceGroup {
  sourceHash: string;
  title: string;
  latestCreatedAt: string;
  formats: TargetFormat[];
  repurposeCount: number;
}

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: repurposes } = await supabase
    .from("repurposes")
    .select("id, target_format, created_at, input_content, source_hash")
    .eq("user_id", user.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  const groups = new Map<string, SourceGroup>();

  for (const item of repurposes ?? []) {
    const hash = item.source_hash;
    if (!hash) continue; // defensive — column is always set by the DB

    const existing = groups.get(hash);
    if (existing) {
      existing.repurposeCount += 1;
      if (!existing.formats.includes(item.target_format)) {
        existing.formats.push(item.target_format);
      }
      // Rows arrive newest-first, so the first row seen per hash already
      // carries the latest created_at — nothing further to compare.
    } else {
      groups.set(hash, {
        sourceHash: hash,
        title: deriveSourceTitle(item.input_content),
        latestCreatedAt: item.created_at,
        formats: [item.target_format],
        repurposeCount: 1,
      });
    }
  }

  const sourceGroups = Array.from(groups.values());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Your source content — click into one to see everything generated from it.
        </p>
      </div>

      {!sourceGroups.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No history yet</CardTitle>
            <CardDescription>
              Completed repurposes will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/studio"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create your first repurpose →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sourceGroups.map((group) => (
            <Link key={group.sourceHash} href={`/library/${group.sourceHash}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium">{group.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {group.formats.map((targetFormat) => (
                        <Badge key={targetFormat} variant="secondary">
                          {formatLabel(targetFormat)}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.repurposeCount} repurpose{group.repurposeCount === 1 ? "" : "s"} ·
                      last updated{" "}
                      {format(new Date(group.latestCreatedAt), "MMM d, yyyy 'at' h:mm a")}
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
  );
}
