"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ActivationBanner, { ACTIVATION_DISMISS_KEY } from "./ActivationBanner";

interface DashboardRecentEmptyProps {
  bannerEligible: boolean;
}

function SharperEmptyCard() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Turn one article into four platform posts</CardTitle>
        <CardDescription className="text-balance">
          Paste a blog post, newsletter, or notes into Studio — Voiceora drafts
          an X thread, LinkedIn post, Instagram caption, and email in your
          voice.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-8">
        <Button asChild>
          <Link href="/studio">Open Studio</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardRecentEmpty({
  bannerEligible,
}: DashboardRecentEmptyProps) {
  const [bannerDismissed, setBannerDismissed] = useState<boolean | null>(
    bannerEligible ? null : true
  );

  useEffect(() => {
    if (!bannerEligible) {
      setBannerDismissed(true);
      return;
    }
    try {
      setBannerDismissed(localStorage.getItem(ACTIVATION_DISMISS_KEY) === "1");
    } catch {
      setBannerDismissed(false);
    }
  }, [bannerEligible]);

  if (bannerEligible && bannerDismissed === null) {
    return null;
  }

  if (bannerEligible && !bannerDismissed) {
    return (
      <ActivationBanner onDismiss={() => setBannerDismissed(true)} />
    );
  }

  return <SharperEmptyCard />;
}
