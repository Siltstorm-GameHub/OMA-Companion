/**
 * Ergänzungen und Korrekturen durch Mitglieder — client-sicher.
 *
 * Mitglieder dürfen leere Angaben füllen und bei Spielerzahl, Rundenlänge, Plattformen und Crossplay
 * auch Fehler korrigieren (OVERWRITABLE_FIELDS) — alles andere bleibt, wie es ist; Preise und Cover kommen
 * ohnehin von Steam. Jede Änderung landet im Protokoll (GameEdit), das Team kann sie im Admin-Bereich
 * zurücksetzen.
 */

import type { GameFields } from "./draft";
import { GAME_GENRES, GAME_MODES, GAME_PLATFORMS, SESSION_LENGTHS, labelOf } from "./options";

export const FILLABLE_FIELDS = ["modes", "minPlayers", "maxPlayers", "platforms", "crossplay", "sessionLength", "genres", "isFree"] as const;
export type FillableField = (typeof FILLABLE_FIELDS)[number];

export const FIELD_LABELS: Record<FillableField, string> = {
  modes: "Spielmodus",
  minPlayers: "Spieler (min.)",
  maxPlayers: "Spieler (max.)",
  platforms: "Plattformen",
  crossplay: "Crossplay",
  sessionLength: "Rundenlänge",
  genres: "Genre",
  isFree: "Kosten",
};

/** Felder, die Mitglieder auch korrigieren (überschreiben) dürfen, nicht nur ergänzen */
export const OVERWRITABLE_FIELDS: readonly FillableField[] = ["minPlayers", "maxPlayers", "sessionLength", "platforms", "crossplay"];

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
  if (field === "crossplay") return value ? "Ja" : "Nein";
  if (field === "sessionLength") return labelOf(SESSION_LENGTHS, String(value)) ?? String(value);
  const options = field === "modes" ? GAME_MODES : field === "platforms" ? GAME_PLATFORMS : field === "genres" ? GAME_GENRES : null;
  if (options && Array.isArray(value)) return value.map(v => labelOf(options, String(v)) ?? String(v)).join(", ");
  return String(value);
}

/**
 * Welche Felder eine Ergänzung bzw. Korrektur tatsächlich setzt: zuvor leere, bei OVERWRITABLE_FIELDS
 * auch belegte (wenn sich der Wert ändert), nie leeren, und die Spieleranzahl nur, wenn sie zum
 * Gegenstück passt (min ≤ max).
 */
export function applicableFills(current: GameFields, proposed: GameFields): Partial<GameFields> {
  const out: Partial<GameFields> = {};
  for (const field of FILLABLE_FIELDS) {
    if (isEmptyValue(proposed[field])) continue;
    if (!isEmptyValue(current[field]) && !OVERWRITABLE_FIELDS.includes(field)) continue;
    if (JSON.stringify(current[field]) === JSON.stringify(proposed[field])) continue;
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
