import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatLabel, getOutputPreview } from "@/lib/format-output";
import { deriveSourceTitle } from "@/lib/source-title";
import {
  parseLibraryFormatFilter,
  parseLibrarySearchQuery,
} from "@/lib/repurpose/library-search";
import LibraryFormatFilter from "./_components/LibraryFormatFilter";
import LibrarySearchBar from "./_components/LibrarySearchBar";
import { WorkflowStatusBadge } from "@/components/repurpose/workflow-status-badge";
import type { RepurposeOutput, TargetFormat, UserWorkflowStatus } from "@/types";

interface SourceGroup {
  sourceHash: string;
  title: string;
  preview: string;
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

function sourcePreview(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "No preview";
  return trimmed.length > 140 ? `${trimmed.slice(0, 140).trimEnd()}…` : trimmed;
}

export default async function LibraryPage({
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
          preview: sourcePreview(item.input_content),
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
      <PageHeader
        title="Library"
        description="Your sources and platform outputs — open one to review, copy, or reuse in Studio."
        actions={
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link href="/studio">New in Studio</Link>
          </Button>
        }
      />

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
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/library">Clear filters</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                <Link href="/studio">Open Studio</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((item) => (
              <Link
                key={item.id}
                href={`/library/${item.source_hash}/${item.id}`}
                className="block"
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
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {deriveSourceTitle(item.input_content)}
                      </p>
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
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
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
              When you generate in Studio, each source and its platform outputs
              land here — ready to review, copy, or reuse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/studio">Create your first repurpose</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sourceGroups.map((group) => (
            <Link
              key={group.sourceHash}
              href={`/library/${group.sourceHash}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {group.title}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {group.preview}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {group.formats.map((targetFormat) => (
                        <Badge key={targetFormat} variant="secondary">
                          {formatLabel(targetFormat)}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.repurposeCount}{" "}
                      output{group.repurposeCount === 1 ? "" : "s"} · last
                      updated{" "}
                      {format(
                        new Date(group.latestCreatedAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
