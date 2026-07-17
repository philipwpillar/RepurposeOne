import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XThreadOutputDisplay } from "@/components/repurpose/x-thread-output";
import { LinkedInOutputPanel } from "@/components/repurpose/linkedin-output-panel";
import { InstagramOutputPanel } from "@/components/repurpose/instagram-output-panel";
import { EmailOutputPanel } from "@/components/repurpose/email-output-panel";
import { formatLabel } from "@/lib/format-output";
import type { RepurposeOutput, UserRating } from "@/types";

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

  const feedbackProps = {
    repurposeId: repurpose.id as string,
    initialRating,
    initialUserOutput,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/library/${hash}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to source
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Repurpose detail</h1>
          <Badge variant="secondary">
            {formatLabel(repurpose.target_format)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Created {format(new Date(repurpose.created_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Source content
        </p>
        <p className="whitespace-pre-wrap text-sm">{repurpose.input_content}</p>
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
