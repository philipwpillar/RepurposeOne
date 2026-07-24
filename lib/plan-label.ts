import type { Plan } from "@/types";

/** Human-readable plan label for UI (never show raw `pro_plus`). */
export function planLabel(plan: Plan | string): string {
  switch (plan) {
    case "free":
      return "Free";
    case "creator":
      return "Creator";
    case "pro":
      return "Pro";
    case "pro_plus":
      return "Pro Plus";
    default:
      return String(plan);
  }
}
