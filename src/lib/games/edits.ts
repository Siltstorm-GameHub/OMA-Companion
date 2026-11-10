/**
 * Ergänzungen durch Mitglieder — client-sicher.
 *
 * Mitglieder dürfen nur LEERE Angaben füllen (nichts überschreiben). Jede Ergänzung landet im
 * Protokoll (GameEdit), das Team kann sie im Admin-Bereich zurücksetzen.
 */

import type { GameFields } from "./draft";
import { GAME_GENRES, GAME_MODES, GAME_PLATFORMS, SESSION_LENGTHS, labelOf } from "./options";

export const FILLABLE_FIELDS = ["modes", "minPlayers", "maxPlayers", "platforms", "sessionLength", "genres", "isFree"] as const;
export type FillableField = (typeof FILLABLE_FIELDS)[number];

export const FIELD_LABELS: Record<FillableField, string> = {
  modes: "Spielmodus",
  minPlayers: "Spieler (min.)",
  maxPlayers: "Spieler (max.)",
  platforms: "Plattformen",
  sessionLength: "Rundenlänge",
  genres: "Genre",
  isFree: "Kosten",
};

/** Ergänzungen pro Mitglied und 24 h (Moderatoren unbegrenzt) */
export const DAILY_FILL_LIMIT = 30;

export function isEmptyValue(v: unknown): boolean {
  return v === null || v === undefined || (Array.isArray(v) && v.length === 0);
}

export function missingFields(f: GameFields): FillableField[] {
  return FILLABLE_FIELDS.filter(field => isEmptyValue(f[field]));
}

/** Anzeige eines gespeicherten Werts ("Koop, Gegeneinander", "4", "Kostenlos" …) */
export function formatFieldValue(field: string, value: unknown): string {
  if (isEmptyValue(value)) return "–";
  if (field === "isFree") return value ? "Kostenlos" : "Kostenpflichtig";
  if (field === "sessionLength") return labelOf(SESSION_LENGTHS, String(value)) ?? String(value);
  const options = field === "modes" ? GAME_MODES : field === "platforms" ? GAME_PLATFORMS : field === "genres" ? GAME_GENRES : null;
  if (options && Array.isArray(value)) return value.map(v => labelOf(options, String(v)) ?? String(v)).join(", ");
  return String(value);
}

/**
 * Welche Felder eine Ergänzung tatsächlich setzt: nur zuvor leere, nur mit Wert, und die
 * Spieleranzahl nur, wenn sie zum schon bekannten Gegenstück passt (min ≤ max).
 */
export function applicableFills(current: GameFields, proposed: GameFields): Partial<GameFields> {
  const out: Partial<GameFields> = {};
  for (const field of FILLABLE_FIELDS) {
    if (!isEmptyValue(current[field]) || isEmptyValue(proposed[field])) continue;
    (out as Record<string, unknown>)[field] = proposed[field];
  }
  const min = out.minPlayers ?? current.minPlayers;
  const max = out.maxPlayers ?? current.maxPlayers;
  if (min != null && max != null && min > max) {
    // Widerspruch zu einer bestehenden Angabe → die neue Zahl verwerfen
    if (out.minPlayers !== undefined && out.maxPlayers === undefined) delete out.minPlayers;
    else if (out.maxPlayers !== undefined && out.minPlayers === undefined) delete out.maxPlayers;
  }
  return out;
}
