"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim() !== urlQ.trim()) commit(value);
        }}
        placeholder="Search source content…"
        aria-label="Search source content"
        className="bg-card pl-9 pr-10"
        disabled={isPending}
      />
      {urlQ || value.trim() ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            commit("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </form>
  );
}
