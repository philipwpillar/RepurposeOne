"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import type {
  GenerateErrorResponse,
  GenerateSuccessResponse,
  TargetFormat,
  UsageInfo,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormatSelector } from "@/components/repurpose/format-selector";
import { XThreadOutputDisplay } from "@/components/repurpose/x-thread-output";
import { UpgradePrompt } from "@/components/repurpose/upgrade-prompt";

interface NewRepurposeFormProps {
  initialUsage: UsageInfo;
}

export function NewRepurposeForm({ initialUsage }: NewRepurposeFormProps) {
  const [inputContent, setInputContent] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [voiceSamples, setVoiceSamples] = useState("");
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("x_thread");
  const [targetTweets, setTargetTweets] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GenerateErrorResponse | null>(null);
  const [result, setResult] = useState<GenerateSuccessResponse | null>(null);
  const [usage, setUsage] = useState(initialUsage);

  const atLimit = usage.used >= usage.limit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const samples = voiceSamples
      .split("\n---\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_type: "paste",
          input_content: inputContent,
          brand_voice: {
            description: voiceDescription || undefined,
            samples: samples.length > 0 ? samples : undefined,
          },
          target_format: targetFormat,
          target_tweets: targetTweets,
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setError(data as GenerateErrorResponse);
        if (data.usage) setUsage(data.usage);
        return;
      }

      if (!res.ok) {
        setError(data as GenerateErrorResponse);
        return;
      }

      const success = data as GenerateSuccessResponse;
      setResult(success);
      setUsage(success.usage);
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : "Request failed",
        code: "internal_error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (atLimit && !result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Repurpose</h1>
          <p className="text-muted-foreground">
            You&apos;ve reached your monthly limit.
          </p>
        </div>
        <UpgradePrompt usage={usage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">New Repurpose</h1>
        <p className="text-muted-foreground">
          Paste your content, set your brand voice, and generate a platform-native
          output.
        </p>
      </div>

      {error?.code === "limit_exceeded" && error.usage && (
        <UpgradePrompt
          usage={error.usage}
          upgradeMessage={error.upgrade_message}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Source content</CardTitle>
            <CardDescription>
              Paste a blog post, newsletter, transcript, or notes (min. 50
              characters)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="Paste your long-form content here..."
              rows={10}
              required
              minLength={50}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {inputContent.length.toLocaleString()} characters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brand voice</CardTitle>
            <CardDescription>
              Describe your tone and/or paste 1–3 writing samples. Provide at
              least one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-description">Voice description</Label>
              <Textarea
                id="voice-description"
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                placeholder="e.g. Direct, warm, founder-to-founder tone. Short sentences. No corporate jargon."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-samples">Writing samples</Label>
              <Textarea
                id="voice-samples"
                value={voiceSamples}
                onChange={(e) => setVoiceSamples(e.target.value)}
                placeholder="Paste samples separated by a line with --- between each"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple samples with <code>---</code> on its own line
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Output format</CardTitle>
            <CardDescription>
              Choose where you want to repurpose this content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormatSelector value={targetFormat} onChange={setTargetFormat} />

            {targetFormat === "x_thread" && (
              <div className="space-y-2">
                <Label htmlFor="target-tweets">Number of tweets</Label>
                <Input
                  id="target-tweets"
                  type="number"
                  min={3}
                  max={15}
                  value={targetTweets}
                  onChange={(e) =>
                    setTargetTweets(
                      Math.min(15, Math.max(3, Number(e.target.value) || 7))
                    )
                  }
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {error && error.code !== "limit_exceeded" && (
          <Alert variant="destructive">
            <AlertDescription>{error.error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={loading || atLimit}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Generating your thread…
            </>
          ) : (
            <>
              <Sparkles />
              Generate
            </>
          )}
        </Button>
      </form>

      {result && (
        <div className="space-y-4">
          <XThreadOutputDisplay
            output={result.output}
            repurposeId={result.repurpose_id}
          />
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={`/history/${result.repurpose_id}`}>View in history</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              Create another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
