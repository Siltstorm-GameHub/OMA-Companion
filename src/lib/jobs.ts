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
 */

import { getRoomItem, ROOM_TAG_LABELS, ROOM_ITEMS, type RoomTag } from "./room-items";

export interface JobRequirement {
  tag:   RoomTag;
  count: number;
}

export interface JobDef {
  key:          string;
  label:        string;
  emoji:        string;
  flavor:       string;   // Deutsch, ein Satz
  minTier:      number;   // Rangstufe 1–6 aus ranks.ts
  coinsPerHour: number;
  requirements: JobRequirement[];
  accent:       "slate" | "teal" | "violet" | "amber" | "rose";
}

/** Ab so vielen Stunden verfällt weiterer Lohn (überschreibbar per BotConfig). */
export const WAGE_CAP_HOURS_DEFAULT = 24;
/** Kürzere Schichten lassen sich nicht abrechnen — verhindert Klick-Spam. */
export const MIN_CLAIM_MINUTES = 15;

export const JOBS: JobDef[] = [
  {
    key: "zocker_praktikant", label: "Zocker-Praktikant", emoji: "🎮",
    flavor: "Kaffee holen, Kabel halten, zusehen. Bezahlt wird in Erfahrung — und ein paar Münzen.",
    minTier: 1, coinsPerHour: 3, requirements: [], accent: "slate",
  },
  {
    key: "kabeltraeger", label: "LAN-Kabelträger", emoji: "🔌",
    flavor: "Zwanzig Meter Cat-6 durch den Saal. Rückenschmerzen inklusive.",
    minTier: 1, coinsPerHour: 5,
    requirements: [{ tag: "powerstrip", count: 1 }], accent: "slate",
  },
  {
    key: "bingo_moderator", label: "Bingo-Moderator im Heim", emoji: "🎱",
    flavor: "\"Bee-fünf!\" Der Saal tobt. Gaming ist auch nur Bingo mit besserer Grafik.",
    minTier: 2, coinsPerHour: 8,
    requirements: [{ tag: "mic", count: 1 }], accent: "amber",
  },
  {
    key: "retro_konservator", label: "Retro-Konservator", emoji: "📼",
    flavor: "Du pustest berufsmäßig in Module. Die Nachwelt wird es dir danken.",
    minTier: 2, coinsPerHour: 10,
    requirements: [{ tag: "crt", count: 1 }, { tag: "console_retro", count: 1 }], accent: "amber",
  },
  {
    key: "casual_streamer", label: "Casual-Streamer", emoji: "📹",
    flavor: "Drei Zuschauer, zwei davon Bots. Der dritte ist deine Mutter.",
    minTier: 2, coinsPerHour: 12,
    requirements: [{ tag: "mic", count: 1 }, { tag: "cam", count: 1 }, { tag: "pc_gaming", count: 1 }],
    accent: "teal",
  },
  {
    key: "ersatzbank", label: "Esports-Ersatzbank", emoji: "🪑",
    flavor: "Aufgewärmt, hochmotiviert, nie eingewechselt. Bezahlt wird trotzdem.",
    minTier: 3, coinsPerHour: 15,
    requirements: [
      { tag: "chair_gaming", count: 1 }, { tag: "pc_gaming", count: 1 },
      { tag: "keyboard_mech", count: 1 },
    ],
    accent: "teal",
  },
  {
    key: "lets_player", label: "Let's-Player", emoji: "🎬",
    flavor: "Vier Stunden Videomaterial, elf Minuten davon brauchbar.",
    minTier: 3, coinsPerHour: 16,
    requirements: [
      { tag: "mic", count: 1 }, { tag: "monitor", count: 2 },
      { tag: "pc_gaming", count: 1 }, { tag: "headset", count: 1 },
    ],
    accent: "violet",
  },
  {
    key: "clan_boss", label: "Clan-Boss (Fraktion Rollator)", emoji: "👑",
    flavor: "Du verwaltest sechzehn Leute, die alle gleichzeitig reden wollen.",
    minTier: 4, coinsPerHour: 19,
    requirements: [
      { tag: "desk", count: 1 }, { tag: "trophy_shelf", count: 1 }, { tag: "vitrine", count: 1 },
    ],
    accent: "amber",
  },
  {
    key: "content_creator", label: "Content-Creator", emoji: "✂️",
    flavor: "Schneiden, hochladen, Thumbnail bauen, verzweifeln, wiederholen.",
    minTier: 4, coinsPerHour: 20,
    requirements: [
      { tag: "capture", count: 1 }, { tag: "ringlight", count: 1 },
      { tag: "monitor", count: 2 }, { tag: "pc_gaming", count: 1 },
    ],
    accent: "rose",
  },
  {
    key: "esports_coach", label: "Esports-Coach", emoji: "📋",
    flavor: "Pfeile, Kreise, Kaffeeflecken. Der Plan ergibt nur für dich Sinn.",
    minTier: 5, coinsPerHour: 24,
    requirements: [
      { tag: "whiteboard", count: 1 }, { tag: "monitor", count: 3 }, { tag: "mic", count: 1 },
    ],
    accent: "teal",
  },
  {
    key: "pro_gamer", label: "Pro-Gamer", emoji: "🏆",
    flavor: "Zwölf Stunden Training am Tag. Der Rücken zahlt die Rechnung.",
    minTier: 5, coinsPerHour: 26,
    requirements: [
      { tag: "pc_highend", count: 1 }, { tag: "monitor_144", count: 2 },
      { tag: "chair_gaming", count: 1 }, { tag: "headset", count: 1 },
    ],
    accent: "violet",
  },
  {
    key: "streamer_legende", label: "Streamer-Legende", emoji: "🌟",
    flavor: "Dein Alert-Sound ist ein Meme. Damit hast du es geschafft.",
    minTier: 6, coinsPerHour: 34,
    requirements: [
      { tag: "pc_highend", count: 1 }, { tag: "streamdeck", count: 1 },
      { tag: "ringlight", count: 1 }, { tag: "neon", count: 1 }, { tag: "monitor", count: 3 },
    ],
    accent: "rose",
  },
  {
    key: "oma_der_szene", label: "Old Master der Szene", emoji: "👵",
    flavor: "Du streamst seit 1998 und hast das Internet noch mit dem Rollator angeschoben.",
    minTier: 6, coinsPerHour: 42,
    requirements: [
      { tag: "pc_highend", count: 1 }, { tag: "streamdeck", count: 1 },
      { tag: "ringlight", count: 1 }, { tag: "neon", count: 1 },
      { tag: "monitor", count: 3 }, { tag: "led_wall", count: 1 }, { tag: "vitrine", count: 1 },
    ],
    accent: "amber",
  },
];

