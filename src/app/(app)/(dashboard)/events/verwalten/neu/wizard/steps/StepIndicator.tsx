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
    <div className="flex items-center gap-1 mb-8 flex-wrap">
      {labels.map((label, i) => {
        const active = i === step;
        const done   = i < step;
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 ${active || done ? "" : "opacity-40"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done   ? "bg-teal-500 text-white"
                : active ? "bg-teal-500/20 border-2 border-teal-500 text-teal-400"
                : "bg-white/5 border border-white/10 text-gray-500"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                active ? "text-teal-300" : done ? "text-gray-400" : "text-gray-600"
              }`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-px mx-0.5 ${i < step ? "bg-teal-500/50" : "bg-white/8"}`} style={{ width: 14 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
