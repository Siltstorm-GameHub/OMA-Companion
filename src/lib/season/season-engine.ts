// ============================================
// Saison-Engine — Aktivitäts-Stufen der Community-Karten
// ============================================
// Berechnet für jedes Community-Mitglied die Aktivitäts-Stufe (Ghost … Old Master) aus seinen
// Events und Quests. Die Klasse (Tank/Damage Dealer/Support) kommt NICHT mehr aus der Aktivität,
// sondern aus der Helden-Einrichtung: das Mitglied wählt eine Klasse und würfelt die Werte selbst
// (siehe lib/battle-cards/hero-setup.ts, lib/dnd/class-mapping.ts). Die Saison ändert daran nichts.

import type { ActivityTier } from "@prisma/client";

// ---------- Rohdaten, die pro Mitglied angeliefert werden müssen ----------

export interface MemberSeasonInput {
  userId: string;
  discordId: string;
  currentTier: ActivityTier | null; // bisherige Stufe, für Sprungbegrenzung
  eventCount: number; // besuchte Events
  questCount: number; // abgeschlossene Quests
}

export interface MemberSeasonResult {
  userId: string;
  activityTier: ActivityTier;
}

// ---------- Konstanten ----------

const TIER_ORDER: ActivityTier[] = ["GHOST", "NPC", "GAMER", "LEGENDE", "OLD_MASTER"];

// Perzentil-Obergrenzen (inklusive) je Stufe, in Prozent
const TIER_PERCENTILE_CEILING: { tier: ActivityTier; ceiling: number }[] = [
  { tier: "GHOST", ceiling: 35 },
  { tier: "NPC", ceiling: 50 },
  { tier: "GAMER", ceiling: 70 },
  { tier: "LEGENDE", ceiling: 95 },
  { tier: "OLD_MASTER", ceiling: 100 },
];

const MAX_TIER_JUMP = 1; // max. Stufen-Sprung pro Saison
// ---------- Hilfsfunktionen ----------

/** Einfacher, deterministischer String-Hash (djb2) — reicht für eine stabile Tiebreak-Reihenfolge. */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Berechnet für ein Array von Rohwerten die Perzentil-Ränge (0-100).
 *
 * `tieBreakKeys` (z.B. userId je Index) sorgt dafür, dass Mitglieder mit
 * identischem Rohwert (häufig: mehrere mit 0, z.B. bei der DD-Säule) nicht
 * einfach nach ursprünglicher Datenbank-Abfragereihenfolge sortiert werden —
 * das hätte manchen Mitgliedern rein zufällig, aber systematisch reproduzierbar
 * ein höheres Perzentil beschert als anderen mit exakt derselben Aktivität.
 * Stattdessen wird bei Gleichstand nach einem gehashten Schlüssel sortiert:
 * weiterhin deterministisch (gleiche Eingabe -> gleiches Ergebnis), aber
 * unabhängig von der DB-Reihenfolge.
 */
function computePercentiles(values: number[], tieBreakKeys?: string[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [100];

  // Index-sortierte Reihenfolge nach Wert aufsteigend, bei Gleichstand nach Tiebreak-Hash
  const sortedIndices = values
    .map((v, i) => ({ v, i, tb: tieBreakKeys ? hashSeed(tieBreakKeys[i]) : i }))
    .sort((a, b) => a.v - b.v || a.tb - b.tb);

  const percentiles = new Array(n).fill(0);
  sortedIndices.forEach((entry, rank) => {
    // rank 0 = niedrigster Wert -> Perzentil nahe 0
    percentiles[entry.i] = (rank / (n - 1)) * 100;
  });

  return percentiles;
}

function tierFromPercentile(percentile: number, hadZeroParticipation: boolean): ActivityTier {
  if (hadZeroParticipation) return "GHOST";
  const match = TIER_PERCENTILE_CEILING.find((t) => percentile <= t.ceiling);
  return match?.tier ?? "OLD_MASTER";
}

/** Begrenzt den Stufen-Sprung auf max. MAX_TIER_JUMP, außer bei genereller Inaktivität. */
function applyTierJumpLimit(
  oldTier: ActivityTier | null,
  newTier: ActivityTier,
  hadZeroParticipation: boolean
): ActivityTier {
  if (!oldTier || hadZeroParticipation) return newTier;

  const oldIdx = TIER_ORDER.indexOf(oldTier);
  const newIdx = TIER_ORDER.indexOf(newTier);
  const diff = newIdx - oldIdx;

  if (Math.abs(diff) <= MAX_TIER_JUMP) return newTier;

  const clampedIdx = oldIdx + Math.sign(diff) * MAX_TIER_JUMP;
  return TIER_ORDER[clampedIdx];
}

// ---------- Hauptfunktion ----------

/**
 * Berechnet die Aktivitäts-Stufe für alle Community-Mitglieder einer Saison (Perzentil aus Events +
 * Quests, max. ±1 Stufe pro Lauf, Ghost bei null Aktivität). Das Anwenden auf die Card-Datensätze
 * passiert im Aufrufer.
 */
export function computeSeasonResults(members: MemberSeasonInput[]): MemberSeasonResult[] {
  if (members.length === 0) return [];

  const tieBreakKeys = members.map((m) => m.userId);
  const activityRaw = members.map((m) => m.eventCount + m.questCount);
  const activityPercentiles = computePercentiles(activityRaw, tieBreakKeys);

  return members.map((m, i) => {
    const hadZeroParticipation = activityRaw[i] === 0;
    const rawTier = tierFromPercentile(activityPercentiles[i], hadZeroParticipation);
    return {
      userId: m.userId,
      activityTier: applyTierJumpLimit(m.currentTier, rawTier, hadZeroParticipation),
    };
  });
}
