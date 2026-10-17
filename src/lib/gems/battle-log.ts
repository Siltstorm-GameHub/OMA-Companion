// ============================================
// Battle.battleLog — gespeicherte Replay-Daten
// ============================================
// battleLog speichert log UND roster zusammen (nicht nur log) — sonst lässt
// sich ein Kampf später nicht mehr replayen (Namen/Klassen/MaxHP der
// Einheiten wären verloren). Wichtig für Battle-Cards-Duelle: der
// Herausforderer sieht das Ergebnis nicht live, sondern lädt es später über
// die gespeicherte battleId.

import type { Prisma } from "@prisma/client";
import type { BattleLogEntry, RosterEntry } from "@/lib/battle-engine/types";

export interface StoredBattleLog {
  log: BattleLogEntry[];
  roster: RosterEntry[];
}

export function serializeBattleLog(log: BattleLogEntry[], roster: RosterEntry[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify({ log, roster }));
}

export function isStoredBattleLog(value: unknown): value is StoredBattleLog {
  return !!value && typeof value === "object" && "log" in value && "roster" in value;
}
