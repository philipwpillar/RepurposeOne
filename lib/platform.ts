export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const Cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Cap?.isNativePlatform?.() === true;
}
