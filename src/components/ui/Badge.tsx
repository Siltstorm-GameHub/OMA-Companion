import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.04] text-gray-600 border-white/[0.06]",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger:  "bg-red-500/10 text-red-400 border-red-500/20",
  info:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      {icon}
      {children}
    </span>
  );
}
