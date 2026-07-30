import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VIDEO_BUNDLES_DEV =
  process.env.NEXT_PUBLIC_VIDEO_BUNDLES_DEV === "true";

export interface PastBundleItem {
  id: string;
  title: string | null;
  context: string | null;
  status: string;
  createdAt: string;
  photoCount: number;
  videoCount: number;
  sourceHash: string | null;
}

function assetSummary(photoCount: number, videoCount: number): string | null {
  if (photoCount === 0 && videoCount === 0) return null;
  const parts: string[] = [];
  if (photoCount > 0) {
    parts.push(`${photoCount} photo${photoCount === 1 ? "" : "s"}`);
  }
  if (videoCount > 0) {
    parts.push(`${videoCount} video${videoCount === 1 ? "" : "s"}`);
  }
  return parts.join(", ");
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "analyzing":
      return "Analyzing";
    case "rendering":
      return "Rendering";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function statusVariant(
  status: string
): "secondary" | "outline" | "destructive" | "default" {
  if (status === "complete") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

interface PastBundlesListProps {
  bundles: PastBundleItem[];
}

export default function PastBundlesList({ bundles }: PastBundlesListProps) {
  if (!bundles.length) {
    return (
      <section className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">Past bundles</h2>
        <p className="text-sm text-muted-foreground">
          Completed packs appear here. Open posts in the Library to copy, edit,
          or reuse.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Past bundles</h2>
        <p className="text-sm text-muted-foreground">
          Job history - open complete packs in the Library. In-progress jobs keep
          updating if you leave and return.
        </p>
      </div>

      <ul className="space-y-2">
        {bundles.map((bundle) => {
          const label =
            bundle.title?.trim() ||
            (bundle.context
              ? bundle.context.slice(0, 80) +
                (bundle.context.length > 80 ? "…" : "")
              : "Untitled bundle");
          const summary = assetSummary(bundle.photoCount, bundle.videoCount);
          const isFailed = bundle.status === "failed";
          const isInFlight =
            bundle.status === "pending" ||
            bundle.status === "analyzing" ||
            bundle.status === "rendering";
          const showClipsLink =
            VIDEO_BUNDLES_DEV &&
            bundle.videoCount > 0 &&
            bundle.status === "complete";

          return (
            <li
              key={bundle.id}
              className="rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {label}
                    </p>
                    <Badge variant={statusVariant(bundle.status)}>
                      {statusLabel(bundle.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(bundle.createdAt), "d MMM yyyy")}
                    {summary ? ` · ${summary}` : ""}
                  </p>
                  {isInFlight ? (
                    <p className="text-xs text-muted-foreground">
                      Still processing - refresh this page to check status.
                    </p>
                  ) : null}
                  {isFailed ? (
                    <p className="text-xs text-destructive">
                      This run failed and wasn&apos;t billed. Create a new pack
                      above to retry.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  {showClipsLink ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bundles?clipBundle=${bundle.id}`}>
                        Clips
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                  {bundle.sourceHash ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/library/${bundle.sourceHash}`}>
                        Library
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {isInFlight ? "Working…" : "No posts yet"}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
