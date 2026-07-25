"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandVoiceInputSchema } from "@/types";
import { AuthShell } from "@/components/auth/auth-shell";
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
import "@/app/landing.css";

const STUDIO_LANDING = "/studio?example=1";

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
      name: "Default voice",
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
          name: parsed.data.name ?? "Default voice",
          samples: parsed.data.samples ?? [],
          description: parsed.data.description ?? null,
          is_default: true,
        });

      if (insertError) throw insertError;

      await markComplete(supabase, user.id);
      router.push(STUDIO_LANDING);
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
      router.push(STUDIO_LANDING);
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
    <AuthShell>
      <Card className="vo-auth-card w-full max-w-md border-0 shadow-none">
        <CardHeader>
          <div className="mb-1 text-xs font-semibold tracking-wider text-[#A78BFA]">
            QUICK SETUP · 1 OF 1
          </div>
          <CardTitle className="font-display text-2xl text-[#F4F4F5]">
            Teach Voiceora how you write
          </CardTitle>
          <CardDescription>
            Paste a sample or a one-line style note. Next you’ll land in Studio
            with example content so you can generate your first drafts.
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
              className="border-white/12 bg-[rgba(11,13,20,0.65)] text-[#F4F4F5] placeholder:text-[#71717A]"
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
            onClick={() => void handleSave()}
          >
            {isSaving && <Loader2 className="animate-spin" />}
            Save &amp; open Studio
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-[#A1A1AA] hover:bg-white/5 hover:text-[#F4F4F5]"
            disabled={busy}
            onClick={() => void handleSkip()}
          >
            {isSkipping && <Loader2 className="animate-spin" />}
            Skip for now
          </Button>
          <p className="text-center text-xs leading-relaxed text-[#71717A]">
            Skipping uses a built-in generic style until you add a Brand Voice —
            outputs won’t sound as much like you.
          </p>
        </CardContent>
        <CardFooter className="justify-center text-xs text-[#71717A]">
          You can change this anytime in Brand Voice.
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
