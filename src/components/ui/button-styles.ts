import type { ButtonSize, ButtonVariant } from "./Button";

/** Farben je Variante — Design-Tokens aus globals.css (Richtung G). */
export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:   "bg-primary text-primary-ink hover:bg-primary-hover font-bold",
  secondary: "border border-line-strong bg-surface-2 text-fg hover:bg-surface-3 font-semibold",
  danger:    "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20 font-semibold",
  accent:    "bg-coin-soft text-coin border border-coin/25 hover:bg-coin/20 font-semibold",
  outline:   "border border-line-strong text-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg font-medium",
  ghost:     "text-muted hover:text-fg hover:bg-surface-2 font-medium",
};

/** Höhen: sm 36 px (dichte Listen), md 40 px, lg 44 px (Touch-Ziel) */
export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs gap-1.5",
  md: "min-h-10 px-4 text-sm gap-2",
  lg: "min-h-11 px-5 text-sm gap-2",
};

/** Klassen für Links, die wie Knöpfe aussehen sollen (<Link className={buttonClasses(...)}>) */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `inline-flex items-center justify-center rounded-control transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${extra}`;
}
