import { prisma } from "./prisma";

// ── Nachrichtentypen ──────────────────────────────────────────────────────────

export const BOT_MESSAGES = {
  event_new: {
    label:       "Neues Event",
    description: "Wird gesendet, wenn ein neues Event in der WebApp erstellt wird.",
    defaultText: "Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.",
    defaultOn:   true,
  },
  event_reminder: {
    label:       "Event-Erinnerung (24h vorher)",
    description: "Täglich um 10 Uhr für Events die in 20–28h starten.",
    defaultText: "Ein Event startet in **weniger als 24 Stunden** – jetzt noch anmelden!",
    defaultOn:   true,
  },
  event_started: {
    label:       "Event hat begonnen",
    description: "Wenn ein Discord Scheduled Event auf 'Aktiv' springt.",
    defaultText: "Das Event hat soeben begonnen. Viel Spaß!",
    defaultOn:   true,
  },
  event_ended: {
    label:       "Event beendet",
    description: "Wenn ein Discord Scheduled Event beendet wird.",
    defaultText: "Das Event ist beendet. Danke für die Teilnahme!",
    defaultOn:   true,
  },
  tournament_result: {
    label:       "Turnierergebnis",
    description: "Wenn ein Turnier in der WebApp auf 'finished' gesetzt wird.",
    defaultText: "Das Turnier ist beendet. Herzlichen Glückwunsch an alle Platzierten!",
    defaultOn:   true,
  },
  birthday: {
    label:       "Geburtstag",
    description: "Täglich um 8 Uhr für User mit Geburtstag heute.",
    defaultText: "hat heute Geburtstag! 🎉\nAls Geschenk gibt es für die nächsten **24 Stunden** doppelte Punkte auf alle Aktivitäten!",
    defaultOn:   true,
  },
  rank_up: {
    label:       "Rang-Aufstieg",
    description: "Wenn ein User durch Discord-Aktivität einen neuen Rang erreicht.",
    defaultText: "hat einen neuen Rang erreicht! 🎊",
    defaultOn:   true,
  },
  leaderboard: {
    label:       "Monatliche Rangliste",
    description: "Am 1. des Monats um 12 Uhr mit den Top-10 des Vormonats.",
    defaultText: "Das sind die aktivsten Mitglieder des letzten Monats:",
    defaultOn:   true,
  },
} as const;

export type BotMessageKey = keyof typeof BOT_MESSAGES;

// ── Laden + Caching ───────────────────────────────────────────────────────────

let _cache: Record<string, string> | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 1 Minute

export async function getBotConfig(): Promise<Record<string, string>> {
  if (_cache && Date.now() - _cacheTs < CACHE_TTL) return _cache;
  const rows = await prisma.botConfig.findMany();
  _cache  = Object.fromEntries(rows.map(r => [r.key, r.value]));
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
