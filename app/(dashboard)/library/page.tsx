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
import { deriveSourceTitle } from "@/lib/source-title";
import { formatLabel } from "@/lib/format-output";
import {
  parseLibraryFormatFilter,
  parseLibrarySearchQuery,
} from "@/lib/repurpose/library-search";
import LibraryFormatFilter from "./_components/LibraryFormatFilter";
import LibrarySearchBar from "./_components/LibrarySearchBar";
import {
  LibraryBulkFlatList,
  type FlatLibraryItem,
} from "./_components/LibraryBulkFlatList";
import {
  LIBRARY_PAGE_SIZE,
  LibraryPagination,
  clampLibraryPage,
} from "./_components/LibraryPagination";
import type { TargetFormat } from "@/types";

interface SourceGroupIndex {
  sourceHash: string;
  latestCreatedAt: string;
  formats: TargetFormat[];
  repurposeCount: number;
}

interface SourceGroupCard extends SourceGroupIndex {
  title: string;
  preview: string;
}

function sourcePreview(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "No preview";
  return trimmed.length > 140 ? `${trimmed.slice(0, 140).trimEnd()}…` : trimmed;
}

function buildBaseQuery(formatFilter: string | null, searchQuery: string | null) {
  const params = new URLSearchParams();
  if (formatFilter) params.set("format", formatFilter);
  if (searchQuery) params.set("q", searchQuery);
  return params.toString();
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; q?: string; page?: string }>;
}) {
  const {
    format: formatParam,
    q: qParam,
    page: pageParam,
  } = await searchParams;
  const formatFilter = parseLibraryFormatFilter(formatParam);
  const searchQuery = parseLibrarySearchQuery(qParam);
  const useFlatList = Boolean(formatFilter || searchQuery);
  const baseQuery = buildBaseQuery(formatFilter, searchQuery);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let sourceGroups: SourceGroupCard[] = [];
  let flatItems: FlatLibraryItem[] = [];
  let page = 1;
  let totalPages = 1;
  let totalItems = 0;

  if (useFlatList) {
    let countQuery = supabase
      .from("repurposes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "complete");
    if (formatFilter) countQuery = countQuery.eq("target_format", formatFilter);
    if (searchQuery) {
      countQuery = countQuery.ilike("input_content", `%${searchQuery}%`);
    }
    const { count } = await countQuery;
    totalItems = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalItems / LIBRARY_PAGE_SIZE));
    page = clampLibraryPage(pageParam, totalPages);

    if (totalItems > 0) {
      const from = (page - 1) * LIBRARY_PAGE_SIZE;
      const to = from + LIBRARY_PAGE_SIZE - 1;
      // Flat page rows - source_hash before input_content so the old heavy
      // contiguous select string cannot reappear.
      let rowsQuery = supabase
        .from("repurposes")
        .select(
          "id, target_format, created_at, source_hash, input_content, output, user_workflow_status"
        )
        .eq("user_id", user.id)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (formatFilter) {
        rowsQuery = rowsQuery.eq("target_format", formatFilter);
      }
      if (searchQuery) {
        rowsQuery = rowsQuery.ilike("input_content", `%${searchQuery}%`);
      }
      const { data } = await rowsQuery;
      flatItems = (data ?? []) as FlatLibraryItem[];
    }
  } else {
    // Paginated group index via RPCs - never loads full history into Node.
    // Preview comes from the list RPC (per-hash latest input_content) so a
    // global hydrate LIMIT cannot starve later groups.
    const { data: groupCount, error: countError } = await supabase.rpc(
      "count_library_source_groups",
      { p_user_id: user.id }
    );

    if (countError) {
      console.error("count_library_source_groups failed:", countError);
    }

    totalItems = typeof groupCount === "number" ? groupCount : Number(groupCount) || 0;
    totalPages = Math.max(1, Math.ceil(totalItems / LIBRARY_PAGE_SIZE));
    page = clampLibraryPage(pageParam, totalPages);

    const offset = (page - 1) * LIBRARY_PAGE_SIZE;
    const { data: groupRows, error: groupError } = await supabase.rpc(
      "list_library_source_groups",
      {
        p_user_id: user.id,
        p_limit: LIBRARY_PAGE_SIZE,
        p_offset: offset,
      }
    );

    if (groupError) {
      console.error("list_library_source_groups failed:", groupError);
    }

    type GroupRpcRow = {
      source_hash: string;
      latest_created_at: string;
      formats: TargetFormat[];
      repurpose_count: number;
      preview_content: string | null;
    };

    sourceGroups = ((groupRows ?? []) as GroupRpcRow[]).map((row) => {
      const content = row.preview_content ?? "";
      return {
        sourceHash: row.source_hash,
        latestCreatedAt: row.latest_created_at,
        formats: row.formats ?? [],
        repurposeCount: row.repurpose_count,
        title: deriveSourceTitle(content),
        preview: sourcePreview(content),
      };
    });
  }

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
    return "No History Yet";
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
        description="Your sources and platform outputs - open one to review, copy, or reuse in Studio."
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
        totalItems === 0 ? (
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
          <>
            <LibraryBulkFlatList items={flatItems} />
            <LibraryPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={LIBRARY_PAGE_SIZE}
              itemLabel="results"
              baseQuery={baseQuery}
            />
          </>
        )
      ) : totalItems === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No History Yet</CardTitle>
            <CardDescription>
              When you generate in Studio, each source and its platform outputs
              land here - ready to review, copy, or reuse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/studio">Create your first repurpose</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {sourceGroups.map((group) => (
              <Link
                key={group.sourceHash}
                href={`/library/${group.sourceHash}`}
                className="block"
                style={{
                  viewTransitionName: `vo-source-${group.sourceHash}`,
                }}
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
          <LibraryPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={LIBRARY_PAGE_SIZE}
            itemLabel="sources"
            baseQuery={baseQuery}
          />
        </>
      )}
    </div>
  );
}
