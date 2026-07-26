"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Mic, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { voiceDisplayName } from "@/lib/repurpose/voice-display-name";
import { BrandVoiceInputSchema, type BrandVoice } from "@/types";

const SAMPLE_FIELD_COUNT = 3;
const EMPTY_SAMPLES = () => Array.from({ length: SAMPLE_FIELD_COUNT }, () => "");
const VOICE_SELECT =
  "id, user_id, name, samples, description, is_default, created_at, updated_at";
const PENDING_DELETE_MS = 6000;

type PendingDelete = {
  voice: BrandVoice;
  timerId: ReturnType<typeof setTimeout>;
};

interface BrandVoiceManagerProps {
  initialVoices: BrandVoice[];
}

async function clearUserDefault(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { error } = await supabase
    .from("brand_voices")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (error) throw error;
}

function samplesToFields(samples: string[]): string[] {
  const fields = samples.slice(0, SAMPLE_FIELD_COUNT);
  while (fields.length < SAMPLE_FIELD_COUNT) {
    fields.push("");
  }
  return fields;
}

function buildValidatedInput(
  name: string,
  description: string,
  sampleFields: string[]
) {
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const trimmedSamples = sampleFields
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return BrandVoiceInputSchema.parse({
    name: trimmedName || undefined,
    description: trimmedDescription || undefined,
    samples: trimmedSamples.length > 0 ? trimmedSamples : undefined,
  });
}

function sortVoices(list: BrandVoice[]): BrandVoice[] {
  return [...list].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    const aTime = new Date(a.updated_at ?? a.created_at).getTime();
    const bTime = new Date(b.updated_at ?? b.created_at).getTime();
    return bTime - aTime;
  });
}

