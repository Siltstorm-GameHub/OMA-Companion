"use client";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { FIELD_CLASSES } from "./field-styles";


type FieldExtras = { label?: string; hint?: string; error?: string };

function FieldFrame({ id, label, hint, error, children }: FieldExtras & { id: string; children: React.ReactNode }) {
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-semibold text-fg">{label}</label>}
      {children}
      {descId && <p id={descId} className={`text-xs ${error ? "text-danger" : "text-subtle"}`}>{error ?? hint}</p>}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldExtras {}

/** Eingabefeld mit Beschriftung, Hinweis und Fehler — 44 px hoch (Touch-Ziel). */
export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-desc` : undefined}
        className={`${error ? FIELD_CLASSES.replace("border-line", "border-danger/70") : FIELD_CLASSES} h-11 ${className ?? ""}`}
        {...props}
      />
    </FieldFrame>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldExtras {}

export function Textarea({ label, hint, error, className, id, rows = 4, ...props }: TextareaProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error}>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-desc` : undefined}
        className={`${error ? FIELD_CLASSES.replace("border-line", "border-danger/70") : FIELD_CLASSES} py-2.5 leading-relaxed ${className ?? ""}`}
        {...props}
      />
    </FieldFrame>
  );
}
