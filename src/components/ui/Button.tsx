"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "@/components/icons";
import { buttonClasses } from "./button-styles";

export type ButtonVariant = "primary" | "secondary" | "danger" | "accent" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

// Stile liegen in button-styles.ts (ohne "use client"), damit auch Server-Komponenten
// buttonClasses() für Links nutzen können.

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className ?? "")}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
}
