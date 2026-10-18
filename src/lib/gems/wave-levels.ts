// ============================================
// OMA Gems — Last Stand: die Gegner-Wellen
// ============================================
// Last Stand ist der Wellenmodus nach der Kampagne: Sind die fünf Gegner besiegt, erscheinen fünf neue —
// so lange, bis die eigenen Helden gefallen sind. Jede Welle wird rein aus ihrer Nummer erzeugt
// (deterministischer Zufall wie im Aufstieg, siehe endless-levels.ts): alle Spieler treffen auf dieselben
// Wellen, die Saison-Rangliste bleibt fair, und es muss nichts gespeichert werden.
//
// Die Stärke folgt den Kurven des Aufstiegs (gleiche Monster-Normierung, endlessStatMultiplier und
// endlessAttackMultiplier), nur eigenständig kalibriert: Welle w hat die Stärke der (gedachten)
// Aufstiegs-Stufe WAVE_FIRST_STAGE + (w − 1) · WAVE_STAGE_STEP. Die Helden behalten ihr Leben von Welle zu
// Welle (nur etwas Heilung dazwischen), deshalb startet der Modus weit unter dem Aufstieg und steigt
// schneller. Jede 5. Welle ist eine Boss-Welle. Kalibriert mit scripts/simulate-campaign-balance.ts
// --laststand: der Bot mit Starterkarten auf Rang 1 besiegt im Median 12 Wellen (P10 5, P90 20) — ein
// Mensch kommt mit Kombos und Sonder-Steinen weiter.

import { createRng } from "@/lib/battle-engine/rng";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import type { CampaignLevelDef } from "./campaign-levels";
import {
  endlessAttackMultiplier,
  endlessStatMultiplier,
  ENDLESS_DEFENSE_MULTIPLIER,
  ENDLESS_MONSTER_LEVEL,
  rollTeam,
  round2,
} from "./endless-levels";
import { instantiateMonster } from "./monster-content";

/** Gedachte Aufstiegs-Stufe, deren Stärke Welle 1 entspricht (der Aufstieg selbst beginnt bei Stufe 13). */
export const WAVE_FIRST_STAGE = 4;
/** Um so viele Aufstiegs-Stufen wird jede weitere Welle stärker. */
export const WAVE_STAGE_STEP = 1.5;
/** Anteil der Max-Leben, den lebende Helden nach jeder besiegten Welle zurückbekommen. */
export const WAVE_HEAL_SHARE = 0.2;
/** Runden je Welle, bevor der Sudden-Death-Schaden beginnt. */
export const WAVE_ROUND_LIMIT = 12;
/** Jede so viele Wellen erscheint ein Boss. */
export const WAVE_BOSS_EVERY = 5;

const TAGLINES = [
  "Sie kommen immer noch.",
  "Der Respawn-Timer hat Feierabend.",
  "Nächster Trupp, gleicher Lag.",
  "Die Warteschlange ist lang.",
  "Wer steht, kämpft weiter.",
  "Auch Monster haben Reserven.",
];

export function isBossWave(wave: number): boolean {
  return wave % WAVE_BOSS_EVERY === 0;
}

/** (Gedachte) Aufstiegs-Stufe, deren Werte die Welle `wave` übernimmt. */
export function waveStage(wave: number): number {
  return WAVE_FIRST_STAGE + (wave - 1) * WAVE_STAGE_STEP;
}

/** Erzeugt Welle `wave` — für dieselbe Nummer immer exakt dieselbe Welle. */
export function generateWave(wave: number): CampaignLevelDef {
  const rng = createRng(0x517cc1b7 ^ wave);
  const boss = isBossWave(wave);
  const stage = waveStage(wave);
  const monsters = rollTeam(rng, 5, boss);
  return {
    id: `wave-${wave}`,
    order: wave,
    name: boss ? `Boss-Welle ${wave}` : `Welle ${wave}`,
    tagline: boss ? `${monsters[0].name} führt die Welle an.` : TAGLINES[Math.floor(rng() * TAGLINES.length)],
    monsters,
    level: ENDLESS_MONSTER_LEVEL,
    statMultiplier: round2(endlessStatMultiplier(stage)),
    attackMultiplier: round2(endlessAttackMultiplier(stage)),
    defenseMultiplier: ENDLESS_DEFENSE_MULTIPLIER,
    isBoss: boss,
  };
}

/** Die fertigen Kampf-Einheiten der Welle `wave`. */
export function buildWaveEnemies(wave: number): BattleUnitDefinition[] {
  const level = generateWave(wave);
  return level.monsters.map((m) =>
    instantiateMonster(m, level.level, level.statMultiplier, level.attackMultiplier, level.defenseMultiplier)
  );
}
