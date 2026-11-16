import { getBerlinDateParts, formatBerlinDate } from "./time";
import { berlinDayDiff } from "./event-display";
import { COIN_PREFIX, DAILY_CAPS, POINT_RULES, RANK_PREFIX, type PointRule } from "./points";

/*
 * Münzen-Seite: Verlauf lesbar machen. Transaktionen tragen ihre Währung nur im Text
 * ("[Münzen] …", "[Rang-Punkte] …", Korrekturen "[Korrektur] … Rang-Punkte …", ältere Buchungen wie
 * Quests oder Glücksrad ganz ohne Präfix = Münzen). Hier wird daraus Währung, Klartext und Quelle.
 */

export type Currency = "coins" | "rank";
export type CoinSource = "events" | "quests" | "discord" | "spin" | "clips" | "profile" | "shop" | "other";

export const SOURCE_LABELS: Record<CoinSource, string> = {
  events: "Events",
  quests: "Quests",
  discord: "Discord",
  spin: "Glücksrad",
  clips: "Clips",
  profile: "Profil",
  shop: "Shop",
  other: "Sonstiges",
};

const KORREKTUR = "[Korrektur]";
const BIRTHDAY = "🎂×2";

export function txCurrency(reason: string): Currency {
  if (reason.startsWith(RANK_PREFIX)) return "rank";
  if (reason.startsWith(KORREKTUR) && /Rang-Punkte/i.test(reason)) return "rank";
  return "coins";
}

/** Klartext ohne Währungs-Präfix und Emojis; Korrekturen und Geburtstags-Boost bleiben erkennbar. */
export function txLabel(reason: string): string {
  let s = reason.trim();
  const birthday = s.endsWith(BIRTHDAY);
  if (birthday) s = s.slice(0, -BIRTHDAY.length);
  let correction = false;
  for (const p of [COIN_PREFIX, RANK_PREFIX, KORREKTUR]) {
    if (s.startsWith(p)) {
      if (p === KORREKTUR) correction = true;
      s = s.slice(p.length);
    }
  }
  s = s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+:/g, ":")
    .replace(/^[\s:–-]+/, "")
    .trim();
  if (/^Korrektur:\s*/i.test(s)) { correction = true; s = s.replace(/^Korrektur:\s*/i, ""); }
  if (correction) s = `Korrektur: ${s}`;
  if (birthday) s += " (Geburtstag ×2)";
  return s || "Buchung";
}

export function txSource(reason: string): CoinSource {
  const s = txLabel(reason);
  if (/^(Korrektur: )?Shop/i.test(s)) return "shop";
  if (/Quest/i.test(s)) return "quests";
  if (/Tages-Spin|Glücksrad/i.test(s)) return "spin";
  if (/Clip/i.test(s)) return "clips";
  if (/Sprachkanal|Voice|Nachrichten|Chat aktiv|Reaktion/i.test(s)) return "discord";
  if (/^Profil:/i.test(s)) return "profile";
  if (/Event|Turnier|Platz|Teilnahme|Eventreihe|Endplatzierung|Spielwahl|Umfrage|Poll|Vorhersage|Sieger|Community-Ziel/i.test(s)) return "events";
  return "other";
}

export type LedgerTx = { id: string; amount: number; reason: string; createdAt: Date | string };

export type LedgerItem = { id: string; amount: number; currency: Currency; label: string; source: CoinSource; createdAt: Date };

export type LedgerDay = {
  key: string;
  label: string;
  coinsIn: number;
  coinsOut: number;
  rank: number;
  items: LedgerItem[];
};

export function toLedgerItem(tx: LedgerTx): LedgerItem {
  return {
    id: tx.id,
    amount: tx.amount,
    currency: txCurrency(tx.reason),
    label: txLabel(tx.reason),
    source: txSource(tx.reason),
    createdAt: new Date(tx.createdAt),
  };
}

function dayLabel(d: Date, now: Date): string {
  const diff = berlinDayDiff(d, now);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Gestern";
  const sameYear = getBerlinDateParts(d).year === getBerlinDateParts(now).year;
  return formatBerlinDate(d, sameYear ? { weekday: "long", day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Verlauf nach Berliner Kalendertagen, neueste zuerst; optional nur eine Währung. */
export function groupLedgerByDay(txs: LedgerTx[], now: Date = new Date(), only?: Currency): LedgerDay[] {
  const days = new Map<string, LedgerDay>();
  const items = txs.map(toLedgerItem)
    .filter((i) => !only || i.currency === only)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const item of items) {
    const p = getBerlinDateParts(item.createdAt);
    const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    let day = days.get(key);
    if (!day) {
      day = { key, label: dayLabel(item.createdAt, now), coinsIn: 0, coinsOut: 0, rank: 0, items: [] };
      days.set(key, day);
    }
    day.items.push(item);
    if (item.currency === "rank") day.rank += item.amount;
    else if (item.amount >= 0) day.coinsIn += item.amount;
    else day.coinsOut += item.amount;
  }
  return [...days.values()];
}

/** Wie viele Tage seit Montag (Berlin): Montag = 0 … Sonntag = 6 */
export function daysSinceMonday(now: Date = new Date()): number {
  const p = getBerlinDateParts(now);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = So
  return (weekday + 6) % 7;
}

/** Münzen-Einnahmen dieser Woche (ab Montag, Berlin) und woher sie vor allem kamen. */
export function weekSummary(txs: LedgerTx[], now: Date = new Date()): { earned: number; topSources: CoinSource[] } {
  const limit = daysSinceMonday(now);
  const bySource = new Map<CoinSource, number>();
  let earned = 0;
  for (const tx of txs) {
    if (tx.amount <= 0 || txCurrency(tx.reason) !== "coins") continue;
    const diff = berlinDayDiff(tx.createdAt, now);
    if (diff < 0 || diff > limit) continue;
    earned += tx.amount;
    const src = txSource(tx.reason);
    bySource.set(src, (bySource.get(src) ?? 0) + tx.amount);
  }
  const topSources = [...bySource.entries()]
    .filter(([s]) => s !== "other")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([s]) => s);
  return { earned, topSources };
}

/** Discord-Regeln (Voice und Chat) mit Tages-Höchstwert: gedeckelte Regeln bis zum Cap, Boni einmal. */
export const DISCORD_RULES: PointRule[] = ["VOICE_HOUR", "VOICE_DAILY_BONUS", "MESSAGE_10", "MESSAGE_DAILY_BONUS", "REACTION_RECEIVED"];

export function discordDailyMax(): number {
  return DISCORD_RULES.reduce((s, r) => s + (DAILY_CAPS[r] ?? POINT_RULES[r].amount), 0);
}

/** Gespeicherte Begründungen der Discord-Regeln (mit/ohne Geburtstags-Boost) */
export function discordReasons(): string[] {
  return DISCORD_RULES.flatMap((r) => {
    const base = `${COIN_PREFIX} ${POINT_RULES[r].reason}`;
    return [base, `${base} ${BIRTHDAY}`];
  });
}
