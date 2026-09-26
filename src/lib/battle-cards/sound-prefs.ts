"use client";

// ============================================
// Battle Cards — Ton-Schalter: gemeinsam mit OMA Quest
// ============================================
// Es gibt nur noch EINE Ton-Einstellung für alle Spielmodi (OMA Quest, Gems, Duels, Replay): Stumm und Lautstärke aus lib/dnd/oq-sfx.
// Diese Funktionen bleiben als Schnittstelle der Battle-Cards-Bildschirme erhalten.

import { getSoundSettings, setSoundSettings } from "@/lib/dnd/oq-sfx";

export function isSoundMuted(): boolean {
  return getSoundSettings().muted;
}

export function setSoundMuted(muted: boolean): void {
  setSoundSettings({ muted });
}
