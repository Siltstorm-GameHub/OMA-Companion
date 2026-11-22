"use client";
import { Toaster } from "sonner";

export function ThemedToaster() {
  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      offset={80}
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-control)",
          fontSize: "13px",
          color: "var(--color-fg)",
          boxShadow: "var(--shadow-pop)",
        },
      }}
    />
  );
}
