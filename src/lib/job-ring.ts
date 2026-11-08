/**
 * Farben der Ansehens-Stufen (Bronze, Silber, Gold, Platin) — für die Ansehens-Karte im Profil.
 * Der frühere Ansehens-Ring ums Profilbild ist durch kaufbare Rahmen aus dem Kosmetik-Shop ersetzt
 * (lib/cosmetics); Ansehen schaltet stattdessen Titel frei (siehe catalog.ts, "title:rep-…").
 */

export const GOLD = "#fbbf24";

/** Grundfarbe je Stufe (Index 0 = Stufe 1). */
export const REPUTATION_COLORS: readonly string[] = ["#cd7f32", "#c0c7d1", GOLD, "#a5f3fc"];

export function reputationColor(level: number): string {
  return REPUTATION_COLORS[Math.min(4, Math.max(1, level)) - 1];
}
