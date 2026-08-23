/**
 * Idle-Jobs: Katalog und Lohn-Mathematik.
 *
 * Reiner Code ohne Prisma. computeAccrual() läuft absichtlich auf Server UND
 * Client — der Ticker im WageWidget zeigt damit exakt den Betrag, den der
 * Server beim Abholen auch auszahlt.
 *
 * Der Lohn kennt bewusst KEINEN Kalendertag, sondern nur verstrichene Zeit seit
 * `accrualFrom`. Damit greift der Zeitzonen-Konflikt der App (todayStr() = UTC
 * vs. awardedToday() = serverlokal vs. Anzeige = Europe/Berlin) hier gar nicht.
 *
 * Freischaltung: früher an einzelne Möbel-Tags im alten Gaming-Zimmer-Grid
 * gebunden (RoomTag-Anforderungen, z.B. "1x Mikrofon"). Das alte Zimmer wird
 * mittelfristig entfernt — Jobs hängen jetzt stattdessen an `minRoomTier`,
 * der Gesamt-Ausbaustufe der Mancave (`surfaceTierFrom()` in
 * mancave-economy.ts, 1-4, Durchschnitt aller Mancave-Item-Stufen). Höhere
 * Mancave-Stufe schaltet automatisch neue Jobs frei, ohne einzelne Items zu
 * prüfen.
 */

export interface JobDef {
  key:          string;
  label:        string;
  emoji:        string;
  flavor:       string;   // Deutsch, ein Satz
  minTier:      number;   // Rangstufe 1–6 aus ranks.ts
  minRoomTier:  number;   // Mancave-Gesamtstufe 1-4, siehe Kommentar oben
  coinsPerHour: number;
  accent:       "slate" | "teal" | "violet" | "amber" | "rose";
}

/**
 * Job-Einstellungen — früher über das (inzwischen entfernte) Gaming-Zimmer-
 * Admin-Panel per BotConfig einstellbar (RoomConfig.jobsEnabled/wageCapHours/
 * wageMultiplierPct/hireLockHours). Jetzt feste Konstanten hier, analog zu
 * MANCAVE_DEV_FREE_MODE in mancave-items.ts — bei Bedarf später wieder an
 * ein eigenes Mancave-Admin-Panel anbinden.
 */
export const JOBS_ENABLED = true;
/** Ab so vielen Stunden verfällt weiterer Lohn. */
export const WAGE_CAP_HOURS = 24;
/** 100 = normaler Lohn, z.B. für zeitlich befristete Events anpassbar. */
export const WAGE_MULTIPLIER_PCT = 100;
/** Nach dem Einstellen/Wechseln so viele Stunden gesperrt, bevor erneut gewechselt werden kann. */
export const HIRE_LOCK_HOURS = 4;
/** Kürzere Schichten lassen sich nicht abrechnen — verhindert Klick-Spam. */
export const MIN_CLAIM_MINUTES = 15;

export const JOBS: JobDef[] = [
  {
    key: "zocker_praktikant", label: "Zocker-Praktikant", emoji: "🎮",
    flavor: "Kaffee holen, Kabel halten, zusehen. Bezahlt wird in Erfahrung — und ein paar Münzen.",
    minTier: 1, minRoomTier: 1, coinsPerHour: 3, accent: "slate",
  },
  {
    key: "kabeltraeger", label: "LAN-Kabelträger", emoji: "🔌",
    flavor: "Zwanzig Meter Cat-6 durch den Saal. Rückenschmerzen inklusive.",
    minTier: 1, minRoomTier: 1, coinsPerHour: 5, accent: "slate",
  },
  {
    key: "bingo_moderator", label: "Bingo-Moderator im Heim", emoji: "🎱",
    flavor: "\"Bee-fünf!\" Der Saal tobt. Gaming ist auch nur Bingo mit besserer Grafik.",
    minTier: 2, minRoomTier: 1, coinsPerHour: 8, accent: "amber",
  },
  {
    key: "retro_konservator", label: "Retro-Konservator", emoji: "📼",
    flavor: "Du pustest berufsmäßig in Module. Die Nachwelt wird es dir danken.",
    minTier: 2, minRoomTier: 2, coinsPerHour: 10, accent: "amber",
  },
  {
    key: "casual_streamer", label: "Casual-Streamer", emoji: "📹",
    flavor: "Drei Zuschauer, zwei davon Bots. Der dritte ist deine Mutter.",
    minTier: 2, minRoomTier: 2, coinsPerHour: 12, accent: "teal",
  },
  {
    key: "ersatzbank", label: "Esports-Ersatzbank", emoji: "🪑",
    flavor: "Aufgewärmt, hochmotiviert, nie eingewechselt. Bezahlt wird trotzdem.",
    minTier: 3, minRoomTier: 2, coinsPerHour: 15, accent: "teal",
  },
  {
    key: "clan_boss", label: "Clan-Boss (Fraktion Rollator)", emoji: "👑",
    flavor: "Du verwaltest sechzehn Leute, die alle gleichzeitig reden wollen.",
    minTier: 4, minRoomTier: 2, coinsPerHour: 19, accent: "amber",
  },
  {
    key: "lets_player", label: "Let's-Player", emoji: "🎬",
    flavor: "Vier Stunden Videomaterial, elf Minuten davon brauchbar.",
    minTier: 3, minRoomTier: 3, coinsPerHour: 16, accent: "violet",
  },
  {
    key: "content_creator", label: "Content-Creator", emoji: "✂️",
    flavor: "Schneiden, hochladen, Thumbnail bauen, verzweifeln, wiederholen.",
    minTier: 4, minRoomTier: 3, coinsPerHour: 20, accent: "rose",
  },
  {
    key: "esports_coach", label: "Esports-Coach", emoji: "📋",
    flavor: "Pfeile, Kreise, Kaffeeflecken. Der Plan ergibt nur für dich Sinn.",
    minTier: 5, minRoomTier: 3, coinsPerHour: 24, accent: "teal",
  },
  {
    key: "pro_gamer", label: "Pro-Gamer", emoji: "🏆",
    flavor: "Zwölf Stunden Training am Tag. Der Rücken zahlt die Rechnung.",
    minTier: 5, minRoomTier: 4, coinsPerHour: 26, accent: "violet",
  },
  {
    key: "streamer_legende", label: "Streamer-Legende", emoji: "🌟",
    flavor: "Dein Alert-Sound ist ein Meme. Damit hast du es geschafft.",
    minTier: 6, minRoomTier: 4, coinsPerHour: 34, accent: "rose",
  },
  {
    key: "oma_der_szene", label: "Old Master der Szene", emoji: "👵",
    flavor: "Du streamst seit 1998 und hast das Internet noch mit dem Rollator angeschoben.",
    minTier: 6, minRoomTier: 4, coinsPerHour: 42, accent: "amber",
  },
];

