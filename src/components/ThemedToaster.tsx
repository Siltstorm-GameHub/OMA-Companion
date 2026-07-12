"use client";
import { Toaster } from "sonner";
import { useTheme } from "@/components/ThemeProvider";

export function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      theme={theme}
      offset={80}
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--bg-elevated)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--border-dim)",
          borderRadius: "14px",
          fontSize: "13px",
          color: theme === "dark" ? "#ededf0" : "#0d1f1c",
          boxShadow: "var(--shadow-card)",
        },
      }}
    />
  );
}