export const JOB_MAP: Readonly<Record<string, JobDef>> =
  Object.freeze(Object.fromEntries(JOBS.map(j => [j.key, j])));

export function getJob(key: string | null | undefined): JobDef | null {
  if (!key) return null;
  return JOB_MAP[key] ?? null;
}

// ── Anforderungen ────────────────────────────────────────────────────────────

export interface MissingRequirement {
  tag:   RoomTag;
  label: string;
  have:  number;
  need:  number;
}

/** Prüft die Setup-Anforderungen gegen die im Zimmer AUFGESTELLTEN Möbel. */
export function checkRequirements(
  job:  JobDef,
  tags: Partial<Record<RoomTag, number>>,
): { met: boolean; missing: MissingRequirement[] } {
  const missing: MissingRequirement[] = [];
  for (const req of job.requirements) {
    const have = tags[req.tag] ?? 0;
    if (have < req.count) {
      missing.push({ tag: req.tag, label: ROOM_TAG_LABELS[req.tag], have, need: req.count });
    }
  }
  return { met: missing.length === 0, missing };
}

export function jobUnlockState(
  job:        JobDef,
  rankTier:   number,
  tags:       Partial<Record<RoomTag, number>>,
): { unlocked: boolean; rankOk: boolean; setupOk: boolean; missing: MissingRequirement[] } {
  const rankOk = rankTier >= job.minTier;
  const { met, missing } = checkRequirements(job, tags);
  return { unlocked: rankOk && met, rankOk, setupOk: met, missing };
}

/** Tags, die der aktive Job braucht — Grundlage der Einlagerungs-Sperre. */
export function requiredTags(job: JobDef | null): Set<RoomTag> {
  return new Set(job ? job.requirements.map(r => r.tag) : []);
}

/** Lesbare Auflistung fehlender Anforderungen, z.B. "Mikrofon, 2× Monitor". */
export function formatMissing(missing: MissingRequirement[]): string {
  return missing
    .map(m => (m.need > 1 ? `${m.need}× ${m.label}` : m.label))
    .join(", ");
}

/**
 * Welche Jobs ein Möbelstück freischaltet — der Kaufanreiz im Shop.
 * Liegt hier statt in room-items.ts, damit der Import nur in eine Richtung geht.
 */
export function jobsUnlockedBy(itemKey: string): JobDef[] {
  const def = getRoomItem(itemKey);
  if (!def || def.tags.length === 0) return [];
  return JOBS.filter(job => job.requirements.some(req => def.tags.includes(req.tag)));
}

/** Umgekehrt: welche Möbel eine Anforderung erfüllen können — Hinweis in der Jobbörse. */
export function itemsProviding(tag: RoomTag): { key: string; label: string; price: number }[] {
  return ROOM_ITEMS
    .filter(i => i.tags.includes(tag))
    .sort((a, b) => a.price - b.price)
    .map(i => ({ key: i.key, label: i.label, price: i.price }));
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

  const elapsedMin = Math.max(0, (nowMs - fromMs) / 60_000);
  const capMin     = Math.max(0, cfg.wageCapHours * 60);
  const countedMin = Math.min(elapsedMin, capMin);
  const perMinute  = (job.coinsPerHour * cfg.multiplierPct) / 100 / 60;

  const coins  = Math.floor(countedMin * perMinute);
  const capped = elapsedMin >= capMin;

  const nextCoinInSec = capped || perMinute <= 0
    ? 0
    : Math.max(0, Math.ceil(((coins + 1) / perMinute - countedMin) * 60));

  return {
    coins,
    workedMinutes:  Math.floor(elapsedMin),
    countedMinutes: Math.floor(countedMin),
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
