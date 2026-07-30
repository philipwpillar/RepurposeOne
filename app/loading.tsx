import { BrandLockup } from "@/components/landing/vo-logo-mark";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <BrandLockup size={40} wordmarkClassName="text-lg" priority />
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
