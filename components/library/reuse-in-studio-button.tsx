import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReuseInStudioButtonProps {
  sourceHash: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
  className?: string;
}

/**
 * Opens Studio with this source prefilled. Creates a new run — does not mutate history.
 */
export function ReuseInStudioButton({
  sourceHash,
  variant = "outline",
  size = "sm",
  className,
}: ReuseInStudioButtonProps) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={`/studio?reuse=${encodeURIComponent(sourceHash)}`}>
        Reuse in Studio
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}
