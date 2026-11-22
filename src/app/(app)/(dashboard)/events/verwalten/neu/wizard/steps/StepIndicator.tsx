"use client";
import { Check } from "@/components/icons";
import { STEP_LABELS_EVENT, STEP_LABELS_SERIES } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Render: Step Indicator ────────────────────────────────────────────────────
export default function StepIndicator({ w }: { w: EventWizard }) {
  const { step, isEventMode, showsTournamentStep } = w;
  const base = isEventMode ? STEP_LABELS_EVENT : STEP_LABELS_SERIES;
  const labels = isEventMode && !showsTournamentStep
    ? base.filter((_, i) => i !== 2)
    : base;
  return (
    <ol className="mb-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none" aria-label="Schritte">
      {labels.map((label, i) => {
        const active = i === step;
        const done   = i < step;
        return (
          <li key={i} className="flex shrink-0 items-center gap-1.5" aria-current={active ? "step" : undefined}>
            <div className={`flex items-center gap-1.5 ${active || done ? "" : "opacity-40"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-colors ${
                done   ? "bg-primary text-primary-ink"
                : active ? "bg-primary-soft border-2 border-primary text-primary-fg"
                : "bg-surface-2 border border-line text-subtle"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-sm font-semibold ${active ? "" : "hidden sm:block"} ${
                active ? "text-fg" : done ? "text-muted" : "text-subtle"
              }`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-0.5 mx-0.5 rounded-full ${i < step ? "bg-primary" : "bg-line"}`} style={{ width: 18 }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
