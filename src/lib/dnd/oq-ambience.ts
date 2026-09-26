// ============================================
// OMA Quest — Ambiente (rein): welche Geräuschkulisse zu welcher Location, welchem Innenraum und welchem Wetter gehört
// ============================================
// Jede Location hat höchstens ein Grundgeräusch (Wald, Meer, Stadt …); Innenräume bringen ihr eigenes mit (Taverne = Stimmengewirr,
// Schmiede = Werkstatt, sonst still), und bei Regen, Sturm oder Schnee legt sich draußen eine Wetter-Schicht darüber.

import { AMBIENCE_LABELS, type AmbienceKey } from "./oq-assets-manifest";
import type { Weather } from "../te-map/rpg";

export { AMBIENCE_LABELS, type AmbienceKey };
export const AMBIENCE_KEYS = Object.keys(AMBIENCE_LABELS) as AmbienceKey[];
export const isAmbienceKey = (v: unknown): v is AmbienceKey => typeof v === "string" && v in AMBIENCE_LABELS;

/** Innenraum-Vorlage → Geräuschkulisse (ohne Eintrag: drinnen still, das Draußen verstummt). */
export const TEMPLATE_AMBIENCE: Record<string, AmbienceKey> = { taverne: "tavern", schmiede: "forge", lager: "rocks" };

/** Wetter-Schicht über der Location (nur draußen). */
export function weatherLayer(weather: Weather): AmbienceKey | null {
  return weather === "rain" || weather === "storm" ? "rain" : weather === "snow" ? "snowstorm" : null;
}

/** Feste Locations (Slug → Geräuschkulisse). */
export const FIXED_AMBIENCE: Record<string, AmbienceKey> = {
  hafenstadt: "town", waldpfad: "forest", kuestenstrasse: "waves", bergpass: "mountain", ruinen: "creepy", verlassenes_dorf: "wind",
  schmugglerhoehle: "cave", zwergenfeste: "forge", frostgipfel: "mountain", sumpf: "swamp",
};

/** Was gerade zu hören sein soll. `interiorTemplate` = Vorlage des Innenraums, in dem man steht (null = draußen). */
export function desiredAmbience(o: { bed: string | undefined | null; interiorTemplate: string | null; indoors: boolean; weather: Weather }): { bed: AmbienceKey | null; layer: AmbienceKey | null } {
  if (o.indoors) return { bed: o.interiorTemplate ? TEMPLATE_AMBIENCE[o.interiorTemplate] ?? null : null, layer: null };
  return { bed: isAmbienceKey(o.bed) ? o.bed : null, layer: weatherLayer(o.weather) };
}
