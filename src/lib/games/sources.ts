/**
 * Automatische Angaben aus allen Quellen (Steam + IGDB) — nur serverseitig.
 * Jede Quelle darf ausfallen; solange eine antwortet, gibt es einen Entwurf.
 */

import { combineDrafts, type FieldSources, type GameDraft } from "./draft";
import { fetchIgdbGameDraft, findIgdbGameBySteamId, igdbConfigured } from "./igdb";
import { fetchSteamGameDraft } from "./steam";

export interface CombinedDraftResult {
  combined: { draft: GameDraft; sources: FieldSources } | null;
  /** Mindestens eine angefragte Quelle war nicht erreichbar */
  sourceError: boolean;
  /** Alle angefragten Quellen waren nicht erreichbar → "nicht gefunden" ist nicht sicher */
  allFailed: boolean;
}

export async function fetchCombinedDraft(ids: { steamAppId?: number | null; igdbId?: number | null }): Promise<CombinedDraftResult> {
  let steam: GameDraft | null = null;
  let igdb: GameDraft | null = null;
  let tried = 0;
  let failed = 0;

  const attempt = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    tried++;
    try { return await fn(); } catch (err) { failed++; console.error("[games] Quelle nicht erreichbar", err); return null; }
  };

  const steamAppId = ids.steamAppId ?? null;
  const igdbId = ids.igdbId ?? null;

  const [s, i] = await Promise.all([
    steamAppId ? attempt(() => fetchSteamGameDraft(steamAppId)) : null,
    igdbId
      ? attempt(() => fetchIgdbGameDraft(igdbId))
      : steamAppId && igdbConfigured() ? attempt(() => findIgdbGameBySteamId(steamAppId)) : null,
  ]);
  steam = s;
  igdb = i;

  // Nur IGDB bekannt, aber IGDB kennt die Steam-Seite → Steam (deutsche Beschreibung, Cover) dazuholen
  if (!steamAppId && igdb?.steamAppId) {
    const id = igdb.steamAppId;
    steam = await attempt(() => fetchSteamGameDraft(id));
  }

  return { combined: combineDrafts(steam, igdb), sourceError: failed > 0, allFailed: tried > 0 && failed === tried };
}
