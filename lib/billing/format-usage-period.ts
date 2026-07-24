import { format, parseISO } from "date-fns";

/** Human-readable usage period end for Dashboard + Account. */
export function formatUsageReset(periodEndIso: string): string {
  try {
    const date = parseISO(periodEndIso);
    if (Number.isNaN(date.getTime())) return "the end of this month";
    return format(date, "MMM d, yyyy");
  } catch {
    return "the end of this month";
  }
}
