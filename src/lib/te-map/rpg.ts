// ============================================
// OMA Quest — Regelwerk (rein): Attributs-Modifikatoren, Stufen, Würfelproben, Tageszeit
// ============================================
// Bewusst nah am Pen&Paper: d20 + Attribut-Modifikator + Stufen-Bonus + Ausrüstungs-Bonus gegen einen Schwierigkeitsgrad
// (SG). Eine natürliche 20 gelingt immer, eine natürliche 1 misslingt immer. Der Server würfelt (Client-Zufall wäre
// fälschbar); der Editor-Testlauf würfelt lokal mit denselben Funktionen.

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
export const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
export const ABILITY_LABEL: Record<Ability, string> = {
  str: "Stärke", dex: "Geschick", con: "Konstitution", int: "Intelligenz", wis: "Weisheit", cha: "Charisma",
};
export const ABILITY_SHORT: Record<Ability, string> = { str: "STR", dex: "GES", con: "KON", int: "INT", wis: "WEI", cha: "CHA" };

export const isAbility = (v: unknown): v is Ability => typeof v === "string" && (ABILITIES as string[]).includes(v);

/** Modifikator eines Attributwerts wie im Pen&Paper: 10 → 0, 14 → +2, 8 → −1. */
export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export const MAX_LEVEL = 20;
/** Erfahrung, ab der Stufe `level` erreicht ist (Stufe 1 = 0 XP, 2 = 40, 3 = 160, 4 = 360 …). */
export const xpForLevel = (level: number): number => 40 * (level - 1) ** 2;
export function levelOf(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++;
  return l;
}
/** Fortschritt in der aktuellen Stufe (0–1) für Anzeigen. */
export function levelProgress(xp: number): number {
  const l = levelOf(xp);
  if (l >= MAX_LEVEL) return 1;
  return (xp - xpForLevel(l)) / (xpForLevel(l + 1) - xpForLevel(l));
}
/** Stufen-Bonus auf Proben: +1 alle 3 Stufen. */
export const levelBonus = (level: number): number => Math.floor((level - 1) / 3);

export interface RollResult {
  roll: number;
  /** Attribut-Modifikator + Stufen-Bonus + Ausrüstung */
  modifier: number;
  total: number;
  dc: number;
  ability: Ability;
  success: boolean;
  crit: boolean;
  fumble: boolean;
  /** Natürliche 1, die durch „Glücksrabe“ neu gewürfelt wurde */
  rerolledFrom?: number;
}

export const rollD20 = (rng: () => number = Math.random): number => 1 + Math.floor(rng() * 20);

export function resolveCheck(input: { ability: Ability; dc: number; score: number; level: number; equipmentBonus?: number; rng?: () => number; roll?: number; critMin?: number; rerollFumble?: boolean }): RollResult {
  let roll = input.roll ?? rollD20(input.rng);
  let rerolledFrom: number | undefined;
  // Glücksrabe: eine natürliche 1 wird einmal neu gewürfelt
  if (input.rerollFumble && roll === 1) { rerolledFrom = 1; roll = rollD20(input.rng); }
  const modifier = abilityMod(input.score) + levelBonus(input.level) + (input.equipmentBonus ?? 0);
  const total = roll + modifier;
  const crit = roll >= (input.critMin ?? 20);
  const fumble = roll === 1;
  return { roll, modifier, total, dc: input.dc, ability: input.ability, success: crit || (!fumble && total >= input.dc), crit, fumble, ...(rerolledFrom ? { rerolledFrom } : {}) };
}

/** Schwierigkeitsgrade zur Orientierung im Editor. */
export const DC_PRESETS: { label: string; dc: number }[] = [
  { label: "Leicht (8)", dc: 8 }, { label: "Mittel (12)", dc: 12 }, { label: "Schwer (15)", dc: 15 }, { label: "Sehr schwer (18)", dc: 18 },
];

// ── Tageszeit ───────────────────────────────────────────────

/** Stunde (0–23) in Berlin. */
export function berlinHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Berlin" }).format(now));
}
/** Nacht = 21–6 Uhr, Dämmerung davor/danach. */
export const isNight = (hour: number): boolean => hour >= 21 || hour < 6;
/** Dunkelheit 0 (Tag) … 1 (tiefste Nacht) mit weichen Übergängen, für die Einfärbung der Welt. */
export function darkness(hour: number): number {
  if (hour >= 6 && hour < 18) return 0;
  if (hour >= 18 && hour < 21) return (hour - 18 + 0.5) / 3.5 * 0.7; // Abenddämmerung
  if (hour >= 21 || hour < 4) return 1;
  return Math.max(0, 1 - (hour - 4 + 0.5) / 2.5); // Morgendämmerung 4–6
}

