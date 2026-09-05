"use client";

// ============================================
// Battle Cards — geteilter Sound-Mute-Schalter
// ============================================
// EIN localStorage-Schlüssel für Replay (sfx.ts/BattleScreen.tsx) UND
// Live-Kampf (sound.ts/LiveBattleView.tsx) — vorher hatte jede der beiden
// Dateien ihren eigenen Schalter ("battleCardsSoundOn" vs.
// "battle-cards-sound-muted"), wodurch "Ton aus" im Live-Kampf den Ton im
// Replay nicht mitstummschaltete (und umgekehrt).

const MUTE_KEY = "battle-cards-sound-muted";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // localStorage kann in privaten Tabs/eingeschränkten Kontexten fehlschlagen — kein Problem, nur Komfort.
  }
}
