"use client";

// ============================================
// Skin-Auswahl für die Community-Karte
// ============================================
// Fortnite-artig: fertige, in sich geschlossene Charaktere zur Auswahl,
// kein Body-/Outfit-Baukasten mehr (siehe character-builder/, noch im Code
// aber hier nicht mehr verdrahtet).

import dynamic from "next/dynamic";
import { SKINS } from "@/lib/skins/skins";

const SkinCanvas = dynamic(() => import("./SkinCanvas"), { ssr: false });

export default function SkinPicker({
  skinId,
  onChange,
}: {
  skinId: string | null;
  onChange: (skinId: string) => void;
}) {
  const selected = SKINS.find((s) => s.id === skinId) ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/20">
        {selected ? (
          <SkinCanvas skin={selected} clipName={selected.clips.idle} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
            Skin auswählen
          </div>
        )}
      </div>

      <div className="flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-visible">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`shrink-0 sm:w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
              s.id === skinId
                ? "border-amber-400 bg-amber-400/10 text-white"
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
