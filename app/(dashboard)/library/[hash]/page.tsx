import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    .select("id, target_format, output, created_at, input_content, user_workflow_status")
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
          Back to all sources
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {repurposes.length} repurpose{repurposes.length === 1 ? "" : "s"} from this source
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Source content
        </p>
        <p className="whitespace-pre-wrap text-sm">
          {repurposes[0].input_content}
        </p>
      </div>

      <div className="space-y-3">
        {repurposes.map((item) => (
          <Link key={item.id} href={`/library/${hash}/${item.id}`}>
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
                      {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {getPreview(item.output as RepurposeOutput | null)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
