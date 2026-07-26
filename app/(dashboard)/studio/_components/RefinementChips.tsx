"use client";

const REFINEMENTS = [
  { label: "Punchier hook", directive: "Make the opening hook punchier." },
  { label: "Shorter", directive: "Make the output shorter and more concise." },
  { label: "Less formal", directive: "Use a less formal, more conversational tone." },
  { label: "More specific", directive: "Make the output more specific and concrete." },
] as const;

interface RefinementChipsProps {
  disabled?: boolean;
  onRefine: (directive: string) => void;
}

export function RefinementChips({
  disabled = false,
  onRefine,
}: RefinementChipsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Create another version
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Refine this output">
        {REFINEMENTS.map(({ label, directive }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onRefine(directive)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
