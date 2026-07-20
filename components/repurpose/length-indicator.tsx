import { cn } from "@/lib/utils";

type HardLengthIndicatorProps = {
  mode: "hard";
  length: number;
  max: number;
};

type SoftLengthIndicatorProps = {
  mode: "soft";
  length: number;
  softThreshold: number;
};

type InfoLengthIndicatorProps = {
  mode: "info";
  length: number;
  max: number;
};

export type LengthIndicatorProps =
  | HardLengthIndicatorProps
  | SoftLengthIndicatorProps
  | InfoLengthIndicatorProps;

export function LengthIndicator(props: LengthIndicatorProps) {
  if (props.mode === "hard") {
    const over = props.length > props.max;
    return (
      <span
        className={cn(
          "text-xs tabular-nums",
          over ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {props.length}/{props.max}
      </span>
    );
  }

  if (props.mode === "soft") {
    const past = props.length > props.softThreshold;
    return (
      <span
        className={cn(
          "text-xs tabular-nums",
          past ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
        )}
        title={
          past
            ? "Content past this length is often truncated in the feed"
            : undefined
        }
      >
        {props.length}
        {past ? " · often truncated in feed" : ""}
      </span>
    );
  }

  return (
    <span className="text-xs tabular-nums text-muted-foreground/70">
      {props.length}/{props.max}
    </span>
  );
}