// ── Wetter ──────────────────────────────────────────────────
// Deterministisch aus Ort und Zeit (3-Stunden-Fenster, Berliner Zeit unwichtig): alle Spieler sehen an einem Ort dasselbe
// Wetter, ohne dass etwas gespeichert oder per Cron gewechselt werden muss. Höhlen haben keines.

export type Weather = "clear" | "cloudy" | "rain" | "storm" | "fog" | "snow";
export const WEATHERS: Weather[] = ["clear", "cloudy", "rain", "storm", "fog", "snow"];
export const WEATHER_LABEL: Record<Weather, string> = { clear: "Klar", cloudy: "Wolkig", rain: "Regen", storm: "Sturm", fog: "Nebel", snow: "Schnee" };
export const WEATHER_ICON: Record<Weather, string> = { clear: "☀️", cloudy: "☁️", rain: "🌧️", storm: "⛈️", fog: "🌫️", snow: "❄️" };
export type Biome = "temperate" | "cold" | "dry" | "cave";

export const isWeather = (v: unknown): v is Weather => typeof v === "string" && (WEATHERS as string[]).includes(v);

/** Klimazone eines Hex-Geländes (Codes aus lib/dnd/hex/terrain.ts): Schnee kalt, Wüste/Asche trocken, sonst gemäßigt. */
export function biomeOfTerrain(code: string | null | undefined): Biome {
  return code === "s" ? "cold" : code === "d" || code === "a" ? "dry" : "temperate";
}

const WEIGHTS: Record<Exclude<Biome, "cave">, [Weather, number][]> = {
  temperate: [["clear", 0.4], ["cloudy", 0.2], ["rain", 0.2], ["fog", 0.1], ["storm", 0.1]],
  cold: [["clear", 0.3], ["cloudy", 0.2], ["snow", 0.4], ["fog", 0.1]],
  dry: [["clear", 0.7], ["cloudy", 0.2], ["fog", 0.1]], // Nebel = Staub
};

export const WEATHER_WINDOW_MS = 3 * 3600_000;

export function weatherFor(locationSlug: string, biome: Biome, now: Date = new Date()): Weather {
  if (biome === "cave") return "clear";
  const window = Math.floor(now.getTime() / WEATHER_WINDOW_MS);
  let h = 2166136261;
  for (const ch of `${locationSlug}:${window}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let r = (h % 10000) / 10000;
  for (const [w, p] of WEIGHTS[biome]) { r -= p; if (r < 0) return w; }
  return "clear";
}

/** Dialog-Bedingung: "rain" gilt auch bei Sturm; sonst genau dieses Wetter. */
export const weatherMatches = (wanted: Weather, actual: Weather): boolean => wanted === actual || (wanted === "rain" && actual === "storm");

/** Situationsmodifikator auf Proben: Sturm erschwert Stärke/Geschick, Nebel die Wahrnehmung (Weisheit), Schnee das Geschick. */
export function weatherModifier(weather: Weather, ability: Ability): number {
  if (weather === "storm" && (ability === "str" || ability === "dex")) return -1;
  if (weather === "fog" && ability === "wis") return -2;
  if (weather === "snow" && ability === "dex") return -1;
  return 0;
}

// ── Wind ────────────────────────────────────────────────────
// Reine Optik: Bäume, Büsche und Pflanzen wiegen sich (siehe TeWorld). Die Stärke hängt am Wetter; Höhlen und Innenräume haben keinen Wind.

/** Grundstärke des Winds 0 (Windstille) … 1 (Sturm). */
export const WIND_BASE: Record<Weather, number> = { clear: 0.3, cloudy: 0.45, rain: 0.65, storm: 1, fog: 0.15, snow: 0.4 };

/** Windstärke zum Zeitpunkt `tMs` (ms): Grundstärke mit langsamem Auf und Ab, bei Sturm zusätzlich Böen. */
export function windAt(weather: Weather, tMs: number): number {
  const base = WIND_BASE[weather];
  const drift = 0.8 + 0.2 * Math.sin(tMs / 2300);
  const gust = weather === "storm" ? 1 + 0.35 * Math.max(0, Math.sin(tMs / 1700)) : 1;
  return Math.min(1.25, base * drift * gust);
}
