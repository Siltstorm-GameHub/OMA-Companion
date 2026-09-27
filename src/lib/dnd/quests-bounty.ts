// ============================================
// OMA Quest — Rotierende Aktivitäts-Quests (rein + Server): 3 täglich + 3 monatlich, für alle gleich
// ============================================
// Keine Story: reine Aktivitäts-Ziele (kämpfen, zähmen, reisen, sammeln, Discord-Aktivität, Duelle …). Jeden Tag
// bzw. Monat (Berliner Kalender) werden 3 von 6 bzw. 3 von 8 Vorlagen ausgewählt — deterministisch aus dem
// Datum, also für alle Spieler dieselben drei. Die Slugs tragen den Zeitraum, ihr Fortschritt beginnt dadurch
// von selbst neu, ohne dass ein Cron aufräumen müsste (alte Zeilen bleiben harmlos liegen).

export type BountyCadence = "daily" | "monthly";

export interface BountyTemplate {
  id: string;
  title: string;
  description: string;
  objectiveType: string;
  targetRef?: string;
  targetCount: number;
  xpReward: number;
  coinReward: number;
}

/** Kurz und im Spiel erledigt — setzt sich jeden Tag zurück. */
export const DAILY_TEMPLATES: BountyTemplate[] = [
  { id: "kaempfer", title: "Tagesauftrag: Kämpfer", description: "Besiege 3 beliebige Monster.", objectiveType: "MONSTER_SLAIN", targetCount: 3, xpReward: 60, coinReward: 25 },
  { id: "grossjagd", title: "Tagesauftrag: Großjagd", description: "Besiege ein Elite- oder Boss-Monster.", objectiveType: "TIER_SLAIN", targetCount: 1, xpReward: 90, coinReward: 40 },
  { id: "tierfreund", title: "Tagesauftrag: Tierfreund", description: "Zähme ein Monster mit einem Köder.", objectiveType: "COMPANION_TAMED", targetCount: 1, xpReward: 70, coinReward: 30 },
  { id: "wanderer", title: "Tagesauftrag: Wanderer", description: "Reise 5 Hex-Felder weit.", objectiveType: "TRAVEL_DISTANCE", targetCount: 5, xpReward: 50, coinReward: 20 },
  { id: "sammler", title: "Tagesauftrag: Sammler", description: "Sammle 3 Gegenstände (Beute oder Belohnung).", objectiveType: "ITEM_COLLECTED", targetCount: 3, xpReward: 50, coinReward: 20 },
  { id: "entdecker", title: "Tagesauftrag: Entdecker", description: "Besuche eine Location, an der du noch nie warst.", objectiveType: "LOCATION_DISCOVERED", targetCount: 1, xpReward: 60, coinReward: 25 },
];

/** Größerer Umfang, ein ganzer Monat Zeit — App-Aktivität und dickere Kampf-/Reiseziele. */
export const MONTHLY_TEMPLATES: BountyTemplate[] = [
  { id: "plaudertasche", title: "Monatsauftrag: Die Plaudertasche", description: "Schreibe 30 Nachrichten im Discord.", objectiveType: "MESSAGE_SENT", targetCount: 30, xpReward: 100, coinReward: 40 },
  { id: "stammgast", title: "Monatsauftrag: Stammgast im Sprachkanal", description: "Verbringe 60 Minuten im Voice-Chat.", objectiveType: "VOICE_MINUTES", targetCount: 60, xpReward: 110, coinReward: 40 },
  { id: "event-teilnehmer", title: "Monatsauftrag: Auf zum nächsten Event", description: "Melde dich bei einem Community-Event an.", objectiveType: "EVENT_ATTEND", targetCount: 1, xpReward: 90, coinReward: 60 },
  { id: "demokrat", title: "Monatsauftrag: Demokratisches Prinzip", description: "Stimme bei einer Event-Umfrage ab.", objectiveType: "POLL_VOTE", targetCount: 1, xpReward: 60, coinReward: 20 },
  { id: "arena-champion", title: "Monatsauftrag: Arena-Champion", description: "Bestreite 3 Battle-Cards-Duelle.", objectiveType: "BATTLE_CARD_DUEL", targetCount: 3, xpReward: 140, coinReward: 100 },
  { id: "vielgereist", title: "Monatsauftrag: Vielgereist", description: "Reise insgesamt 25 Hex-Felder weit.", objectiveType: "TRAVEL_DISTANCE", targetCount: 25, xpReward: 130, coinReward: 60 },
  { id: "geschichtensammler", title: "Monatsauftrag: Geschichtensammler", description: "Erlebe 5 Story-Ereignisse auf deinen Reisen.", objectiveType: "STORY_NODE_COMPLETED", targetCount: 5, xpReward: 150, coinReward: 75 },
  { id: "grosswildjaeger", title: "Monatsauftrag: Großwildjäger", description: "Besiege 3 Elite- oder Boss-Monster.", objectiveType: "TIER_SLAIN", targetCount: 3, xpReward: 220, coinReward: 120 },
];

const COUNT: Record<BountyCadence, number> = { daily: 3, monthly: 3 };
const TEMPLATES: Record<BountyCadence, BountyTemplate[]> = { daily: DAILY_TEMPLATES, monthly: MONTHLY_TEMPLATES };

/** Heutiges Datum in Berliner Zeit als "YYYYMMDD" (Tageswechsel) bzw. "YYYYMM" (Monatswechsel). */
export function periodKey(cadence: BountyCadence, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return cadence === "daily" ? `${get("year")}${get("month")}${get("day")}` : `${get("year")}${get("month")}`;
}
/** Rückwärtskompatibler Name für den täglichen Schlüssel. */
export const todayKey = (now = new Date()): string => periodKey("daily", now);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 16777619)) >>> 0;
  return h >>> 0;
}

/** Die 3 Vorlagen dieses Zeitraums, deterministisch aus dem Schlüssel — für alle Spieler dieselben. */
export function bountiesOf(cadence: BountyCadence, key: string): BountyTemplate[] {
  const pool = TEMPLATES[cadence];
  const order = pool.map((t, i) => ({ t, r: hash(`${cadence}:${key}:${t.id}:${i}`) })).sort((a, b) => a.r - b.r);
  return order.slice(0, COUNT[cadence]).map((o) => o.t);
}
/** Rückwärtskompatibel: die 3 täglichen Vorlagen. */
export const bountiesOfDay = (key: string): BountyTemplate[] => bountiesOf("daily", key);

export const bountySlug = (cadence: BountyCadence, key: string, templateId: string): string => `dnd-bounty-${cadence}-${key}-${templateId}`;