export function BrandVoiceManager({ initialVoices }: BrandVoiceManagerProps) {
  const router = useRouter();
  const [voices, setVoices] = useState(initialVoices);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sampleFields, setSampleFields] = useState<string[]>(EMPTY_SAMPLES);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const pendingDeletesRef = useRef<Map<string, PendingDelete>>(new Map());

  const resetForm = useCallback(() => {
    setFormMode(null);
    setEditingId(null);
    setName("");
    setDescription("");
    setSampleFields(EMPTY_SAMPLES());
    setSetAsDefault(false);
    setFormError(null);
  }, []);

  const openCreateForm = useCallback(() => {
    setActionError(null);
    setFormMode("create");
    setEditingId(null);
    setName("");
    setDescription("");
    setSampleFields(EMPTY_SAMPLES());
    setSetAsDefault(voices.length === 0);
    setFormError(null);
  }, [voices.length]);

  const openEditForm = useCallback((voice: BrandVoice) => {
    setActionError(null);
    setFormMode("edit");
    setEditingId(voice.id);
    setName(voice.name ?? "");
    setDescription(voice.description ?? "");
    setSampleFields(samplesToFields(voice.samples ?? []));
    setSetAsDefault(voice.is_default);
    setFormError(null);
  }, []);

  const refreshList = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleSave = async () => {
    setFormError(null);
    setActionError(null);
    setIsSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFormError("You must be signed in to save a brand voice.");
        return;
      }

      const validated = buildValidatedInput(name, description, sampleFields);
      if (!validated.name) {
        setFormError("Give this voice a short name (at least 2 characters).");
        return;
      }

      const payload = {
        name: validated.name,
        samples: validated.samples ?? [],
        description: validated.description ?? null,
      };

      if (formMode === "create") {
        if (setAsDefault) {
          await clearUserDefault(supabase, user.id);
        }

        const { data, error } = await supabase
          .from("brand_voices")
          .insert({
            user_id: user.id,
            ...payload,
            is_default: setAsDefault,
          })
          .select(VOICE_SELECT)
          .single();

        if (error) throw error;

        setVoices((prev) => {
          const next = setAsDefault
            ? prev.map((v) => ({ ...v, is_default: false }))
            : [...prev];
          return sortVoices([data as BrandVoice, ...next]);
        });
      } else if (formMode === "edit" && editingId) {
        if (setAsDefault) {
          await clearUserDefault(supabase, user.id);
        }

        const { data, error } = await supabase
          .from("brand_voices")
          .update({
            ...payload,
            is_default: setAsDefault,
          })
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select(VOICE_SELECT)
          .single();

        if (error) throw error;

        const updated = data as BrandVoice;
        setVoices((prev) =>
          sortVoices(
            prev.map((v) => {
              if (v.id === updated.id) return updated;
              if (setAsDefault) return { ...v, is_default: false };
              return v;
            })
          )
        );
      }

      resetForm();
      refreshList();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save brand voice.";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const commitPendingDelete = useCallback(async (voice: BrandVoice) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be signed in.");
    }

    const { error } = await supabase
      .from("brand_voices")
      .delete()
      .eq("id", voice.id)
      .eq("user_id", user.id);

    if (error) throw error;
  }, []);

  const flushPendingDelete = useCallback(
    async (voiceId: string) => {
      const pending = pendingDeletesRef.current.get(voiceId);
      if (!pending) return;

      clearTimeout(pending.timerId);
      pendingDeletesRef.current.delete(voiceId);

      try {
        await commitPendingDelete(pending.voice);
        refreshList();
      } catch (err) {
        setVoices((prev) =>
          sortVoices(
            prev.some((v) => v.id === pending.voice.id)
              ? prev
              : [...prev, pending.voice]
          )
        );
        toast.error("Could not delete voice", {
          description:
            err instanceof Error ? err.message : "Failed to delete brand voice.",
        });
      }
    },
    [commitPendingDelete, refreshList]
  );

  const undoPendingDelete = useCallback((voiceId: string) => {
    const pending = pendingDeletesRef.current.get(voiceId);
    if (!pending) return;

    clearTimeout(pending.timerId);
    pendingDeletesRef.current.delete(voiceId);
    setVoices((prev) =>
      sortVoices(
        prev.some((v) => v.id === pending.voice.id)
          ? prev
          : [...prev, pending.voice]
      )
    );
  }, []);

  const schedulePendingDelete = useCallback(
    (voice: BrandVoice) => {
      setActionError(null);

      const existing = pendingDeletesRef.current.get(voice.id);
      if (existing) {
        clearTimeout(existing.timerId);
        pendingDeletesRef.current.delete(voice.id);
      }

      setVoices((prev) => prev.filter((v) => v.id !== voice.id));
      if (editingId === voice.id) {
        resetForm();
      }

      const timerId = setTimeout(() => {
        void flushPendingDelete(voice.id);
      }, PENDING_DELETE_MS);

      pendingDeletesRef.current.set(voice.id, { voice, timerId });

      toast("Voice deleted", {
        description: voiceDisplayName(voice),
        duration: PENDING_DELETE_MS,
        action: {
          label: "Undo",
          onClick: () => undoPendingDelete(voice.id),
        },
      });
    },
    [editingId, flushPendingDelete, resetForm, undoPendingDelete]
  );

  useEffect(() => {
    const flushAllPendingDeletes = () => {
      const entries = [...pendingDeletesRef.current.entries()];
      for (const [voiceId, pending] of entries) {
        clearTimeout(pending.timerId);
        pendingDeletesRef.current.delete(voiceId);
        void commitPendingDelete(pending.voice).catch(() => {
          // Best-effort flush on unload/unmount; timer path surfaces failures.
        });
      }
    };

    window.addEventListener("beforeunload", flushAllPendingDeletes);
    return () => {
      window.removeEventListener("beforeunload", flushAllPendingDeletes);
      flushAllPendingDeletes();
    };
  }, [commitPendingDelete]);

  const handleSetDefault = async (voiceId: string) => {
    setActionError(null);
    setLoadingId(voiceId);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActionError("You must be signed in.");
        return;
      }

      await clearUserDefault(supabase, user.id);

      const { error } = await supabase
        .from("brand_voices")
        .update({ is_default: true })
        .eq("id", voiceId)
        .eq("user_id", user.id);

      if (error) throw error;

      setVoices((prev) =>
        sortVoices(
          prev.map((v) => ({
            ...v,
            is_default: v.id === voiceId,
          }))
        )
      );
      refreshList();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to set default voice.";
      setActionError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const updateSample = (index: number, value: string) => {
    setSampleFields((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {voices.length === 0
            ? "No brand voices yet — create one to steer every repurpose."
            : `${voices.length} voice${voices.length === 1 ? "" : "s"}`}
        </p>
        {formMode === null && (
          <Button
            type="button"
            onClick={openCreateForm}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New voice
          </Button>
        )}
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {formMode !== null && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              {formMode === "create" ? "Create brand voice" : "Edit brand voice"}
            </CardTitle>
            <CardDescription>
              Name the profile, then add a style note and/or writing samples.
              Studio uses your default voice on every generate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Name</Label>
              <Input
                id="voice-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Founder LinkedIn"
                maxLength={60}
                disabled={isSaving}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {name.trim().length}/60 — shown in Studio and Library
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-description">Style note (optional)</Label>
              <Textarea
                id="voice-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Clear, direct, UK founder tone — conversational but authoritative."
                maxLength={2000}
                rows={3}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/2000 characters
                {description.trim().length > 0 && description.trim().length < 10
                  ? " — minimum 10 characters if used alone"
                  : ""}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Writing samples (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Paste 2–3 posts or paragraphs that sound like you. These are the
                evidence Studio steers from.
              </p>
              {sampleFields.map((sample, index) => (
                <div key={index} className="space-y-1.5">
                  <Label
                    htmlFor={`sample-${index}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    Sample {index + 1}
                  </Label>
                  <Textarea
                    id={`sample-${index}`}
                    value={sample}
                    onChange={(e) => updateSample(index, e.target.value)}
                    placeholder="Paste a post, email, or paragraph in your voice…"
                    maxLength={2000}
                    rows={4}
                    disabled={isSaving}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="set-as-default"
                checked={setAsDefault}
                onCheckedChange={(checked) => setSetAsDefault(checked === true)}
                disabled={isSaving}
              />
              <Label htmlFor="set-as-default" className="font-normal">
                Set as default (used in Studio)
              </Label>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? "Saving…" : "Save voice"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {voices.length === 0 && formMode === null ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Teach Voiceora how you write
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            Your default voice is applied automatically in Studio. Without one,
            outputs fall back to a generic style.
          </p>
          <Button
            type="button"
            onClick={openCreateForm}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first voice
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {voices.map((voice) => {
            const sampleCount = (voice.samples ?? []).filter(Boolean).length;
            const title = voiceDisplayName(voice);
            const styleNote = voice.description?.trim();
            const evidence = (voice.samples ?? [])
              .filter(Boolean)
              .slice(0, 2);
            const updatedAt = voice.updated_at ?? voice.created_at;

            return (
              <Card key={voice.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-foreground">
                            {title}
                          </p>
                          {voice.is_default && (
                            <Badge className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sampleCount} sample{sampleCount === 1 ? "" : "s"}
                          {" · "}
                          Updated{" "}
                          {format(new Date(updatedAt), "MMM d, yyyy")}
                        </p>
                      </div>

                      {styleNote ? (
                        <p className="text-sm text-muted-foreground">
                          {styleNote}
                        </p>
                      ) : null}

                      {evidence.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Sample evidence
                          </p>
                          {evidence.map((sample, index) => (
                            <p
                              key={`${voice.id}-sample-${index}`}
                              className="line-clamp-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground/90"
                            >
                              {sample}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!voice.is_default && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleSetDefault(voice.id)}
                          disabled={loadingId === voice.id}
                        >
                          Set as default
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditForm(voice)}
                        disabled={loadingId === voice.id}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => schedulePendingDelete(voice)}
                        disabled={loadingId === voice.id}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
