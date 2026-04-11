"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Sonner host + class hooks; glass / color rails live in `globals.css` (`.sonner-glass-host`).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      richColors={false}
      closeButton
      expand={false}
      gap={14}
      offset={{ bottom: "max(1rem, env(safe-area-inset-bottom, 0px))", right: "max(1rem, env(safe-area-inset-right, 0px))" }}
      className="sonner-glass-host"
      toastOptions={{
        duration: 4800,
        closeButtonAriaLabel: "Dismiss notification",
        classNames: {
          toast: "sonner-glass-toast",
          title: "sonner-glass-title",
          description: "sonner-glass-description",
          closeButton: "sonner-glass-close",
          actionButton: "sonner-glass-action",
          cancelButton: "sonner-glass-cancel",
          success: "sonner-glass-toast--success",
          error: "sonner-glass-toast--error",
          warning: "sonner-glass-toast--warning",
          info: "sonner-glass-toast--info",
          default: "sonner-glass-toast--default",
        },
      }}
      style={
        {
          "--width": "min(22rem, calc(100vw - 2rem))",
        } as CSSProperties
      }
    />
  );
}
