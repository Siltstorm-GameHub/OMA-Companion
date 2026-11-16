// Platzierungsbelohnungen — welche Werte der Event-Abschluss (/api/admin/events/[id]/complete) auszahlt,
// beschreibt eventPayout() unten (Einzel-Event: Event.placementRewardsJson, Reihen-Termin: Reihentabelle). Das frühere
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

export interface EventPayout {
  /** Münzen fürs Mitspielen in DIESEM Event */
  participationCoins: number;
  /** Was die Platzierung in DIESEM Event bringt (Reihen-Termin: "Platzierungs-Bonus je Event", nur Münzen) */
  placements: PlacementReward[];
  /** Nur Reihen-Termine: Belohnungen der Endwertung — gibt es erst zum Abschluss der Reihe */
  seriesFinal: PlacementReward[] | null;
}

/**
 * Was ein einzelnes Event wirklich auszahlt — dieselbe Unterscheidung wie der Event-Abschluss
 * (/api/admin/events/[id]/complete):
 * - Einzel-Event: Teilnahme- und Platzierungs-Belohnungen aus Event.placementRewardsJson.
 * - Reihen-Termin: Teilnahme-Münzen und "Platzierungs-Bonus je Event" aus der Reihentabellen-
 *   Konfiguration (seriesStatConfig: participationCoins, eventPlacementCoins). Die Platzierungs-
 *   Belohnungen der Reihe (placementRewardsJson) zahlt erst der Reihen-Abschluss — der Assistent
 *   schreibt sie zwar auch ins Event, ausgezahlt werden sie dort aber nicht.
 */
export function eventPayout(ev: {
  seriesId: string | null;
  placementRewardsJson: string | null;
  pointReward?: number | null;
  series?: { seriesStatConfig?: string | null; placementRewardsJson?: string | null } | null;
}): EventPayout {
  if (ev.seriesId) {
    let cfg: { participationCoins?: number; eventPlacementCoins?: { place: number; coins: number }[] } = {};
    try { cfg = ev.series?.seriesStatConfig ? JSON.parse(ev.series.seriesStatConfig) : {}; } catch { /* kaputt → nichts */ }
    return {
      participationCoins: Number(cfg.participationCoins) || 0,
      placements: (cfg.eventPlacementCoins ?? [])
        .map(p => ({ place: Number(p.place), coins: Number(p.coins) || 0, rankPoints: 0 }))
        .filter(p => p.coins > 0)
        .sort((a, b) => a.place - b.place),
      seriesFinal: (parsePlacementRewards(ev.series?.placementRewardsJson) ?? []).filter(p => p.coins > 0 || p.rankPoints > 0),
    };
  }
  let participationCoins = ev.pointReward ?? 0;
  try {
    const r = ev.placementRewardsJson ? JSON.parse(ev.placementRewardsJson) as { participationCoins?: number } : null;
    if (r?.participationCoins != null) participationCoins = Number(r.participationCoins) || 0;
  } catch { /* ignore */ }
  return {
    participationCoins,
    placements: (parsePlacementRewards(ev.placementRewardsJson) ?? []).filter(p => p.coins > 0 || p.rankPoints > 0).sort((a, b) => a.place - b.place),
    seriesFinal: null,
  };
}

/** Was DIESES Event für einen Platz auszahlt (siehe eventPayout) — 0/0, wenn der Platz nichts bringt. */
export function payoutForPlace(payout: EventPayout, place: number): { coins: number; rankPoints: number } {
  const hit = payout.placements.find(p => p.place === place);
  return { coins: hit?.coins ?? 0, rankPoints: hit?.rankPoints ?? 0 };
}

