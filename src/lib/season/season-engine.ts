// ============================================
// Saison-Engine — Community-Karten-Berechnung
// ============================================
// Berechnet für jedes Community-Mitglied:
//  1. Aktivitäts-Stufe (Ghost...Old Master) → Stat-Multiplikator
//  2. Klasse (Tank/DamageDealer/Support) → aus drei Perzentil-Säulen
//
// Respektiert Overrides: Felder in card.overriddenFields werden
// NICHT verändert.

import type { CardClass, ActivityTier } from "@prisma/client";

// ---------- Rohdaten, die pro Mitglied angeliefert werden müssen ----------

export interface MemberSeasonInput {
  userId: string;
  discordId: string;
  currentClass: CardClass | null; // bisherige Klasse, für Trägheitsregel
  currentTier: ActivityTier | null; // bisherige Stufe, für Sprungbegrenzung

  // Aktivitäts-Rohdaten (für Stufe)
  eventCount: number;
  questCount: number;

  // DD-Säule
  eventWins: number;
  eventStatsScore: number; // z.B. normalisierte Kills/Tore/Scoring, vorab aggregiert

  // Support-Säule
  surveyParticipations: number;
  donationAmount: number;
  lobbyActivityScore: number; // z.B. Nachrichtenanzahl, vorab aggregiert

  // Tank-Säule
  // (eventCount wird hier wiederverwendet — Teilnahmen in der Saison)
}

export interface MemberSeasonResult {
  userId: string;
  activityTier: ActivityTier;
  statMultiplier: number;
  cardClass: CardClass;
}

// ---------- Konstanten ----------

const TIER_ORDER: ActivityTier[] = ["GHOST", "NPC", "GAMER", "LEGENDE", "OLD_MASTER"];

export const TIER_MULTIPLIER: Record<ActivityTier, number> = {
  GHOST: 0.85,
  NPC: 1.0,
  GAMER: 1.15,
  LEGENDE: 1.3,
  OLD_MASTER: 1.45,
};

// Perzentil-Obergrenzen (inklusive) je Stufe, in Prozent
const TIER_PERCENTILE_CEILING: { tier: ActivityTier; ceiling: number }[] = [
  { tier: "GHOST", ceiling: 35 },
  { tier: "NPC", ceiling: 50 },
  { tier: "GAMER", ceiling: 70 },
  { tier: "LEGENDE", ceiling: 95 },
  { tier: "OLD_MASTER", ceiling: 100 },
];

const MAX_TIER_JUMP = 1; // max. Stufen-Sprung pro Saison
const CLASS_TIE_THRESHOLD = 10; // Perzentil-Punkte, unter denen die alte Klasse bleibt

// ---------- Hilfsfunktionen ----------

/** Berechnet für ein Array von Rohwerten die Perzentil-Ränge (0-100). */
function computePercentiles(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [100];

  // Index-sortierte Reihenfolge nach Wert aufsteigend
  const sortedIndices = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);

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

/** Bestimmt die Klasse aus drei Perzentil-Werten, mit Trägheitsregel bei knappem Vorsprung. */
function resolveClass(
  ddPercentile: number,
  supportPercentile: number,
  tankPercentile: number,
  currentClass: CardClass | null
): CardClass {
  const scores: { cls: CardClass; value: number }[] = [
    { cls: "DAMAGE_DEALER", value: ddPercentile },
    { cls: "SUPPORT", value: supportPercentile },
    { cls: "TANK", value: tankPercentile },
  ];

  scores.sort((a, b) => b.value - a.value);
  const [highest, secondHighest] = scores;

  if (
    currentClass &&
    highest.value - secondHighest.value < CLASS_TIE_THRESHOLD
  ) {
    return currentClass;
  }

  return highest.cls;
}

// ---------- Hauptfunktion ----------

/**
 * Berechnet Aktivitäts-Stufe und Klasse für alle Community-Mitglieder einer Saison.
 * Gibt für jedes Mitglied ein Ergebnis zurück — das Anwenden auf die Card-Datensätze
 * (unter Berücksichtigung von overriddenFields) passiert im Aufrufer.
 */
export function computeSeasonResults(
  members: MemberSeasonInput[]
): MemberSeasonResult[] {
  const n = members.length;
  if (n === 0) return [];

  // ---- 1. Aktivitäts-Perzentil (Events + Quests) ----
  const activityRaw = members.map((m) => m.eventCount + m.questCount);
  const activityPercentiles = computePercentiles(activityRaw);

  // ---- 2. Klassen-Säulen-Perzentile ----
  const ddRaw = members.map((m) => m.eventWins + m.eventStatsScore);
  const supportRaw = members.map(
    (m) => m.surveyParticipations + m.donationAmount + m.lobbyActivityScore
  );
  const tankRaw = members.map((m) => m.eventCount);

  const ddPercentiles = computePercentiles(ddRaw);
  const supportPercentiles = computePercentiles(supportRaw);
  const tankPercentiles = computePercentiles(tankRaw);

  // ---- 3. Pro Mitglied zusammenführen ----
  return members.map((m, i) => {
    const hadZeroParticipation = activityRaw[i] === 0;

    const rawTier = tierFromPercentile(activityPercentiles[i], hadZeroParticipation);
    const activityTier = applyTierJumpLimit(
      m.currentTier,
      rawTier,
      hadZeroParticipation
    );

    const cardClass = resolveClass(
      ddPercentiles[i],
      supportPercentiles[i],
      tankPercentiles[i],
      m.currentClass
    );

    return {
      userId: m.userId,
      activityTier,
      statMultiplier: TIER_MULTIPLIER[activityTier],
      cardClass,
    };
  });
}
