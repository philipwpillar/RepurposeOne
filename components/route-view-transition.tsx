"use client";

import * as React from "react";
import type { ReactNode } from "react";

type ViewTransitionProps = {
  children?: ReactNode;
  name?: string;
  default?: "none" | "auto" | (string & {});
};

type ViewTransitionComponent = React.ComponentType<ViewTransitionProps>;

// Next 15.5's experimental.viewTransition channel exports this as unstable_*.
const ViewTransition = (
  React as unknown as { unstable_ViewTransition: ViewTransitionComponent }
).unstable_ViewTransition;

/**
 * Wraps route content so App Router navigations (already in startTransition)
 * participate in the View Transitions API when experimental.viewTransition
 * is enabled. Observational acceptance: sidebar Link clicks must animate.
 */
export function RouteViewTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition name="vo-main" default="auto">
      {children}
    </ViewTransition>
  );
}
