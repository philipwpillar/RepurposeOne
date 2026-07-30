import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  voiceAttributionLabel,
  type VoiceAttributionInput,
} from "@/lib/repurpose/voice-attribution";

interface VoiceAttributionBadgeProps {
  voice: VoiceAttributionInput;
}

/** Factual voice attribution - links to Brand Voice settings. No match-quality claim. */
export function VoiceAttributionBadge({ voice }: VoiceAttributionBadgeProps) {
  const label = voiceAttributionLabel(voice);

  return (
    <Link
      href="/brand-voice"
      className="inline-flex max-w-[14rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      title={label}
    >
      <Badge variant="outline" className="max-w-full truncate font-normal">
        Brand Voice: {label}
      </Badge>
    </Link>
  );
}
