// ============================================
// Kampf-Sounds — OMA Gems (Live-Kampf, Brett)
// ============================================
// Alle Klänge kommen aus game-sfx.ts: gleiche Samples, gleiche Lautstärke, gleicher Stumm-Schalter.
// Früher hatte dieses Modul eigene, per Web Audio erzeugte Töne; die Namen der Funktionen bleiben, damit die Bildschirme unverändert bleiben.

import type { UnitClass } from "@/lib/battle-engine/types";
import { playSfx, sfxForClassHit, sfxForClassUltimate } from "./game-sfx";
import { isSoundMuted, setSoundMuted } from "./sound-prefs";

export { isSoundMuted, setSoundMuted };

// OMA Gems
export const playSwapSound = (): void => playSfx("click", 0.6);
export const playInvalidSwapSound = (): void => playSfx("error", 0.7);
/** Aufeinanderfolgende Kaskaden-Matches klingen voller: der erste ein weiches Klicken, weitere ein heller Ton. */
export const playMatchSound = (cascadeIndex = 0): void => playSfx(cascadeIndex === 0 ? "click" : "ping", 0.5 + Math.min(0.4, cascadeIndex * 0.1));
export const playCommunityBonusSound = (): void => playSfx("reward", 0.8);

export const playHealSound = (): void => playSfx("heal");
export const playShieldSound = (): void => playSfx("block");
export const playDamageSoundFor = (casterClass: UnitClass | undefined, crit: boolean): void => playSfx(sfxForClassHit(casterClass, crit));
export const playUltimateSoundFor = (casterClass: UnitClass | undefined): void => playSfx(sfxForClassUltimate(casterClass));
export const playVictorySound = (): void => playSfx("win");
export const playDefeatSound = (): void => playSfx("lose");

// Karten, Timer
/** Kartenreveal beim Pack-Öffnen — dezenter Klick. */
export const playCardRevealSound = (): void => playSfx("menu", 0.9);
/** Community-Karte gezogen — Stufenaufstiegs-Fanfare. */
export const playRarePullSound = (): void => playSfx("level");
