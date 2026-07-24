import Link from "next/link";
import { Button } from "@/components/ui/button";
import { voiceDisplayName } from "@/lib/repurpose/voice-display-name";

type BrandVoiceSummaryProps = {
  name?: string | null;
  description: string | null;
  sampleCount: number;
  voiceCount: number;
};

export function BrandVoiceSummary({
  name,
  description,
  sampleCount,
  voiceCount,
}: BrandVoiceSummaryProps) {
  const title = voiceDisplayName({
    name,
    description,
    samples: sampleCount > 0 ? ["sample"] : null,
  });
  const hasVoice = Boolean(name?.trim() || description?.trim() || sampleCount > 0);

  return (
    <section id="voice" className="space-y-4 scroll-mt-20">
      <div>
        <h2 className="text-lg font-semibold">Brand voice</h2>
        <p className="text-sm text-muted-foreground">
          Applied across Studio and Moment Bundle outputs.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border p-4">
        {hasVoice ? (
          <>
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description?.trim() ? (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {description.trim()}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brand voice set yet. Add a named profile so outputs match your
            style.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {voiceCount} voice{voiceCount === 1 ? "" : "s"} saved
          {sampleCount > 0
            ? ` · ${sampleCount} sample${sampleCount === 1 ? "" : "s"} on default`
            : ""}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/brand-voice">Manage brand voices</Link>
        </Button>
      </div>
    </section>
  );
}
