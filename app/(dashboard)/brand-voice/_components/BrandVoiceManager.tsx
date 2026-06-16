"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BrandVoiceInputSchema } from "@/types";

const SAMPLE_FIELD_COUNT = 3;
const EMPTY_SAMPLES = () => Array.from({ length: SAMPLE_FIELD_COUNT }, () => "");

export type BrandVoiceRow = {
  id: string;
  user_id: string;
  samples: string[];
  description: string | null;
  is_default: boolean;
  created_at: string;
};

interface BrandVoiceManagerProps {
  initialVoices: BrandVoiceRow[];
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

function buildValidatedInput(description: string, sampleFields: string[]) {
  const trimmedDescription = description.trim();
  const trimmedSamples = sampleFields
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return BrandVoiceInputSchema.parse({
    description: trimmedDescription || undefined,
    samples: trimmedSamples.length > 0 ? trimmedSamples : undefined,
  });
}

export function BrandVoiceManager({ initialVoices }: BrandVoiceManagerProps) {
  const router = useRouter();
  const [voices, setVoices] = useState(initialVoices);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [sampleFields, setSampleFields] = useState<string[]>(EMPTY_SAMPLES);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormMode(null);
    setEditingId(null);
    setDescription("");
    setSampleFields(EMPTY_SAMPLES());
    setSetAsDefault(false);
    setFormError(null);
  }, []);

  const openCreateForm = useCallback(() => {
    setActionError(null);
    setFormMode("create");
    setEditingId(null);
    setDescription("");
    setSampleFields(EMPTY_SAMPLES());
    setSetAsDefault(voices.length === 0);
    setFormError(null);
  }, [voices.length]);

  const openEditForm = useCallback((voice: BrandVoiceRow) => {
    setActionError(null);
    setFormMode("edit");
    setEditingId(voice.id);
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

      const validated = buildValidatedInput(description, sampleFields);
      const payload = {
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
          .select("id, user_id, samples, description, is_default, created_at")
          .single();

        if (error) throw error;

        setVoices((prev) => {
          const next = setAsDefault
            ? prev.map((v) => ({ ...v, is_default: false }))
            : [...prev];
          return [data as BrandVoiceRow, ...next].sort((a, b) => {
            if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
            return (
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
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
          .select("id, user_id, samples, description, is_default, created_at")
          .single();

        if (error) throw error;

        const updated = data as BrandVoiceRow;
        setVoices((prev) =>
          prev
            .map((v) => {
              if (v.id === updated.id) return updated;
              if (setAsDefault) return { ...v, is_default: false };
              return v;
            })
            .sort((a, b) => {
              if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
            })
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
        prev
          .map((v) => ({
            ...v,
            is_default: v.id === voiceId,
          }))
          .sort((a, b) => {
            if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
            return (
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          })
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

  const handleDelete = async (voiceId: string) => {
    if (!window.confirm("Delete this brand voice? This cannot be undone.")) {
      return;
    }

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

      const { error } = await supabase
        .from("brand_voices")
        .delete()
        .eq("id", voiceId)
        .eq("user_id", user.id);

      if (error) throw error;

      setVoices((prev) => prev.filter((v) => v.id !== voiceId));
      if (editingId === voiceId) {
        resetForm();
      }
      refreshList();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete brand voice.";
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
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            New voice
          </Button>
        )}
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {formMode !== null && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">
              {formMode === "create" ? "Create brand voice" : "Edit brand voice"}
            </CardTitle>
            <CardDescription>
              Add a short description and/or 2–3 writing samples. At least one is
              required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-description">Description (optional)</Label>
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
              <input
                id="set-as-default"
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <Label htmlFor="set-as-default" className="font-normal">
                Set as default (used in Studio)
              </Label>
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700"
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
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
            <Mic className="h-6 w-6 text-teal-600" />
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Your default voice is applied automatically in Studio when you generate
            content.
          </p>
          <Button
            type="button"
            onClick={openCreateForm}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Create your first voice
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {voices.map((voice) => {
            const sampleCount = (voice.samples ?? []).filter(Boolean).length;
            const preview =
              voice.description?.trim() ||
              (voice.samples?.[0]
                ? `${voice.samples[0].slice(0, 120)}${voice.samples[0].length > 120 ? "…" : ""}`
                : "No description");

            return (
              <Card key={voice.id} className="border-slate-200">
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {voice.is_default && (
                          <Badge className="border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-50">
                            Default
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {sampleCount} sample{sampleCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        {preview}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!voice.is_default && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(voice.id)}
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
                        onClick={() => handleDelete(voice.id)}
                        disabled={loadingId === voice.id}
                        className="text-red-600 hover:text-red-700"
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
