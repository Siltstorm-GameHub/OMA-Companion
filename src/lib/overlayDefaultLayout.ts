import type { ElementKey } from "@/app/overlay/[id]/OverlayClient";

/** Positionen (Prozent von 1920×1080) für einen automatisch generierten Vollstaendig-Layout-Link
 *  — identisch zu den Ausgangspositionen in SettingsClient.tsx (DEFAULT_POSITIONS), nur hier
 *  eigenstaendig gehalten, weil SettingsClient eine Client-Komponente ist und dieses Modul auch
 *  serverseitig (buildOverlayUrl) importiert wird. */
const DEFAULT_POSITIONS: Record<ElementKey, { x: number; y: number }> = {
  brand:        { x: 1.5,  y: 90.6 },
  liveinfo:     { x: 19,   y: 90.6 },
  ticker:       { x: 40,   y: 90.6 },
  bracket:      { x: 66,   y: 2.6 },
  table:        { x: 74.6, y: 2.6 },
  seriesTable:  { x: 74.6, y: 2.6 },
  participants: { x: 74.6, y: 2.6 },
  favorites:    { x: 5,    y: 40 },
  badges:       { x: 5,    y: 63 },
};

const ELIMINATION_FORMATS = ["single_elimination", "double_elimination"];

/**
 * Baut den `layout`-Query-Parameter für einen ohne Overlay-Einstellungsseite generierten Link
 * (z.B. den vom Turnier-Widget automatisch gezogenen Link) — mit ALLEN fürs Format relevanten
 * Elementen von Anfang an aktiv, analog zum Default-Zustand von SettingsClient.tsx (dort startet
 * `enabled` ja ebenfalls mit allen relevanten Elementen). Ohne diesen Parameter faellt die
 * Overlay-Seite auf das alte, sehr eingeschraenkte Legacy-Layout zurueck (nur Brand+Ticker+ein
 * rotierendes Panel), in dem liveinfo/favorites/badges gar nicht erst gerendert werden — die
 * Sichtbarkeits-Schalter im Widget haetten fuer diese Elemente dann nie eine Wirkung.
 *
 * favorites/badges bleiben hier aussen vor: sie haengen vom Profil eines konkreten Streamers ab
 * (?streamer=... Parameter), den ein generischer Event-Link nicht kennt, und wuerden ohnehin
 * ohne Streamer-Kontext leer bleiben. Wer sie will, richtet sich einen personalisierten Link in
 * den Overlay-Einstellungen der App ein.
 *
 * `hasSeries`: gehoert das Event zu einer Eventreihe, wird "seriesTable" (Gesamttabelle) auf
 * dieselbe Position wie "table"/"participants" gelegt — alle drei stapeln sich dann automatisch
 * zu einer rotierenden Gruppe, ohne dass der Streamer das erst manuell zusammenziehen muss.
 */
export function buildDefaultLayoutParam(format: string | null, hasSeries: boolean = false): string {
  const isElimination = !!format && ELIMINATION_FORMATS.includes(format);
  const keys: ElementKey[] = ["brand", "liveinfo", "ticker", isElimination ? "bracket" : "table", "participants"];
  if (hasSeries) keys.push("seriesTable");
  return keys
    .map(key => `${key}:${DEFAULT_POSITIONS[key].x},${DEFAULT_POSITIONS[key].y}`)
    .join(";");
}
