import { BRAND } from "@/lib/brand";

/**
 * Feste Farbwerte für Discord-Embeds — ein Ort für alle Farbentscheidungen,
 * statt verstreuter Hex-Literale pro Aufrufstelle (vorher: announceNewEvent
 * nutzte 0x4ade80, announceEventResults 0xfbbf24, Broadcasts 0x2dd4bf bzw.
 * 0x6366f1 — vier Werte ohne erkennbares gemeinsames System).
 *
 * Discord erwartet die Farbe als Zahl, nicht als Hex-String.
 */
function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export const DISCORD_COLORS = {
  /** Neues Event angekündigt — Markenfarbe Teal. */
  eventNew: hexToInt(BRAND.teal),
  /** Ergebnis-Post — dieselbe Goldfarbe wie Platz 1 im Sieger-Podium-Bild,
   *  damit Embed-Rand und Bildinhalt zusammengehören. */
  eventResult: 0xf59e0b,
  /** Umfragephase gestartet — dieselbe Amber-Farbe wie das "umfrage"-Statuslabel im Dashboard. */
  eventPoll: 0xfbbf24,
  /** Standard-Broadcasts ohne spezifischeren Typ (DM wie Kanal). */
  default: hexToInt(BRAND.teal),
} as const;
