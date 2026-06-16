import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
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
import { XThreadOutputDisplay } from "@/components/repurpose/x-thread-output";
import { formatLabel } from "@/lib/format-output";
import type { RepurposeOutput } from "@/types";

interface HistoryDetailPageProps {
  params: Promise<{ id: string }>;
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

  const output = repurpose.output as RepurposeOutput | null;

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

      {output?.format === "linkedin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">LinkedIn post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm">{output.post}</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Carousel slides</p>
              {output.carousel_slides.map((slide) => (
                <div key={slide.number} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{slide.title}</p>
                  {slide.body && <p className="mt-1 text-muted-foreground">{slide.body}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {output?.format === "instagram" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instagram caption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm">{output.caption}</p>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Hook variations</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {output.hook_variations.map((hook, i) => (
                  <li key={i}>{hook}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-teal-700">
              {output.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}
            </p>
          </CardContent>
        </Card>
      )}

      {output?.format === "email" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email newsletter</CardTitle>
            <CardDescription>{output.subject_line}</CardDescription>
          </CardHeader>
          <CardContent>
            {output.preview_text && (
              <p className="mb-3 text-sm text-muted-foreground">
                Preview: {output.preview_text}
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm">{output.body}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