export const JOB_MAP: Readonly<Record<string, JobDef>> =
  Object.freeze(Object.fromEntries(JOBS.map(j => [j.key, j])));

export function getJob(key: string | null | undefined): JobDef | null {
  if (!key) return null;
  return JOB_MAP[key] ?? null;
}

// ── Freischaltung ────────────────────────────────────────────────────────────

export function jobUnlockState(
  job:      JobDef,
  rankTier: number,
  roomTier: number,
): { unlocked: boolean; rankOk: boolean; roomTierOk: boolean } {
  const rankOk     = rankTier >= job.minTier;
  const roomTierOk = roomTier >= job.minRoomTier;
  return { unlocked: rankOk && roomTierOk, rankOk, roomTierOk };
}

// ── Lohn ─────────────────────────────────────────────────────────────────────

export interface AccrualConfig {
  wageCapHours:  number;
  multiplierPct: number;
}

export interface Accrual {
  coins:          number;  // ganze Münzen, abgerundet — das ist der Auszahlbetrag
  workedMinutes:  number;  // ungekappt, für "seit X"
  countedMinutes: number;  // gekappt, das wird bezahlt
  capped:         boolean; // Obergrenze erreicht, weiterer Lohn verfällt
  nextCoinInSec:  number;  // Sekunden bis zur nächsten ganzen Münze (0 wenn gekappt)
}

/**
 * Faule Lohnberechnung. Rein und deterministisch: dieselben Eingaben ergeben
 * auf Server und Client dasselbe Ergebnis. Da der Server minimal später rechnet
 * als der Client anzeigt, bekommt niemand jemals weniger als angezeigt.
 */
export function computeAccrual(
  job:         JobDef,
  accrualFrom: Date | number,
  now:         Date | number,
  cfg:         AccrualConfig,
): Accrual {
  const fromMs = accrualFrom instanceof Date ? accrualFrom.getTime() : accrualFrom;
  const nowMs  = now instanceof Date ? now.getTime() : now;

  const elapsedSec = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  const capSec     = Math.max(0, Math.round(cfg.wageCapHours * 3600));
  const countedSec = Math.min(elapsedSec, capSec);

  // Bewusst ganzzahlig: erst multiplizieren, dann EINMAL teilen. Rechnet man
  // stattdessen einen Münzen-pro-Minute-Faktor aus, frisst die Fließkomma-Drift
  // die letzte Münze (1440 × 0,7 ergibt 1007,999… statt 1008).
  const SEC_PER_HOUR_x100 = 360_000; // 3600 s × 100 (Prozent-Nenner)
  const rate  = job.coinsPerHour * cfg.multiplierPct;
  const coins = rate > 0 ? Math.floor((countedSec * rate) / SEC_PER_HOUR_x100) : 0;

  const capped = elapsedSec >= capSec;

  const nextCoinInSec = capped || rate <= 0
    ? 0
    : Math.max(0, Math.ceil(((coins + 1) * SEC_PER_HOUR_x100) / rate) - countedSec);

  return {
    coins,
    workedMinutes:  Math.floor(elapsedSec / 60),
    countedMinutes: Math.floor(countedSec / 60),
    capped,
    nextCoinInSec,
  };
}

/** "7h 30m", "45m", "3h" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
