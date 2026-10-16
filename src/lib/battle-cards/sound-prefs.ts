"use client";

// ============================================
// OMA Gems — Ton-Schalter
// ============================================
// Es gibt EINE Ton-Einstellung für Kampf, Brett und Replay: Stumm und Lautstärke aus game-sfx.ts.
// Diese Funktionen bleiben als Schnittstelle der Battle-Cards-Bildschirme erhalten.

import { getSoundSettings, setSoundSettings } from "./game-sfx";

export function isSoundMuted(): boolean {
  return getSoundSettings().muted;
}

export function setSoundMuted(muted: boolean): void {
  setSoundSettings({ muted });
}
