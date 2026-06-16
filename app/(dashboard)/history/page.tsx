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
import type { XThreadOutput } from "@/types";

function formatLabel(targetFormat: string): string {
  if (targetFormat === "x_thread") return "X Thread";
  return targetFormat;
}

function getPreview(output: XThreadOutput | null): string {
  if (!output?.tweets?.length) return "No preview available";
  const first = output.tweets[0].text;
  return first.length > 120 ? `${first.slice(0, 120)}…` : first;
}

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: repurposes } = await supabase
    .from("repurposes")
    .select("id, target_format, output, created_at, input_content")
    .eq("user_id", user.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Your completed repurposes — click to view full output.
        </p>
      </div>

      {!repurposes?.length ? (
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
          {repurposes.map((item) => (
            <Link key={item.id} href={`/history/${item.id}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {formatLabel(item.target_format)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {getPreview(item.output as XThreadOutput | null)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Source: {item.input_content.slice(0, 80)}…
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
