"use client";
import type { AvgDirection } from "@/lib/avg-stats";

/** Auswahl "höchster/niedrigster Ø gewinnt" für das Format Durchschnittswerte (avg_stats) — genutzt
 *  in den Turnier-Einstellungen, im Event-Wizard und beim Event-Abschluss. */
export default function AvgDirectionToggle({
  value, onChange, disabled = false, label = "Wer gewinnt beim Durchschnittswert?",
}: {
  value: AvgDirection;
  onChange: (v: AvgDirection) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-gray-500 block mb-1">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {([
          { value: "high", label: "Höchster Ø gewinnt" },
          { value: "low",  label: "Niedrigster Ø gewinnt" },
        ] as const).map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
              value === opt.value
                ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
