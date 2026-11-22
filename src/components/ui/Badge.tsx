import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "live" | "coin";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  primary: "bg-primary-soft text-primary-fg border-primary/25",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger:  "bg-danger-soft text-danger border-danger/25",
  info:    "bg-blue-500/10 text-blue-300 border-blue-500/25",
  live:    "bg-live-soft text-live border-live/25",
  coin:    "bg-coin-soft text-coin border-coin/25",
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Pille/Abzeichen — voll gerundet, mindestens 12 px Schrift */
export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      {icon}
      {children}
    </span>
  );
}
