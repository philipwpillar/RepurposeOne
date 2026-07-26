"use client";

import type { ComponentProps, CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={4000}
      closeButton={false}
      style={
        {
          "--normal-bg": "var(--surface-1)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--surface-1)",
          "--success-text": "var(--success)",
          "--success-border": "var(--success)",
          "--error-bg": "var(--surface-1)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--destructive)",
        } as CSSProperties
      }
      toastOptions={{
        duration: 4000,
      }}
      {...props}
    />
  );
}

export { Toaster };
