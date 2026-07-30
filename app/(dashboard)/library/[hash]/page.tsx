import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ReuseInStudioButton } from "@/components/library/reuse-in-studio-button";
import { formatLabel, getOutputPreview } from "@/lib/format-output";
import { deriveSourceTitle } from "@/lib/source-title";
import { WorkflowStatusBadge } from "@/components/repurpose/workflow-status-badge";
import type { RepurposeOutput, UserWorkflowStatus } from "@/types";

interface SourceGroupPageProps {
  params: Promise<{ hash: string }>;
}

function getPreview(output: RepurposeOutput | null): string {
  if (!output) return "No preview available";
  return getOutputPreview(output);
}

export default async function SourceGroupPage({
  params,
}: SourceGroupPageProps) {
  const { hash } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: repurposes } = await supabase
    .from("repurposes")
    .select(
      "id, target_format, output, created_at, input_content, user_workflow_status"
    )
    .eq("user_id", user.id)
    .eq("source_hash", hash)
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  if (!repurposes?.length) {
    notFound();
  }

  const title = deriveSourceTitle(repurposes[0].input_content);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/library">
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>
      </Button>

      <div style={{ viewTransitionName: `vo-source-${hash}` }}>
        <PageHeader
          title={title}
          description={`${repurposes.length} output${repurposes.length === 1 ? "" : "s"} from this source. Reuse opens a new Studio run - history stays unchanged.`}
          actions={<ReuseInStudioButton sourceHash={hash} />}
        />
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Source content
        </p>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {repurposes[0].input_content}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Outputs</h2>
        {repurposes.map((item) => (
          <Link
            key={item.id}
            href={`/library/${hash}/${item.id}`}
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
                      status={
                        item.user_workflow_status as UserWorkflowStatus | null
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {format(
                        new Date(item.created_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {getPreview(item.output as RepurposeOutput | null)}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
