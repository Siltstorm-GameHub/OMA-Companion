// ============================================
// Event-Darstellung — gemeinsame Status-/Datumslogik für alle Event-Kacheln
// ============================================
// Events-Seite, Startseiten-Kachel und Hero teilen sich diese Funktionen, damit derselbe Zustand
// überall gleich heißt und gleich aussieht (früher: "Live" in Rot auf Home, "Läuft" in Grün auf
// /events). Reine Funktionen ohne DB-Zugriff — getestet in event-display.test.ts.

import { isPeriodEvent, periodInfo } from "@/lib/event-period";
import { getBerlinDateParts } from "@/lib/time";
import { gameNameKey } from "@/lib/games/slug";

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;

type DateLike = Date | string | number;
const toDate = (d: DateLike) => (d instanceof Date ? d : new Date(d));

/**
 * Was die Kachel als EINEN Zustand zeigt. "open" ist der Normalfall und bekommt bewusst kein
 * Signal — hervorgehoben wird nur, was davon abweicht.
 */
export type EventPhase = "live" | "period" | "poll" | "gamevote" | "full" | "open" | "finished" | "drawn";

/** Farbrolle: live = Rot, teal = Mitmachen/Zeitraum, violet = Abstimmung, amber = Knappheit, muted = neutral */
export type EventTone = "live" | "teal" | "violet" | "amber" | "muted";

export interface EventPhaseInput {
  status: string;
  startAt: DateLike;
  endAt?: DateLike | null;
  maxPlayers?: number | null;
  playerCount: number;
  isRegistered?: boolean;
  /** Läuft für das Event gerade eine Spielwahl (GameVote.status === "open")? */
  gameVoteOpen?: boolean;
}

export interface EventPhaseInfo {
  phase: EventPhase;
  /** null = kein Signal anzeigen (Normalfall) */
  label: string | null;
  tone: EventTone;
  /** Nur bei Zeitraum-Events: 0..1 */
  progress?: number;
}

/**
 * Läuft das Event wirklich? status "active" allein reicht nicht: ein Turnier, das vor dem Start
 * ausgelost wurde, steht schon auf "active" (lib/tournaments/draw.ts), hat aber noch nicht begonnen.
 */
export function isEventRunning(ev: { status: string; startAt: DateLike; endAt?: DateLike | null }, now: DateLike = Date.now()): boolean {
  if (ev.status !== "active") return false;
  return toDate(ev.startAt).getTime() <= toDate(now).getTime();
}

export function eventPhase(ev: EventPhaseInput, now: DateLike = Date.now()): EventPhaseInfo {
  if (ev.status === "finished") return { phase: "finished", label: "Beendet", tone: "muted" };
  if (ev.status === "umfrage") return { phase: "poll", label: "Abstimmung läuft", tone: "violet" };
  if (ev.status === "active") {
    // Vor dem Start ausgelost: noch nicht "Live"
    if (!isEventRunning(ev, now)) return { phase: "drawn", label: "Ausgelost", tone: "amber" };
    if (ev.endAt && isPeriodEvent({ startAt: ev.startAt, endAt: ev.endAt })) {
      const p = periodInfo({ startAt: ev.startAt, endAt: ev.endAt }, now);
      return { phase: "period", label: p.remainingLabel, tone: "teal", progress: p.progress };
    }
    return { phase: "live", label: "Live", tone: "live" };
  }
  if (ev.gameVoteOpen) return { phase: "gamevote", label: "Spielwahl läuft", tone: "violet" };
  const full = !!ev.maxPlayers && ev.playerCount >= ev.maxPlayers;
  if ((full || ev.status === "closed") && !ev.isRegistered) return { phase: "full", label: "Voll", tone: "muted" };
  return { phase: "open", label: null, tone: "teal" };
}

/** Tailwind-Klassen je Farbrolle — eine Quelle für Pillen/Tags auf allen Kacheln. */
export const TONE_CLASSES: Record<EventTone, { pill: string; text: string; bar: string; border: string }> = {
  live:   { pill: "bg-red-500/15 text-red-400",       text: "text-red-400",    bar: "bg-red-400",    border: "border-red-400/35" },
  teal:   { pill: "bg-teal-400/15 text-teal-300",     text: "text-teal-300",   bar: "bg-teal-400",   border: "border-teal-400/40" },
  violet: { pill: "bg-violet-400/15 text-violet-300", text: "text-violet-300", bar: "bg-violet-400", border: "border-violet-400/35" },
  amber:  { pill: "bg-amber-400/15 text-amber-300",   text: "text-amber-300",  bar: "bg-amber-400",  border: "border-amber-400/35" },
  muted:  { pill: "bg-white/[0.08] text-gray-300",    text: "text-gray-400",   bar: "bg-gray-500",   border: "border-white/[0.08]" },
};

// ── Datum ──────────────────────────────────────────────────────────────────

/** Tage zwischen zwei Berlin-Kalendertagen (b - a), unabhängig von Uhrzeit und Sommerzeit. */
export function berlinDayDiff(a: DateLike, b: DateLike): number {
  const pa = getBerlinDateParts(toDate(a));
  const pb = getBerlinDateParts(toDate(b));
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / DAY_MS);
}

export type DayBucket = "today" | "week" | "later";

/** Gruppe auf der Events-Seite: Heute (inkl. laufender Events) / Diese Woche (nächste 7 Tage) / Später */
export function dayBucket(startAt: DateLike, now: DateLike = Date.now(), running = false): DayBucket {
  if (running) return "today";
  const diff = berlinDayDiff(now, startAt);
  if (diff <= 0) return "today";
  if (diff < 7) return "week";
  return "later";
}

const WEEKDAYS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];

