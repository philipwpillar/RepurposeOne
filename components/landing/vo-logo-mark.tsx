import Image from "next/image";
import { cn } from "@/lib/utils";

export type VoMarkVariant = "primary" | "favicon" | "white" | "black";

const MARK_SRC: Record<VoMarkVariant, string> = {
  primary: "/brand/mark-primary-ui.png",
  favicon: "/brand/mark-favicon-ui.png",
  white: "/brand/mark-white.png",
  black: "/brand/mark-black.png",
};

/** @deprecated Gradient SVG defs are no longer needed; kept as a no-op for safe imports. */
export function VoMarkDefs() {
  return null;
}

export function VoLogoMark({
  size = 30,
  variant = "primary",
  className,
  priority = false,
}: {
  size?: number;
  variant?: VoMarkVariant;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={MARK_SRC[variant]}
      alt=""
      width={size}
      height={size}
      className={cn("object-contain", className)}
      aria-hidden="true"
      priority={priority}
      quality={95}
    />
  );
}

/** Mark + intact “Voiceora” wordmark for nav, shell, auth, and legal headers. */
export function BrandLockup({
  size = 30,
  variant = "primary",
  className,
  wordmarkClassName,
  priority = false,
}: {
  size?: number;
  variant?: VoMarkVariant;
  className?: string;
  wordmarkClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <VoLogoMark size={size} variant={variant} priority={priority} />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          wordmarkClassName,
        )}
      >
        Voiceora
      </span>
    </span>
  );
}
