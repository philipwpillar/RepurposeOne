"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Pin, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VoiceRule } from "@/types";

type EvidenceLink = {
  id: string;
  source_hash: string | null;
};

type Props = {
  brandVoiceId: string;
  disabled?: boolean;
};

export function VoiceLearnedPanel({ brandVoiceId, disabled }: Props) {
  const [rules, setRules] = useState<VoiceRule[]>([]);
  const [evidenceById, setEvidenceById] = useState<Record<string, EvidenceLink>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const loadRules = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("voice_rules")
      .select(
        "id, user_id, brand_voice_id, rule, evidence_ids, status, created_at"
      )
      .eq("brand_voice_id", brandVoiceId)
      .in("status", ["active", "pinned"])
      .order("created_at", { ascending: true });

    if (error) {
      // Table may not be applied yet - fail open with empty state.
      console.error("Load voice rules failed:", error);
      setRules([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as VoiceRule[];
    setRules(list);

    const ids = [...new Set(list.flatMap((r) => r.evidence_ids ?? []))];
    if (ids.length === 0) {
      setEvidenceById({});
      setLoading(false);
      return;
    }

    const { data: evidenceRows } = await supabase
      .from("repurposes")
      .select("id, source_hash")
      .in("id", ids);

    const map: Record<string, EvidenceLink> = {};
    for (const row of evidenceRows ?? []) {
      map[row.id as string] = {
        id: row.id as string,
        source_hash: (row.source_hash as string | null) ?? null,
      };
    }
    setEvidenceById(map);
    setLoading(false);
  }, [brandVoiceId]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  async function handleRefresh() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/brand-voice/${brandVoiceId}/learn/refresh`,
        { method: "POST" }
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        skipped_insufficient_evidence?: boolean;
        inserted?: number;
      };
      if (!res.ok) {
        toast.error(body.error || "Could not refresh learning");
        return;
      }
      if (body.skipped_insufficient_evidence) {
        toast.message(
          "Not enough edited drafts yet. Edit a few outputs, then refresh."
        );
      } else {
        toast.success(
          body.inserted
            ? `Updated - ${body.inserted} preference${body.inserted === 1 ? "" : "s"} learned`
            : "Refresh complete - no new recurring preferences"
        );
      }
      await loadRules();
    } catch {
      toast.error("Could not refresh learning");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(ruleId: string, status: "dismissed" | "pinned" | "active") {
    setBusy(true);
    try {
      const res = await fetch(`/api/brand-voice/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error || "Could not update rule");
        return;
      }
      await loadRules();
    } catch {
      toast.error("Could not update rule");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset() {
    setResetOpen(false);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/brand-voice/${brandVoiceId}/learn/reset`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error || "Could not reset learning");
        return;
      }
      toast.success("Learning reset");
      await loadRules();
    } catch {
      toast.error("Could not reset learning");
    } finally {
      setBusy(false);
    }
  }

  const locked = disabled || busy || loading;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          What Voiceora has learned
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={locked}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {rules.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
              disabled={locked}
              className="text-destructive hover:text-destructive/80"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Learned Preferences?</DialogTitle>
            <DialogDescription>
              Clear all learned preferences for this voice? Samples and
              description are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmReset()}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading preferences…</p>
      ) : rules.length === 0 ? (
        <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Preferences appear once you have edited a few drafts in this voice.
          Refresh after editing to derive them.
        </p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm"
            >
              <p className="text-foreground">
                {rule.status === "pinned" ? (
                  <span className="mr-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                    Pinned
                  </span>
                ) : null}
                {rule.rule}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {rule.evidence_ids.length} citation
                  {rule.evidence_ids.length === 1 ? "" : "s"}
                </span>
                {rule.evidence_ids.slice(0, 3).map((eid) => {
                  const ev = evidenceById[eid];
                  if (ev?.source_hash) {
                    return (
                      <Link
                        key={eid}
                        href={`/library/${ev.source_hash}/${eid}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        View output
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={eid}
                      href="/library"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Library
                    </Link>
                  );
                })}
                <span className="ml-auto flex gap-1">
                  {rule.status !== "pinned" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={locked}
                      onClick={() => void setStatus(rule.id, "pinned")}
                      title="Pin - survives re-derivation"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      Pin
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={locked}
                      onClick={() => void setStatus(rule.id, "active")}
                      title="Unpin"
                    >
                      Unpin
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive/80"
                    disabled={locked}
                    onClick={() => void setStatus(rule.id, "dismissed")}
                    title="Dismiss - will not return on refresh"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
