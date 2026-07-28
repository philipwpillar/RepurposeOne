import { isNativePlatform } from "@/lib/platform";

/**
 * Light impact feedback on native (Capacitor). No-op on web.
 * Dynamic import keeps the web bundle free of a hard native dependency.
 */
export async function hapticImpact(
  style: "Light" | "Medium" | "Heavy" = "Light",
): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = {
      Light: ImpactStyle.Light,
      Medium: ImpactStyle.Medium,
      Heavy: ImpactStyle.Heavy,
    } as const;
    await Haptics.impact({ style: map[style] });
  } catch {
    /* plugin missing or unavailable — ignore */
  }
}
