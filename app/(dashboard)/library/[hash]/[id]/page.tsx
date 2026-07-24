import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ReuseInStudioButton } from "@/components/library/reuse-in-studio-button";
import { XThreadOutputDisplay } from "@/components/repurpose/x-thread-output";
import { LinkedInOutputPanel } from "@/components/repurpose/linkedin-output-panel";
import { InstagramOutputPanel } from "@/components/repurpose/instagram-output-panel";
import { EmailOutputPanel } from "@/components/repurpose/email-output-panel";
import { formatLabel } from "@/lib/format-output";
import { WorkflowStatusControls } from "@/components/repurpose/workflow-status-controls";
import { VoiceAttributionBadge } from "@/components/repurpose/voice-attribution-badge";
import type { RepurposeOutput, UserRating, UserWorkflowStatus } from "@/types";

interface HistoryDetailPageProps {
  params: Promise<{ hash: string; id: string }>;
}

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { hash, id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: repurpose } = await supabase
    .from("repurposes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "complete")
    .single();

  if (!repurpose) {
    notFound();
  }

  const output = repurpose.output as RepurposeOutput | null;
  const initialUserOutput = (repurpose.user_output ??
    null) as RepurposeOutput | null;
  const initialRating = (repurpose.user_rating ?? null) as UserRating | null;
  const initialWorkflowStatus = (repurpose.user_workflow_status ??
    null) as UserWorkflowStatus | null;
  const initialEditedAt = (repurpose.edited_at ?? null) as string | null;

  const feedbackProps = {
    repurposeId: repurpose.id as string,
    initialRating,
    initialUserOutput,
    initialWorkflowStatus,
    initialEditedAt,
  };

  let voiceAttribution: {
    name: string | null;
    description: string | null;
    is_default: boolean;
    samples: string[] | null;
  } | null = null;

  if (repurpose.brand_voice_id) {
    const { data: voice } = await supabase
      .from("brand_voices")
      .select("name, description, is_default, samples")
      .eq("id", repurpose.brand_voice_id)
      .eq("user_id", user.id)
      .maybeSingle();
    voiceAttribution = voice;
  }

  const formatName = formatLabel(repurpose.target_format);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/library/${hash}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to source
          </Link>
        </Button>
        <ReuseInStudioButton sourceHash={hash} />
      </div>

      <PageHeader
        title={formatName}
        description={`Saved ${format(
          new Date(repurpose.created_at),
          "MMM d, yyyy 'at' h:mm a"
        )}. Preview, edit, and copy match Studio — edits save a draft on this row only.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatName}</Badge>
            <VoiceAttributionBadge voice={voiceAttribution} />
          </div>
        }
      />

      <WorkflowStatusControls
        repurposeId={repurpose.id as string}
        initialStatus={initialWorkflowStatus}
      />

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Source content
        </p>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {repurpose.input_content}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Platform preview
        </h2>
        <p className="text-xs text-muted-foreground">
          Same edit, save draft, and copy actions as Studio.
        </p>
      </div>

      {output?.format === "x_thread" && (
        <XThreadOutputDisplay output={output} {...feedbackProps} />
      )}

      {output?.format === "linkedin" && (
        <LinkedInOutputPanel
          output={output}
          variant="library"
          {...feedbackProps}
        />
      )}

      {output?.format === "instagram" && (
        <InstagramOutputPanel
          output={output}
          variant="library"
          {...feedbackProps}
        />
      )}

      {output?.format === "email" && (
        <EmailOutputPanel
          output={output}
          variant="library"
          {...feedbackProps}
        />
      )}
    </div>
  );
}
