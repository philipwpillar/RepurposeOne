"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { planAllowsVision } from "@/lib/config";
import type { Plan } from "@/types";

interface PhotoUpgradeGateProps {
  plan: Plan;
}

export default function PhotoUpgradeGate({ plan }: PhotoUpgradeGateProps) {
  if (planAllowsVision(plan)) {
    return null;
  }

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-900">
          Photo repurpose is on Creator (£19/mo) and above
        </p>
        <p className="mt-1 text-amber-800/90">
          Upgrade to generate captions from your photos.
        </p>
        <Link
          href="/upgrade"
          className="mt-2 inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
        >
          View plans →
        </Link>
      </div>
    </div>
  );
}
