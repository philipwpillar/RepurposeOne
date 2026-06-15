import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XThreadOutputDisplay } from "@/components/repurpose/x-thread-output";
import type { XThreadOutput } from "@/types";

interface HistoryDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatLabel(targetFormat: string): string {
  if (targetFormat === "x_thread") return "X Thread";
  return targetFormat;
}

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { id } = await params;
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

  const output = repurpose.output as XThreadOutput;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/history">
            <ArrowLeft className="h-4 w-4" />
            Back to history
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
        <XThreadOutputDisplay output={output} repurposeId={repurpose.id} />
      )}
    </div>
  );
}
