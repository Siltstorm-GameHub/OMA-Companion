"use client";

import { Check } from "@/components/icons";
import { LAYOUT_PRESETS, type LayoutPreset } from "./layoutPresets";
import { ELEMENT_SIZE } from "./types";

/**
 * Auswahl der Layout-Vorlagen mit Mini-Vorschau (Turnier-Ansicht, Kästchen in echten Proportionen).
 */
export default function PresetPicker({ active, onPick }: { active: string | null; onPick: (preset: LayoutPreset) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {LAYOUT_PRESETS.map(p => {
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onPick(p)}
            aria-pressed={isActive}
            className={`text-left rounded-xl p-2 border transition-all ${
              isActive ? "border-teal-400/60 bg-teal-500/10" : "border-white/[0.08] hover:border-white/25"
            }`}
          >
            <div className="relative w-full rounded-md overflow-hidden bg-black/40 border border-white/[0.06]" style={{ aspectRatio: "16 / 9" }}>
              {Object.entries(p.event.elements).map(([key, e]) => {
                const size = ELEMENT_SIZE[key as keyof typeof ELEMENT_SIZE];
                const scale = e!.scale ?? 1;
                return (
                  <span
                    key={key}
                    className={`absolute rounded-[2px] ${key === "brand" ? "bg-violet-400/60" : "bg-teal-400/50"}`}
                    style={{
                      left: `${e!.x}%`, top: `${e!.y}%`,
                      width: `${(size.width * scale / 1920) * 100}%`, height: `${(size.height * scale / 1080) * 100}%`,
                    }}
                  />
                );
              })}
              {isActive && <Check className="absolute top-1 right-1 w-3.5 h-3.5 text-teal-300" />}
            </div>
            <span className={`block mt-1.5 text-sm font-medium ${isActive ? "text-teal-200" : "text-gray-200"}`}>{p.label}</span>
            <span className="block text-[11px] text-gray-500 leading-snug">{p.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
