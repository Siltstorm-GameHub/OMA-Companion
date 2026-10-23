// Platzierungsbelohnungen — EINZIGE Quelle ist Event.placementRewardsJson (Fallback: die der Reihe).
// Genau diese Werte zahlt der Event-Abschluss (/api/admin/events/[id]/complete) aus. Das frühere
// Event.pointsConfig mit Münzen/Punkten je Platz wird nicht mehr ausgezahlt und nicht mehr angezeigt;
// pointsConfig trägt nur noch die Sieg/Unentschieden-Münzen pro Match im Liga-Modus ({ win, draw }).

export type PlacementReward = { place: number; coins: number; rankPoints: number };

export function parsePlacementRewards(json: string | null | undefined): PlacementReward[] | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as { placements?: unknown };
    if (!Array.isArray(raw.placements)) return null;
    return raw.placements
      .filter((p): p is PlacementReward => !!p && typeof p === "object" && Number.isFinite(Number((p as PlacementReward).place)))
      .map(p => ({ place: Number(p.place), coins: Number(p.coins) || 0, rankPoints: Number(p.rankPoints) || 0 }));
  } catch { return null; }
}

/** Belohnung für einen Platz — Event-Konfiguration vor Reihen-Konfiguration. */
export function placementRewardFor(
  place: number,
  eventJson: string | null | undefined,
  seriesJson?: string | null,
): { coins: number; rankPoints: number } {
  const list = parsePlacementRewards(eventJson) ?? parsePlacementRewards(seriesJson) ?? [];
  const hit = list.find(p => p.place === place);
  return { coins: hit?.coins ?? 0, rankPoints: hit?.rankPoints ?? 0 };
}
