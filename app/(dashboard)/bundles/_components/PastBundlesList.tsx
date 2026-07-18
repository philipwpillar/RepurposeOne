import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export interface PastBundleItem {
  id: string;
  title: string | null;
  context: string | null;
  status: string;
  createdAt: string;
  assetCount: number;
  sourceHash: string | null;
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
                    {format(new Date(bundle.createdAt), "d MMM yyyy")} ·{" "}
                    {bundle.assetCount} photo
                    {bundle.assetCount === 1 ? "" : "s"} · {bundle.status}
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
