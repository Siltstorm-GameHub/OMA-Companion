/**
 * Auswahlwerte der Spieleliste (/spiele) — client-sicher, kein Prisma.
 * In der DB stehen nur die Schlüssel; die Labels sind reine Anzeige.
 */

export const GAME_GENRES = {
  action:     "Action",
  shooter:    "Shooter",
  strategy:   "Strategie",
  rpg:        "Rollenspiel",
  adventure:  "Adventure",
  racing:     "Rennspiel",
  sport:      "Sport",
  fighting:   "Prügelspiel",
  simulation: "Simulation",
  survival:   "Survival",
  sandbox:    "Sandbox",
  puzzle:     "Puzzle",
  party:      "Party",
  casual:     "Casual",
  mmo:        "MMO",
  card_game:  "Kartenspiel",
  board_game: "Brettspiel",
} as const;

export const GAME_TAGS = {
  couch:       "Couch / Splitscreen",
  teamplay:    "Teamplay",
  competitive: "Kompetitiv",
  chill:       "Chillig",
  funny:       "Lustig",
  beginner:    "Einsteigerfreundlich",
} as const;

export const GAME_MODES = {
  solo: "Solo",
  coop: "Koop",
  pvp:  "Gegeneinander",
} as const;

export const GAME_PLATFORMS = {
  pc:          "PC",
  playstation: "PlayStation",
  xbox:        "Xbox",
  switch:      "Switch",
  mobile:      "Handy",
} as const;

export const SESSION_LENGTHS = {
  kurz:   "Kurze Runden (< 20 Min.)",
  mittel: "20–60 Min.",
  lang:   "Über 1 Std.",
  endlos: "Open End",
} as const;

export type GameGenre = keyof typeof GAME_GENRES;
export type GameTag = keyof typeof GAME_TAGS;
export type GameMode = keyof typeof GAME_MODES;
export type GamePlatform = keyof typeof GAME_PLATFORMS;
export type SessionLength = keyof typeof SESSION_LENGTHS;

export const GAME_STATUSES = ["APPROVED", "PENDING", "HIDDEN"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** Obergrenze für Spieleranzahl-Angaben (MMOs o. Ä. → "100+") */
export const MAX_PLAYERS_LIMIT = 100;
export const MAX_GAME_NAME_LENGTH = 80;
export const MAX_GAME_DESCRIPTION_LENGTH = 600;

/** Behält nur bekannte Schlüssel, ohne Dubletten, in der Reihenfolge der Optionsliste. */
export function pickKeys<T extends Record<string, string>>(options: T, input: unknown): (keyof T & string)[] {
  if (!Array.isArray(input)) return [];
  const wanted = new Set(input.filter((v): v is string => typeof v === "string"));
  return (Object.keys(options) as (keyof T & string)[]).filter(k => wanted.has(k));
}

export function labelOf<T extends Record<string, string>>(options: T, key: string | null | undefined): string | null {
  return key && key in options ? options[key as keyof T] : null;
}

/** "2–8 Spieler", "ab 2 Spielern", "1 Spieler" … — null, wenn nichts bekannt ist. */
export function formatPlayers(min: number | null | undefined, max: number | null | undefined): string | null {
  const lo = min ?? null;
  const hi = max ?? null;
  if (lo === null && hi === null) return null;
  const fmtHi = (n: number) => (n >= MAX_PLAYERS_LIMIT ? `${MAX_PLAYERS_LIMIT}+` : String(n));
  if (lo !== null && hi !== null) {
    if (lo === hi) return `${fmtHi(lo)} Spieler`;
    return `${lo}–${fmtHi(hi)} Spieler`;
  }
  if (lo !== null) return `ab ${lo} Spieler${lo === 1 ? "" : "n"}`;
  return `bis ${fmtHi(hi!)} Spieler`;
}

/** Abos, in denen ein Spiel enthalten sein kann. Game Pass wird täglich automatisch abgeglichen. */
export const GAME_SUBSCRIPTIONS = {
  gamepass_pc:   "PC Game Pass",
  gamepass_xbox: "Game Pass (Xbox)",
  ea_play:       "EA Play",
  ubisoft_plus:  "Ubisoft+",
  ps_plus:       "PlayStation Plus",
  nso:           "Nintendo Switch Online",
} as const;
export type GameSubscription = keyof typeof GAME_SUBSCRIPTIONS;
/** Diese Abos pflegt der automatische Abgleich (lib/games/store-sync.ts) — die übrigen das Team */
export const AUTO_SUBSCRIPTIONS: GameSubscription[] = ["gamepass_pc", "gamepass_xbox"];

/** Kurzform fürs Badge auf Karten: beide Game-Pass-Varianten → "Game Pass" */
export function subscriptionBadges(subs: string[]): string[] {
  const out: string[] = [];
  if (subs.some(s => s.startsWith("gamepass_"))) out.push("Game Pass");
  for (const s of subs) if (!s.startsWith("gamepass_") && s in GAME_SUBSCRIPTIONS) out.push(GAME_SUBSCRIPTIONS[s as GameSubscription]);
  return out;
}

/** "19,99 €" */
export function formatPrice(cents: number | null | undefined, currency: string | null | undefined = "EUR"): string | null {
  if (cents === null || cents === undefined) return null;
  try {
    return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: currency || "EUR" });
  } catch {
    return `${(cents / 100).toFixed(2).replace(".", ",")} ${currency ?? ""}`.trim();
  }
}
