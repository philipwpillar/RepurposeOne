import { BrandLockup } from "@/components/landing/vo-logo-mark";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-foreground">
      <BrandLockup size={36} wordmarkClassName="text-xl" priority />
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
