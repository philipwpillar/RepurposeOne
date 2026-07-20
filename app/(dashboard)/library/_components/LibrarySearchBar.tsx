"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function LibrarySearchBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const commit = useCallback(
    (nextQ: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = nextQ.trim();
      if (trimmed.length >= 2) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        commit(value);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim() !== urlQ.trim()) commit(value);
        }}
        placeholder="Search source content…"
        aria-label="Search source content"
        className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={isPending}
      />
    </form>
  );
}
