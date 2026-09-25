"use client";

// ============================================
// OMA Quest — Lautstärke-Schalter (Stumm + Regler), gilt für alle Spielklänge
// ============================================

import { useSyncExternalStore } from "react";
import { getSoundSettings, playSfx, setSoundSettings, subscribeSound } from "@/lib/dnd/oq-sfx";

const SERVER: ReturnType<typeof getSoundSettings> = { volume: 0.5, muted: false };

export function useSoundSettings() {
  return useSyncExternalStore(subscribeSound, getSoundSettings, () => SERVER);
}

/** Nur der Stumm-Knopf (für enge Leisten). */
export function MuteButton({ className = "" }: { className?: string }) {
  const s = useSoundSettings();
  const off = s.muted || s.volume === 0;
  return (
    <button
      type="button" aria-pressed={off} title={off ? "Ton einschalten" : "Ton ausschalten"} aria-label={off ? "Ton einschalten" : "Ton ausschalten"}
      onClick={() => { setSoundSettings({ muted: !s.muted, ...(s.muted && s.volume === 0 ? { volume: 0.5 } : {}) }); if (s.muted) playSfx("click"); }}
      className={className || "oq-btn h-9 w-9 text-base grid place-items-center"}
    >
      {off ? "🔇" : "🔊"}
    </button>
  );
}

/** Stumm-Knopf mit Lautstärke-Regler (im Spielmenü). */
export default function SoundControl() {
  const s = useSoundSettings();
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Lautstärke">
      <MuteButton className="oq-btn text-xs px-2 py-1" />
      <input
        type="range" min={0} max={100} step={5} value={Math.round(s.volume * 100)} aria-label="Lautstärke"
        onChange={(e) => setSoundSettings({ volume: Number(e.target.value) / 100, muted: false })}
        onPointerUp={() => playSfx("click")}
        className="w-20 accent-amber-400"
      />
    </div>
  );
}
