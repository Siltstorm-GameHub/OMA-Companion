import { prisma } from "./prisma";

// ── Platzhalter-Definition ────────────────────────────────────────────────────

export interface BotPlaceholder {
  key:         string;   // z.B. "{username}"
  description: string;   // z.B. "Discord-Erwähnung des Users"
}

// ── Nachrichtentypen ──────────────────────────────────────────────────────────

export const BOT_MESSAGES = {
  event_new: {
    label:       "Neues Event",
    description: "Wird gesendet, wenn ein neues Event in der WebApp erstellt wird.",
    defaultText: "Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.\n📅 **{eventName}** startet am {date}.",
    defaultOn:   true,
    placeholders: [
      { key: "{eventName}", description: "Name des Events" },
      { key: "{game}",      description: "Spielname" },
      { key: "{date}",      description: "Startdatum & Uhrzeit" },
      { key: "{maxPlayers}", description: "Maximale Spielerzahl" },
      { key: "{points}",    description: "Punktebelohnung bei Teilnahme" },
    ] satisfies BotPlaceholder[],
  },
  event_reminder: {
    label:       "Event-Erinnerung (24h vorher)",
    description: "Täglich um 10 Uhr für Events, die in 20–28h starten.",
    defaultText: "⏰ Nur noch **weniger als 24 Stunden** bis **{eventName}** beginnt!\nStart: {date} · Jetzt noch anmelden!",
    defaultOn:   true,
    placeholders: [
      { key: "{eventName}",    description: "Name des Events" },
      { key: "{game}",         description: "Spielname" },
      { key: "{date}",         description: "Startdatum & Uhrzeit" },
      { key: "{registrations}", description: "Aktuelle Anmeldezahl" },
      { key: "{maxPlayers}",   description: "Maximale Spielerzahl" },
      { key: "{points}",       description: "Punktebelohnung bei Teilnahme" },
    ] satisfies BotPlaceholder[],
  },
  event_started: {
    label:       "Event hat begonnen",
    description: "Wenn ein Discord Scheduled Event auf 'Aktiv' springt.",
    defaultText: "🚀 **{eventName}** hat soeben begonnen! Viel Spaß und viel Erfolg! 🎮",
    defaultOn:   true,
    placeholders: [
      { key: "{eventName}", description: "Name des Events" },
      { key: "{game}",      description: "Spielname" },
    ] satisfies BotPlaceholder[],
  },
  event_ended: {
    label:       "Event beendet",
    description: "Wenn ein Discord Scheduled Event beendet wird.",
    defaultText: "✅ **{eventName}** ist beendet. Danke an alle {attendeeCount} Teilnehmer!",
    defaultOn:   true,
    placeholders: [
      { key: "{eventName}",    description: "Name des Events" },
      { key: "{attendeeCount}", description: "Anzahl der Teilnehmer" },
    ] satisfies BotPlaceholder[],
  },
  tournament_result: {
    label:       "Turnierergebnis",
    description: "Wenn ein Turnier in der WebApp auf 'finished' gesetzt wird.",
    defaultText: "🏆 Das Turnier **{eventName}** ist beendet!\nHerzlichen Glückwunsch an {winner} für den 1. Platz! 🎉",
    defaultOn:   true,
    placeholders: [
      { key: "{eventName}", description: "Name des Events/Turniers" },
      { key: "{game}",      description: "Spielname" },
      { key: "{winner}",    description: "Discord-Erwähnung des Erstplatzierten" },
    ] satisfies BotPlaceholder[],
  },
  birthday: {
    label:       "Geburtstag",
    description: "Täglich um 8 Uhr für User mit Geburtstag heute.",
    defaultText: "🎂 {username} hat heute Geburtstag – alles Gute! 🎉\nAls Geschenk gibt es für die nächsten **24 Stunden** doppelte Punkte!",
    defaultOn:   true,
    placeholders: [
      { key: "{username}", description: "Discord-Erwähnung des Users" },
    ] satisfies BotPlaceholder[],
  },
  rank_up: {
    label:       "Rang-Aufstieg",
    description: "Wenn ein User durch Discord-Aktivität einen neuen Rang erreicht.",
    defaultText: "🎊 {username} hat den Rang **{rank}** erreicht – weiter so!",
    defaultOn:   true,
    placeholders: [
      { key: "{username}", description: "Discord-Erwähnung des Users" },
      { key: "{rank}",     description: "Name des neuen Rangs" },
    ] satisfies BotPlaceholder[],
  },
  leaderboard: {
    label:       "Monatliche Rangliste",
    description: "Am 1. des Monats um 12 Uhr mit den Top-10 des Vormonats.",
    defaultText: "🏆 Die aktivsten Mitglieder im **{month}**:",
    defaultOn:   true,
    placeholders: [
      { key: "{month}", description: "Monatsname des Vormonats" },
    ] satisfies BotPlaceholder[],
  },
  lul_suggest: {
    label:       "LUL Spieltag-Vorschlag",
    description: "Wenn ein User im Shop einen Spieltag-Vorschlag einlöst (DISCORD_LUL_CHANNEL_ID).",
    defaultText: "🎮 **Spieltag-Vorschlag von {username}**\n**Spiel:** {game}{note}",
    defaultOn:   true,
    placeholders: [
      { key: "{username}", description: "Name des Vorschlagenden" },
      { key: "{game}",     description: "Vorgeschlagenes Spiel" },
      { key: "{note}",     description: "Optionale Notiz (inkl. Zeilenumbruch, leer wenn keine Notiz)" },
    ] satisfies BotPlaceholder[],
  },
} as const;

export type BotMessageKey = keyof typeof BOT_MESSAGES;

// ── Platzhalter ersetzen ──────────────────────────────────────────────────────

export function fillPlaceholders(
  text:   string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (t, [k, v]) => t.replaceAll(k, v),
    text,
  );
}

// ── Laden + Caching ───────────────────────────────────────────────────────────

let _cache: Record<string, string> | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 1 Minute

export async function getBotConfig(): Promise<Record<string, string>> {
  if (_cache && Date.now() - _cacheTs < CACHE_TTL) return _cache;
  const rows = await prisma.botConfig.findMany();
  _cache   = Object.fromEntries(rows.map(r => [r.key, r.value]));
  _cacheTs = Date.now();
  return _cache;
}

export function invalidateBotConfigCache() {
  _cache = null;
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

export async function isBotMessageEnabled(key: BotMessageKey): Promise<boolean> {
  const cfg = await getBotConfig();
  const v   = cfg[`${key}_enabled`];
  if (v === undefined) return BOT_MESSAGES[key].defaultOn;
  return v === "true";
}

export async function getBotMessageText(key: BotMessageKey): Promise<string> {
  const cfg = await getBotConfig();
  return cfg[`${key}_text`] ?? BOT_MESSAGES[key].defaultText;
}
