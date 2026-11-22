// Platzierung gibt es nur bei Turnieren. Community-Events (type "community") haben beim Abschluss
// keine Rangliste, keinen Sieger und keine Platzierungs-Belohnungen — nur Teilnahme-Münzen und
// Teilnahme-Rang-Punkte (bzw. in einer Eventreihe die Teilnahme-Tabellenpunkte).

export type EventKind = "community" | "tournament";

/** Hat dieses Event eine Endplatzierung? Alles außer Community-Events (Turniere, Altbestand). */
export function eventHasPlacement(ev: { type?: string | null }): boolean {
  return ev.type !== "community";
}

/** Gültiger Event-Typ aus Request-Daten, sonst null */
export function parseEventKind(value: unknown): EventKind | null {
  return value === "community" || value === "tournament" ? value : null;
}

/** Anzeige des Event-Typs (Badge auf Karten, Auswahl im Bearbeiten) */
export const EVENT_KIND_LABEL: Record<EventKind, { emoji: string; label: string }> = {
  community:  { emoji: "🤝", label: "Ohne Platzierung" },
  tournament: { emoji: "🏆", label: "Mit Platzierung" },
};

export const eventKindOf = (ev: { type?: string | null }): EventKind => (eventHasPlacement(ev) ? "tournament" : "community");

/**
 * Was ein User beim Abschluss fürs Mitmachen bekommen hat — aus completionData.rewardLedger
 * (Teilnahme-Münzen/-Rang-Punkte, Zuschauer-Belohnung). null, wenn er nichts bekam oder nicht dabei war.
 */
export function participationRewardOf(
  completionDataJson: string | null | undefined,
  userId: string | null | undefined,
): { coins: number; rankPoints: number } | null {
  if (!completionDataJson || !userId) return null;
  let ledger: {
    participationCoins?: Record<string, number>;
    participationRankPoints?: Record<string, number>;
    spectatorRewards?: Record<string, { coins?: number; rankPoints?: number }>;
  } | undefined;
  try { ledger = (JSON.parse(completionDataJson) as { rewardLedger?: typeof ledger })?.rewardLedger ?? undefined; } catch { return null; }
  if (!ledger) return null;
  const coins = (ledger.participationCoins?.[userId] ?? 0) + (ledger.spectatorRewards?.[userId]?.coins ?? 0);
  const rankPoints = (ledger.participationRankPoints?.[userId] ?? 0) + (ledger.spectatorRewards?.[userId]?.rankPoints ?? 0);
  return coins > 0 || rankPoints > 0 ? { coins, rankPoints } : null;
}

/** "+20 Münzen · +2 RP" — leer, wenn nichts */
export function rewardLabel(r: { coins: number; rankPoints: number } | null): string {
  if (!r) return "";
  return [r.coins > 0 ? `+${r.coins} Münzen` : null, r.rankPoints > 0 ? `+${r.rankPoints} RP` : null].filter(Boolean).join(" · ");
}

/**
 * Alles, was ein User für dieses Event bekommen hat: Teilnahme (bzw. Zuschauer) + Platzierung.
 * Aus completionData.rewardLedger (vom Event-Abschluss geschrieben). null = nichts.
 */
export function eventRewardOf(
  completionDataJson: string | null | undefined,
  userId: string | null | undefined,
): { coins: number; rankPoints: number } | null {
  if (!completionDataJson || !userId) return null;
  let placement: { coins?: number; rankPoints?: number } | undefined;
  try {
    placement = (JSON.parse(completionDataJson) as { rewardLedger?: { placementRewards?: Record<string, { coins?: number; rankPoints?: number }> } })
      ?.rewardLedger?.placementRewards?.[userId];
  } catch { return null; }
  const base = participationRewardOf(completionDataJson, userId) ?? { coins: 0, rankPoints: 0 };
  const coins = base.coins + (placement?.coins ?? 0);
  const rankPoints = base.rankPoints + (placement?.rankPoints ?? 0);
  return coins > 0 || rankPoints > 0 ? { coins, rankPoints } : null;
}
