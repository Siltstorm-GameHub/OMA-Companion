// ============================================
// Battle Cards — Post-Kampf-Statistik (Schaden/Heilung pro Karte + MVP)
// ============================================
// Reine Ableitung aus einem bereits aufgelösten battleLog — keine DB-
// Abhängigkeit, nutzbar sowohl serverseitig (Replay-Seite) als auch clientseitig.

import type { BattleLogEntry, RosterEntry } from "@/lib/battle-engine/types";

export interface UnitBattleStats {
  instanceId: string;
  damageDealt: number;
  healingDone: number;
  damageTaken: number;
}

export function computeBattleStats(log: BattleLogEntry[], roster: RosterEntry[]): UnitBattleStats[] {
  const map = new Map<string, UnitBattleStats>();
  for (const r of roster) {
    map.set(r.instanceId, { instanceId: r.instanceId, damageDealt: 0, healingDone: 0, damageTaken: 0 });
  }

  for (const e of log) {
    if (e.type === "damage") {
      const source = map.get(e.sourceId);
      if (source) source.damageDealt += e.amount;
      const target = map.get(e.targetId);
      if (target) target.damageTaken += e.amount;
    } else if (e.type === "heal") {
      const source = map.get(e.sourceId);
      if (source) source.healingDone += e.amount;
    }
  }

  return Array.from(map.values());
}

/** Kombinierter Score aus Schaden + Heilung — sonst könnten Support-Karten nie MVP werden. */
function score(s: UnitBattleStats): number {
  return s.damageDealt + s.healingDone;
}

export function findMvpId(stats: UnitBattleStats[]): string | null {
  let best: UnitBattleStats | null = null;
  for (const s of stats) {
    if (score(s) <= 0) continue;
    if (!best || score(s) > score(best)) best = s;
  }
  return best?.instanceId ?? null;
}
