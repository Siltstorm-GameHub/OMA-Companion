"use client";

// ============================================
// Battle Cards — Kampf-Soundeffekte (Replay)
// ============================================
// Gleiche Klänge wie überall in OMA Quest / Battle Cards (lib/dnd/oq-sfx); nur die Namen der Funktionen bleiben für den Replay-Bildschirm.

import type { UnitClass } from "@/lib/battle-engine/types";
import { playSfx, sfxForClassHit, sfxForClassUltimate } from "@/lib/dnd/oq-sfx";

export const playHitSfx = () => playSfx("hit");
export const playCritSfx = () => playSfx("crit");
export const playHealSfx = () => playSfx("heal");
export const playShieldSfx = () => playSfx("block");
export const playBuffSfx = () => playSfx("buff");
export const playDebuffSfx = () => playSfx("miss");

/** Trefferschall nach Klasse des ausführenden Helden (Tank wuchtig, Schaden schneidend, Support magisch). */
export function playHitSfxFor(casterClass: UnitClass | undefined, crit: boolean) {
  playSfx(sfxForClassHit(casterClass, crit));
}

export function playUltimateSfx(casterClass?: UnitClass) {
  playSfx(sfxForClassUltimate(casterClass));
}
