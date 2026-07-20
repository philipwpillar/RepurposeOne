import { Suspense } from "react";
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
import { formatLabel, getOutputPreview } from "@/lib/format-output";
import { deriveSourceTitle } from "@/lib/source-title";
import {
  parseLibrarySearchQuery,
} from "@/lib/repurpose/library-search";
import LibraryFormatFilter, {
  parseLibraryFormatFilter,
} from "./_components/LibraryFormatFilter";
import LibrarySearchBar from "./_components/LibrarySearchBar";
import { WorkflowStatusBadge } from "@/components/repurpose/workflow-status-badge";
import type { RepurposeOutput, TargetFormat, UserWorkflowStatus } from "@/types";

interface SourceGroup {
  sourceHash: string;
  title: string;
  latestCreatedAt: string;
  formats: TargetFormat[];
  repurposeCount: number;
}

type LibraryRow = {
  id: string;
  target_format: TargetFormat;
  created_at: string;
  input_content: string;
  source_hash: string | null;
  output: unknown;
  user_workflow_status: UserWorkflowStatus | null;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; q?: string }>;
}) {
  const { format: formatParam, q: qParam } = await searchParams;
  const formatFilter = parseLibraryFormatFilter(formatParam);
  const searchQuery = parseLibrarySearchQuery(qParam);
  const useFlatList = Boolean(formatFilter || searchQuery);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let query = supabase
    .from("repurposes")
    .select(
      "id, target_format, created_at, input_content, source_hash, output, user_workflow_status"
    )
    .eq("user_id", user.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  if (formatFilter) {
    query = query.eq("target_format", formatFilter);
  }
  if (searchQuery) {
    query = query.ilike("input_content", `%${searchQuery}%`);
  }

  const { data: repurposes } = await query;
  const rows = (repurposes ?? []) as LibraryRow[];

  const groups = new Map<string, SourceGroup>();

  if (!useFlatList) {
    for (const item of rows) {
      const hash = item.source_hash;
      if (!hash) continue;

      const existing = groups.get(hash);
      if (existing) {
        existing.repurposeCount += 1;
        if (!existing.formats.includes(item.target_format)) {
          existing.formats.push(item.target_format);
        }
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
  }

  const sourceGroups = Array.from(groups.values());

  const emptyFilterTitle = (() => {
    if (formatFilter && searchQuery) {
      return `No ${formatLabel(formatFilter)} matches for “${searchQuery}”`;
    }
    if (searchQuery) {
      return `No matches for “${searchQuery}”`;
    }
    if (formatFilter) {
      return `No ${formatLabel(formatFilter)} outputs yet`;
    }
    return "No history yet";
  })();

  const emptyFilterDescription = searchQuery
    ? "Try a different search term, clear search, or switch format."
    : formatFilter
      ? "Generate content in Studio or switch back to All to browse by source."
      : "Completed repurposes will appear here.";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Your source content — click into one to see everything generated from it.
        </p>
      </div>

      <Suspense fallback={null}>
        <div className="space-y-3">
          <LibrarySearchBar />
          <LibraryFormatFilter />
        </div>
      </Suspense>

      {useFlatList ? (
        !rows.length ? (
          <Card>
            <CardHeader>
              <CardTitle>{emptyFilterTitle}</CardTitle>
              <CardDescription>{emptyFilterDescription}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((item) => (
              <Link
                key={item.id}
                href={`/library/${item.source_hash}/${item.id}`}
              >
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {formatLabel(item.target_format)}
                        </Badge>
                        <WorkflowStatusBadge
                          status={item.user_workflow_status}
                        />
                        <p className="text-sm font-medium">
                          {deriveSourceTitle(item.input_content)}
                        </p>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.output
                          ? getOutputPreview(item.output as RepurposeOutput)
                          : "No preview available"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(item.created_at),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : !sourceGroups.length ? (
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
                      {group.repurposeCount}{" "}
                      repurpose{group.repurposeCount === 1 ? "" : "s"} · last
                      updated{" "}
                      {format(
                        new Date(group.latestCreatedAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
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
