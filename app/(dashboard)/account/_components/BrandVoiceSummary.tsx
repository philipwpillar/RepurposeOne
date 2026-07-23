import Link from "next/link";
import { Button } from "@/components/ui/button";

type BrandVoiceSummaryProps = {
  description: string | null;
  sampleCount: number;
  voiceCount: number;
};

export function BrandVoiceSummary({
  description,
  sampleCount,
  voiceCount,
}: BrandVoiceSummaryProps) {
  const snippet =
    description?.trim() ||
    (sampleCount > 0
      ? `${sampleCount} sample${sampleCount === 1 ? "" : "s"} on your default voice`
      : null);

  return (
    <section id="voice" className="space-y-4 scroll-mt-20">
      <div>
        <h2 className="text-lg font-semibold">Brand voice</h2>
        <p className="text-sm text-muted-foreground">
          Applied across Studio and Moment Bundle outputs.
        </p>
      </div>

      <div className="rounded-2xl border border-border p-4 space-y-3">
        {snippet ? (
          <p className="text-sm text-foreground line-clamp-3">{snippet}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brand voice set yet. Add samples so outputs match your style.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {voiceCount} voice{voiceCount === 1 ? "" : "s"} saved
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/brand-voice">Manage brand voices</Link>
        </Button>
      </div>
    </section>
  );
}