/**
 * Kalenderblock der Kachel: { top: "HEUTE" | "MORGEN" | "SA", weekday: "SA", day: "22", time: "20:00" }.
 * `weekday` ist immer der Wochentag — für schmale Spalten, in die "MORGEN" nicht passt.
 */
export function dateBlock(startAt: DateLike, now: DateLike = Date.now()): { top: string; weekday: string; day: string; time: string } {
  const d = toDate(startAt);
  const p = getBerlinDateParts(d);
  const diff = berlinDayDiff(now, d);
  const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  const top = diff === 0 ? "HEUTE" : diff === 1 ? "MORGEN" : weekday;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { top, weekday, day: String(p.day), time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** "in 45 Min" / "in 2 Std 14 Min" / "morgen" / "in 3 Tagen" — null, wenn der Start vorbei ist. */
export function startsInLabel(startAt: DateLike, now: DateLike = Date.now()): string | null {
  const diff = toDate(startAt).getTime() - toDate(now).getTime();
  if (diff <= 0) return null;
  if (diff < HOUR_MS) return `in ${Math.max(1, Math.floor(diff / MIN_MS))} Min`;
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    const m = Math.floor((diff % HOUR_MS) / MIN_MS);
    return m > 0 ? `in ${h} Std ${m} Min` : `in ${h} Std`;
  }
  const days = berlinDayDiff(now, startAt);
  return days <= 1 ? "morgen" : `in ${days} Tagen`;
}

// ── Dringlichkeit & Relevanz ───────────────────────────────────────────────

/**
 * Nur echte Knappheit: höchstens 2 freie Plätze oder Start in unter einer Stunde.
 * Bewusst kein Dauer-Hinweis — sonst wird er zur Tapete.
 */
export function urgencyHint(
  ev: { startAt: DateLike; maxPlayers?: number | null; playerCount: number; isRegistered?: boolean },
  now: DateLike = Date.now(),
): string | null {
  const untilStart = toDate(ev.startAt).getTime() - toDate(now).getTime();
  if (untilStart > 0 && untilStart < HOUR_MS) return `Startet in ${Math.max(1, Math.floor(untilStart / MIN_MS))} Min`;
  if (ev.isRegistered || !ev.maxPlayers) return null;
  const free = ev.maxPlayers - ev.playerCount;
  if (free === 1) return "Noch 1 Platz";
  if (free === 2) return "Noch 2 Plätze";
  return null;
}

export type RelevanceTag = "Dein Spiel" | "Dein Squad";

/**
 * Warum das Event zu dir passt — Spiel "Am Start" (GameSwipe/Reaktionen) oder Squad-Event.
 * myGameKeys = gameNameKey() von Namen + Aliasen deiner Spiele (siehe lib/games/match.ts gameKeys).
 */
export function relevanceTags(
  ev: { game: string | null; squadId: string | null },
  ctx: { myGameKeys: Set<string>; mySquadIds: Set<string> },
): RelevanceTag[] {
  const tags: RelevanceTag[] = [];
  if (ev.game && ctx.myGameKeys.has(gameNameKey(ev.game))) tags.push("Dein Spiel");
  if (ev.squadId && ctx.mySquadIds.has(ev.squadId)) tags.push("Dein Squad");
  return tags;
}

/**
 * Empfehlungs-Punkte für die Startseiten-Kachel ("Für dich"). Relevanz schlägt Knappheit,
 * bei Gleichstand gewinnt das frühere Event (Sortierung macht der Aufrufer).
 */
export function recommendationScore(tags: RelevanceTag[], urgent: boolean): number {
  return (tags.includes("Dein Spiel") ? 3 : 0) + (tags.includes("Dein Squad") ? 3 : 0) + (urgent ? 1 : 0);
}

// ── Ergebnisse ─────────────────────────────────────────────────────────────

/** finalRankingJson = ["userId Platz 1", "userId Platz 2", …] */
export function parseRanking(finalRankingJson: string | null | undefined): string[] {
  if (!finalRankingJson) return [];
  try {
    const r = JSON.parse(finalRankingJson);
    return Array.isArray(r) ? r.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Endplatzierung mit Gleichstand: rankingGroups (completionData.finalRankingGroups) bündelt
 * gleichplatzierte User, Platz zählt wie im Sport (1, 1, 3). Ohne Gruppen gilt die flache
 * Rangliste (jeder ein eigener Platz). Liefert deinen Platz (0 = nicht platziert) und alle
 * Erstplatzierten.
 */
export function rankingWithTies(
  ranking: string[],
  rankingGroups: string[][] | null | undefined,
  userId: string | null | undefined,
): { place: number; winnerIds: string[] } {
  const groups = rankingGroups?.length
    ? rankingGroups.filter(g => Array.isArray(g) && g.length > 0)
    : ranking.map(id => [id]);
  let place = 0;
  let pos = 1;
  for (const g of groups) {
    if (userId && g.includes(userId)) { place = pos; break; }
    pos += g.length;
  }
  return { place, winnerIds: groups[0] ?? [] };
}

/** Platz des Users (1-basiert) oder null */
export function placementOf(finalRankingJson: string | null | undefined, userId: string | null | undefined): number | null {
  if (!userId) return null;
  const idx = parseRanking(finalRankingJson).indexOf(userId);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Avatare sortieren: Freunde/Squad-Mitglieder zuerst, sonst Anmeldereihenfolge.
 * Gibt eine neue Liste zurück.
 */
export function friendsFirst<T extends { id: string }>(users: T[], friendIds: Set<string>): T[] {
  return users
    .map((u, i) => ({ u, i, f: friendIds.has(u.id) ? 0 : 1 }))
    .sort((a, b) => a.f - b.f || a.i - b.i)
    .map(x => x.u);
}
