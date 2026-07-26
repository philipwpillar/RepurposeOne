import Link from "next/link";
import { cn } from "@/lib/utils";

type LibraryPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  /** Query string without leading `?`, excluding page (format, q, etc.). */
  baseQuery: string;
};

function hrefForPage(baseQuery: string, page: number): string {
  const params = new URLSearchParams(baseQuery);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/library?${qs}` : "/library";
}

/**
 * Server-rendered Prev/Next. Disabled controls are <span>, never asChild Link.
 */
export function LibraryPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel,
  baseQuery,
}: LibraryPaginationProps) {
  if (totalItems <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const prevHref = hrefForPage(baseQuery, page - 1);
  const nextHref = hrefForPage(baseQuery, page + 1);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label="Library pagination"
      className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        {canPrev ? (
          <Link
            href={prevHref}
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-border px-3 text-sm font-medium text-muted-foreground opacity-50"
          >
            Previous
          </span>
        )}
        {canNext ? (
          <Link
            href={nextHref}
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/40"
          >
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              "inline-flex h-9 cursor-not-allowed items-center rounded-md border border-border px-3 text-sm font-medium text-muted-foreground opacity-50"
            )}
          >
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

/** Parse ?page=; unparseable / &lt;1 → 1; then cap at lastPage (≥1). */
export function clampLibraryPage(
  raw: string | undefined,
  lastPage: number
): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  const safe = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  const cap = Math.max(1, lastPage);
  return Math.min(safe, cap);
}

export const LIBRARY_PAGE_SIZE = 20;
