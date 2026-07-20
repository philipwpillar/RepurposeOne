"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { TargetFormat } from "@/types";

const FILTER_OPTIONS: Array<{ value: "all" | TargetFormat; label: string }> = [
  { value: "all", label: "All" },
  { value: "x_thread", label: "X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
];

export function parseLibraryFormatFilter(
  value: string | undefined
): TargetFormat | null {
  if (
    value === "x_thread" ||
    value === "linkedin" ||
    value === "instagram" ||
    value === "email"
  ) {
    return value;
  }
  return null;
}

function hrefForFormat(
  pathname: string,
  searchParams: URLSearchParams,
  format: "all" | TargetFormat
): string {
  const params = new URLSearchParams(searchParams.toString());
  if (format === "all") {
    params.delete("format");
  } else {
    params.set("format", format);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export default function LibraryFormatFilter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("format") ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((option) => {
        const href = hrefForFormat(pathname, searchParams, option.value);

        return (
          <Link
            key={option.value}
            href={href}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40"
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
