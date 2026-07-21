import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

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

interface PastBundlesListProps {
  bundles: PastBundleItem[];
}

export default function PastBundlesList({ bundles }: PastBundlesListProps) {
  if (!bundles.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Past bundles</h2>
        <p className="text-sm text-muted-foreground">
          Recent Moment Bundles — open posts in the Library to copy, share, or
          edit.
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

          return (
            <li
              key={bundle.id}
              className="rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(bundle.createdAt), "d MMM yyyy")}
                    {summary ? ` · ${summary}` : ""} · {bundle.status}
                  </p>
                </div>
                {bundle.sourceHash ? (
                  <Link
                    href={`/library/${bundle.sourceHash}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Library
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">No posts</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
