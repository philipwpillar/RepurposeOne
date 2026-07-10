"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandVoiceInputSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OnboardingForm() {
  const router = useRouter();
  const [sample, setSample] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  async function markComplete(
    supabase: ReturnType<typeof createClient>,
    userId: string
  ) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) throw updateError;
  }

  async function handleSave() {
    setError(null);

    const trimmedSample = sample.trim();
    const trimmedDescription = description.trim();

    const parsed = BrandVoiceInputSchema.safeParse({
      samples: trimmedSample ? [trimmedSample] : undefined,
      description: trimmedDescription || undefined,
    });

    if (!parsed.success) {
      setError(
        parsed.error.errors[0]?.message ??
          "Add a sample or a description to continue."
      );
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to continue.");
        return;
      }

      const { error: insertError } = await supabase
        .from("brand_voices")
        .insert({
          user_id: user.id,
          samples: parsed.data.samples ?? [],
          description: parsed.data.description ?? null,
          is_default: true,
        });

      if (insertError) throw insertError;

      await markComplete(supabase, user.id);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    setError(null);
    setIsSkipping(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to continue.");
        return;
      }

      await markComplete(supabase, user.id);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSkipping(false);
    }
  }

  const busy = isSaving || isSkipping;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <span className="text-xl font-bold tracking-tight">
        Voice<span className="text-primary">ora</span>
      </span>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-xs font-semibold tracking-wider text-primary mb-1">
            QUICK SETUP
          </div>
          <CardTitle className="text-2xl">Give Voiceora your voice</CardTitle>
          <CardDescription>
            Paste a sample of your writing, or describe your style in a
            line. Every output will match it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sample">A sample of your writing</Label>
            <Textarea
              id="sample"
              placeholder="Paste a paragraph you've written before — a blog post, a caption, an email. Anything works."
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              rows={4}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Or describe it in one line</Label>
            <Input
              id="description"
              placeholder="e.g. Direct, a little dry, no corporate jargon"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={handleSave}
          >
            {isSaving && <Loader2 className="animate-spin" />}
            Save &amp; continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={busy}
            onClick={handleSkip}
          >
            {isSkipping && <Loader2 className="animate-spin" />}
            Skip for now — use default voice
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          You can change this anytime in Brand Voice.
        </CardFooter>
      </Card>
    </div>
  );
}
