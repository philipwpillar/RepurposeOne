import { notFound } from "next/navigation";
import FrameSamplerHarness from "./_components/FrameSamplerHarness";

/**
 * Dev harness for Brief 2a frame sampler + contact sheets.
 * Gated by NEXT_PUBLIC_VIDEO_BUNDLES_DEV - keep unset in production.
 */
export default function FrameSamplerDevPage() {
  if (process.env.NEXT_PUBLIC_VIDEO_BUNDLES_DEV !== "true") {
    notFound();
  }

  return <FrameSamplerHarness />;
}
