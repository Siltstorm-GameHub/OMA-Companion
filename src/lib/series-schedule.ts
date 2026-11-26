// ============================================
// Terminplanung einer Eventreihe — reine Logik (ohne DB, auch im Client nutzbar)
// ============================================
// Jede Reihe hat eine Ablaufart:
//
//   A) "termine" — Feste Termine: Regel (wöchentlich, alle 2 Wochen, monatlich am Tag X oder am n-ten
//      Wochentag) mit fester Dauer. Jeder Termin merkt sich seinen Soll-Platz in der Regel
//      (Event.slotIndex). Verschiebt man einen Termin, bleibt sein Platz — der nächste kommt wieder
//      regulär. Fällt ein Termin aus, wird sein Platz übersprungen (skippedSlots) und nicht neu angelegt.
//      Ohne Regel (rhythm = null) werden Termine nur von Hand angelegt.
//
//   B) "runden" — Laufende Zeiträume: Runden schließen lückenlos aneinander an (Start = Ende der
//      vorigen Runde + 1 Minute, angezeigt als "bis So 23:59"). Die Regel legt die Grenzen fest
//      (Kalenderwoche, Kalendermonat oder ab einem eigenen Starttag). Wird eine Runde verlängert,
//      beginnt die nächste später, endet aber an ihrer regulären Grenze — der Rhythmus bleibt stabil.
//
// Beide Arten legen automatisch `aheadCount` kommende Termine im Voraus an (lib/series-schedule-server.ts),
// damit User sich früh anmelden und Admins Spiel/Ziel vorab am Termin planen können.
// Alle Wanduhrzeiten sind Europe/Berlin (lib/time.ts) — die Zeitumstellung verschiebt nichts.

import { fromDatetimeLocalBerlin, getBerlinDateParts } from "./time";

export type ScheduleMode = "termine" | "runden";
export type ScheduleRhythm = "weekly" | "biweekly" | "monthly" | "days";
export type MonthlyMode = "dayOfMonth" | "weekdayOfMonth";
export type ScheduleEnd =
  | { type: "none" }
  | { type: "date"; at: string }
  | { type: "count"; count: number };

export type SeriesSchedule = {
  mode: ScheduleMode;
  /** null = keine feste Regel (nur bei "termine"): Termine werden nur von Hand angelegt */
  rhythm: ScheduleRhythm | null;
  /** Nur rhythm "monthly" bei "termine" — Runden laufen immer ab demselben Kalendertag */
  monthlyMode: MonthlyMode;
  /** Nur rhythm "days": Länge eines Abschnitts in Tagen */
  intervalDays: number;
  /** Beginn von Platz 0 (ISO) — Anker der Regel */
  anchorAt: string;
  /** Nur "termine": Dauer eines Termins in Minuten (0 = ohne Ende) */
  durationMinutes: number;
  /** So viele kommende Termine sind immer schon angelegt und angekündigt */
  aheadCount: number;
  /** Spieler des laufenden/letzten Termins im neuen Termin automatisch anmelden */
  carryParticipants: boolean;
  /** Ende der Reihe */
  end: ScheduleEnd;
  /** Nur "termine": ausgefallene Plätze — werden nie (neu) angelegt */
  skippedSlots: number[];
};

export const SCHEDULE_MODES: ScheduleMode[] = ["termine", "runden"];
export const MAX_AHEAD = 4;
export const MIN_INTERVAL_DAYS = 2;
export const MAX_INTERVAL_DAYS = 90;
export const MAX_END_COUNT = 500;
/** Abstand zwischen Rundenende und nächstem Rundenstart ("bis So 23:59" → "ab Mo 00:00") */
export const ROUND_GAP_MS = 60_000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** Runden müssen länger als 24 h dauern — sonst wären sie keine Zeitraum-Events (lib/event-period.ts) */
const MIN_ROUND_MS = DAY_MS;

export const MODE_LABEL: Record<ScheduleMode, string> = { termine: "Eventreihe", runden: "Challenge-Reihe" };
/** Wie ein einzelner Termin heißt */
export const TERM_LABEL: Record<ScheduleMode, { one: string; many: string }> = {
  termine: { one: "Termin", many: "Termine" },
  runden: { one: "Runde", many: "Runden" },
};

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const ORDINALS_DE = ["", "1.", "2.", "3.", "4.", "5."];

// ── Kalender-Hilfen (Berlin-Wanduhrzeit) ────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

/** Wochentag (0 = Sonntag) eines Kalendertags — nur y/m/d fließen ein, daher zeitzonenunabhängig. */
function weekdayOf(year: number, month1: number, day: number): number {
  return new Date(Date.UTC(year, month1 - 1, day)).getUTCDay();
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Berlin-Wanduhrzeit → Zeitpunkt. Tag/Minute dürfen überlaufen (werden über UTC normalisiert). */
export function berlinWall(year: number, month1: number, day: number, hour: number, minute: number): Date {
  const n = new Date(Date.UTC(year, month1 - 1, day, hour, minute));
  return fromDatetimeLocalBerlin(
    `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}T${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}`,
  );
}

/** Wanduhrzeit + Minuten (nicht Millisekunden) — "3 Std." bleiben über die Zeitumstellung 3 Std. Wanduhr. */
export function addWallMinutes(date: Date, minutes: number): Date {
  const p = getBerlinDateParts(date);
  return berlinWall(p.year, p.month, p.day, p.hour, p.minute + minutes);
}

/** Wanduhr-Minuten zwischen zwei Zeitpunkten (für die Dauer bestehender Termine). */
export function wallMinutesBetween(start: Date, end: Date): number {
  const a = getBerlinDateParts(start);
  const b = getBerlinDateParts(end);
  const ua = Date.UTC(a.year, a.month - 1, a.day, a.hour, a.minute);
  const ub = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute);
  return Math.round((ub - ua) / MINUTE_MS);
}

function nthWeekdayOfMonth(year: number, month1: number, weekday: number, n: number): number {
  const first = weekdayOf(year, month1, 1);
  let day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  // 5. Wochentag gibt es nicht in jedem Monat → 4.
  if (day > daysInMonth(year, month1)) day -= 7;
  return day;
}

/** Beschriftungen der beiden Monats-Optionen, abgeleitet aus dem Anker ("Jeden 3. des Monats" …). */
export function describeMonthlyModes(anchor: Date): Record<MonthlyMode, string> {
  const { year, month, day } = getBerlinDateParts(anchor);
  return {
    dayOfMonth: `Jeden ${day}. des Monats`,
    weekdayOfMonth: `Jeden ${ORDINALS_DE[Math.ceil(day / 7)]} ${WEEKDAYS_DE[weekdayOf(year, month, day)]} im Monat`,
  };
}

/** Montag 00:00 der Woche, in der `date` liegt (Berlin). */
export function startOfBerlinWeek(date: Date): Date {
  const { year, month, day } = getBerlinDateParts(date);
  const wd = weekdayOf(year, month, day);
  return berlinWall(year, month, day - ((wd + 6) % 7), 0, 0);
}

/** 1. des Monats 00:00, in dem `date` liegt (Berlin). */
export function startOfBerlinMonth(date: Date): Date {
  const { year, month } = getBerlinDateParts(date);
  return berlinWall(year, month, 1, 0, 0);
}

// ── Konfiguration ───────────────────────────────────────────────────────────

const isRhythm = (v: unknown): v is ScheduleRhythm => v === "weekly" || v === "biweekly" || v === "monthly" || v === "days";
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const validIso = (v: unknown): string | null =>
  typeof v === "string" && !isNaN(new Date(v).getTime()) ? new Date(v).toISOString() : null;

export function defaultSchedule(mode: ScheduleMode, anchor: Date = new Date()): SeriesSchedule {
  return {
    mode,
    rhythm: "weekly",
    monthlyMode: "dayOfMonth",
    intervalDays: 7,
    anchorAt: anchor.toISOString(),
    durationMinutes: mode === "termine" ? 180 : 0,
    aheadCount: mode === "termine" ? 3 : 2,
    carryParticipants: mode === "runden",
    end: { type: "none" },
    skippedSlots: [],
  };
}

/** Normalisiert eine Planung aus Formular/JSON. null = unbrauchbar (Ablaufart oder Anker fehlt). */
export function sanitizeSchedule(raw: unknown): SeriesSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "termine" || r.mode === "runden" ? r.mode : null;
  const anchorAt = validIso(r.anchorAt);
  if (!mode || !anchorAt) return null;
  let rhythm: ScheduleRhythm | null = isRhythm(r.rhythm) ? r.rhythm : null;
  if (mode === "runden" && !rhythm) rhythm = "weekly";
  const intervalDays = clampInt(r.intervalDays, MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS, 7);
  const monthlyMode: MonthlyMode = mode === "termine" && r.monthlyMode === "weekdayOfMonth" ? "weekdayOfMonth" : "dayOfMonth";
  const durationMinutes = mode === "termine" ? clampInt(r.durationMinutes, 0, 60 * DAY_MS / MINUTE_MS, 0) : 0;
  const e = (r.end && typeof r.end === "object" ? r.end : {}) as Record<string, unknown>;
  const endAt = validIso(e.at);
  const end: ScheduleEnd = e.type === "date" && endAt ? { type: "date", at: endAt }
    : e.type === "count" ? { type: "count", count: clampInt(e.count, 1, MAX_END_COUNT, 1) }
      : { type: "none" };
  const skippedSlots = mode === "termine" && Array.isArray(r.skippedSlots)
    ? [...new Set(r.skippedSlots.map(Number).filter(n => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b)
    : [];
  return {
    mode, rhythm, monthlyMode, intervalDays, anchorAt, durationMinutes,
    aheadCount: clampInt(r.aheadCount, 1, MAX_AHEAD, mode === "termine" ? 3 : 2),
    carryParticipants: r.carryParticipants === true,
    end, skippedSlots,
  };
}

export function parseSchedule(json: string | null | undefined): SeriesSchedule | null {
  if (!json) return null;
  try { return sanitizeSchedule(JSON.parse(json)); } catch { return null; }
}

export function serializeSchedule(s: SeriesSchedule): string {
  return JSON.stringify(s);
}

/** Haben sich Regel-Felder geändert (dann müssen die Termine neu zugeordnet werden)? */
export function ruleChanged(a: SeriesSchedule, b: SeriesSchedule): boolean {
  return a.mode !== b.mode || a.rhythm !== b.rhythm || a.anchorAt !== b.anchorAt
    || (a.rhythm === "monthly" && a.monthlyMode !== b.monthlyMode)
    || (a.rhythm === "days" && a.intervalDays !== b.intervalDays);
}

/** Ungefähre Länge eines Abschnitts (für Toleranzen und Prüfungen). */
export function periodMs(s: Pick<SeriesSchedule, "rhythm" | "intervalDays">): number {
  switch (s.rhythm) {
    case "weekly": return 7 * DAY_MS;
    case "biweekly": return 14 * DAY_MS;
    case "monthly": return 28 * DAY_MS; // kürzester Monat — Untergrenze
    case "days": return s.intervalDays * DAY_MS;
    default: return 0;
  }
}

/** Warum diese Planung nicht gespeichert werden kann — oder null. */
export function scheduleProblem(s: SeriesSchedule): string | null {
  if (s.mode === "runden") {
    if (!s.rhythm) return "Runden brauchen einen Rhythmus.";
    if (s.rhythm === "days" && s.intervalDays < MIN_INTERVAL_DAYS) return `Eine Runde dauert mindestens ${MIN_INTERVAL_DAYS} Tage.`;
  }
  if (s.mode === "termine" && s.rhythm && s.durationMinutes * MINUTE_MS >= periodMs(s)) {
    return "Ein Termin dauert länger als der Abstand zum nächsten — die Termine würden sich überschneiden. Für lückenlose Zeiträume nimm „Laufende Runden“.";
  }
  if (s.end.type === "date" && new Date(s.end.at) < new Date(s.anchorAt)) return "Das Ende der Reihe liegt vor dem ersten Termin.";
  return null;
}

// ── Plätze der Regel ────────────────────────────────────────────────────────

/** Start von Platz i nach der Regel (null ohne Regel). */
export function slotStart(s: SeriesSchedule, i: number): Date | null {
  if (!s.rhythm) return null;
  const a = getBerlinDateParts(new Date(s.anchorAt));
  if (s.rhythm === "monthly") {
    const m0 = a.month - 1 + i;
    const year = a.year + Math.floor(m0 / 12);
    const month = (((m0 % 12) + 12) % 12) + 1;
    const day = s.mode === "termine" && s.monthlyMode === "weekdayOfMonth"
      ? nthWeekdayOfMonth(year, month, weekdayOf(a.year, a.month, a.day), Math.ceil(a.day / 7))
      : Math.min(a.day, daysInMonth(year, month));
    return berlinWall(year, month, day, a.hour, a.minute);
  }
  const step = s.rhythm === "weekly" ? 7 : s.rhythm === "biweekly" ? 14 : s.intervalDays;
  return berlinWall(a.year, a.month, a.day + i * step, a.hour, a.minute);
}

/** Regulärer Endzeitpunkt von Platz i (Termine: Start + Dauer; Runden: nächste Grenze − 1 Min.). */
export function slotEnd(s: SeriesSchedule, i: number): Date | null {
  if (s.mode === "runden") {
    const next = slotStart(s, i + 1);
    return next ? new Date(next.getTime() - ROUND_GAP_MS) : null;
  }
  const start = slotStart(s, i);
  return start && s.durationMinutes > 0 ? addWallMinutes(start, s.durationMinutes) : null;
}

/** Platz, dessen Start einem Zeitpunkt am nächsten liegt (≥ 0), mit Abstand in ms. */
export function nearestSlot(s: SeriesSchedule, date: Date): { slot: number; diffMs: number } | null {
  if (!s.rhythm) return null;
  const anchor = new Date(s.anchorAt).getTime();
  const avg = s.rhythm === "monthly" ? 30.44 * DAY_MS : periodMs(s);
  const guess = Math.round((date.getTime() - anchor) / avg);
  let best: { slot: number; diffMs: number } | null = null;
  for (let i = Math.max(0, guess - 2); i <= Math.max(0, guess + 2); i++) {
    const st = slotStart(s, i)!;
    const diff = Math.abs(st.getTime() - date.getTime());
    if (!best || diff < best.diffMs) best = { slot: i, diffMs: diff };
  }
  return best;
}

// ── Beschreibung ────────────────────────────────────────────────────────────

const timeOf = (d: Date) => { const p = getBerlinDateParts(d); return `${pad(p.hour)}:${pad(p.minute)}`; };
const weekdayShort = (d: Date) => { const p = getBerlinDateParts(d); return WEEKDAYS_SHORT[weekdayOf(p.year, p.month, p.day)]; };

/** "Jeden Donnerstag, 20:00–23:00" / "Wöchentliche Runden (Mo 00:00 – So 23:59)" */
export function describeSchedule(s: SeriesSchedule): string {
  const anchor = new Date(s.anchorAt);
  const p = getBerlinDateParts(anchor);
  const wd = WEEKDAYS_DE[weekdayOf(p.year, p.month, p.day)];
  if (s.mode === "termine") {
    if (!s.rhythm) return "Keine feste Regel — Termine werden einzeln angelegt";
    const end = slotEnd(s, 0);
    const time = end ? `${timeOf(anchor)}–${timeOf(end)}` : timeOf(anchor);
    if (s.rhythm === "weekly") return `Jeden ${wd}, ${time}`;
    if (s.rhythm === "biweekly") return `Jeden 2. ${wd}, ${time}`;
    if (s.rhythm === "days") return `Alle ${s.intervalDays} Tage, ${time}`;
    return `${describeMonthlyModes(anchor)[s.monthlyMode]}, ${time}`;
  }
  const end = slotEnd(s, 0)!;
  const span = `${weekdayShort(anchor)} ${timeOf(anchor)} – ${weekdayShort(end)} ${timeOf(end)}`;
  if (s.rhythm === "weekly") return `Wöchentliche Runden (${span})`;
  if (s.rhythm === "biweekly") return `Runden über 2 Wochen (${span})`;
  if (s.rhythm === "monthly") return p.day === 1 && p.hour === 0 && p.minute === 0
    ? "Monatliche Runden (Kalendermonat)"
    : `Monatliche Runden ab dem ${p.day}., ${timeOf(anchor)}`;
  return `Runden über ${s.intervalDays} Tage (${span})`;
}

// ── Planung kommender Termine ───────────────────────────────────────────────

export type ScheduleEvent = { id?: string; slotIndex: number | null; startAt: Date; endAt: Date | null; status?: string };
export type PlannedTerm = { slotIndex: number; startAt: Date; endAt: Date | null };

/**
 * Termine, die jetzt angelegt werden müssen, damit `aheadCount` kommende (noch nicht gestartete)
 * Termine existieren. Vergangene Plätze werden nicht nachträglich angelegt. Sondertermine
 * (slotIndex null) zählen nicht mit. Ohne Regel: nichts.
 */
export function planUpcoming(s: SeriesSchedule, events: ScheduleEvent[], now: Date = new Date()): PlannedTerm[] {
  if (!s.rhythm) return [];
  const slotted = events.filter(e => e.slotIndex != null).sort((a, b) => a.slotIndex! - b.slotIndex!);
  // Abgesagte Termine belegen ihren Platz, zählen aber weder zum Vorlauf noch zur Anzahl der Reihe
  const held = slotted.filter(e => e.status !== "cancelled");
  let future = held.filter(e => e.startAt > now).length;
  let total = held.length;
  const endAt = s.end.type === "date" ? new Date(s.end.at) : null;
  const reachedEnd = (start: Date) =>
    (endAt && start > endAt) || (s.end.type === "count" && total >= s.end.count);
  const out: PlannedTerm[] = [];
  const skipped = new Set(s.skippedSlots);

  if (s.mode === "termine") {
    let i = slotted.length ? slotted[slotted.length - 1].slotIndex! + 1 : 0;
    for (let guard = 0; future < s.aheadCount && guard < 1000; guard++, i++) {
      const start = slotStart(s, i)!;
      if (reachedEnd(start)) break;
      if (skipped.has(i) || start <= now) continue;
      out.push({ slotIndex: i, startAt: start, endAt: slotEnd(s, i) });
      future++; total++;
    }
    return out;
  }

  // Runden: Kette ab dem Ende der letzten Runde
  const last = slotted[slotted.length - 1];
  let i = last ? last.slotIndex! + 1 : 0;
  let start = last
    ? (last.endAt ? new Date(last.endAt.getTime() + ROUND_GAP_MS) : slotStart(s, i)!)
    : slotStart(s, 0)!;
  for (let guard = 0; future < s.aheadCount && guard < 1000; guard++) {
    if (reachedEnd(start)) break;
    // Ende: die nächste reguläre Grenze, die mehr als 24 h nach dem Start liegt
    let j = i;
    while (slotEnd(s, j)!.getTime() - start.getTime() <= MIN_ROUND_MS && j - i < 400) j++;
    const end = slotEnd(s, j)!;
    if (end > now) {
      out.push({ slotIndex: j, startAt: start, endAt: end });
      total++;
      if (start > now) future++;
    }
    start = new Date(end.getTime() + ROUND_GAP_MS);
    i = j + 1;
  }
  return out;
}

/** Vorschau der ersten `count` Termine ab Platz 0 (Wizard), ohne vorhandene Termine. */
export function previewTerms(s: SeriesSchedule, count: number): PlannedTerm[] {
  if (!s.rhythm) {
    const start = new Date(s.anchorAt);
    return [{ slotIndex: 0, startAt: start, endAt: s.durationMinutes > 0 ? addWallMinutes(start, s.durationMinutes) : null }];
  }
  return planUpcoming({ ...s, aheadCount: count }, [], new Date(new Date(s.anchorAt).getTime() - 1));
}

// ── Zuordnung bestehender Termine (Umstellung alter Reihen / Regel ändern) ──

export type AssignKind = "regular" | "moved" | "extra";
export type Assignment = { eventId: string; slotIndex: number | null; kind: AssignKind };
export type ChainFix = { eventId: string; startAt?: string; endAt?: string; note: string };
export type ChainIssue = { eventId: string; kind: "gap" | "overlap" | "noEnd"; note: string; fix: ChainFix | null };
export type AssignEvent = { id: string; startAt: Date; endAt: Date | null; status: string };

/**
 * Ordnet vorhandene Termine den Plätzen der Regel zu. Jeder Platz nimmt höchstens einen Termin
 * (der nächstgelegene gewinnt). Liegt ein Termin weiter als einen halben Abschnitt von jedem freien
 * Platz entfernt, wird er Sondertermin.
 */
export function assignSlots(s: SeriesSchedule, events: AssignEvent[]): Assignment[] {
  if (!s.rhythm) return events.map(e => ({ eventId: e.id, slotIndex: null, kind: "extra" as const }));
  const tolerance = periodMs(s) / 2;
  const candidates = events
    .map(e => ({ e, near: nearestSlot(s, e.startAt) }))
    .sort((a, b) => (a.near?.diffMs ?? Infinity) - (b.near?.diffMs ?? Infinity));
  const taken = new Set<number>();
  const result = new Map<string, Assignment>();
  for (const { e, near } of candidates) {
    if (near && near.diffMs < tolerance && !taken.has(near.slot)) {
      taken.add(near.slot);
      result.set(e.id, { eventId: e.id, slotIndex: near.slot, kind: near.diffMs <= MINUTE_MS ? "regular" : "moved" });
    } else {
      result.set(e.id, { eventId: e.id, slotIndex: null, kind: "extra" });
    }
  }
  return events.map(e => result.get(e.id)!);
}

/** Plätze unterhalb des höchsten zugeordneten Platzes ohne Termin — gelten als ausgefallen (nur Termine). */
export function missingSlots(s: SeriesSchedule, assignments: Assignment[]): number[] {
  if (s.mode !== "termine" || !s.rhythm) return [];
  const used = new Set(assignments.filter(a => a.slotIndex != null).map(a => a.slotIndex!));
  if (used.size === 0) return [];
  const max = Math.max(...used);
  const out: number[] = [];
  for (let i = 0; i < max; i++) if (!used.has(i)) out.push(i);
  return out;
}

const fmtShort = (d: Date) => {
  const p = getBerlinDateParts(d);
  return `${weekdayShort(d)} ${pad(p.day)}.${pad(p.month)}. ${pad(p.hour)}:${pad(p.minute)}`;
};

/**
 * Runden: Lücken, Überschneidungen und fehlende Enden zwischen aufeinanderfolgenden Runden, mit
 * Korrekturvorschlag. Korrigiert wird nur, was noch nicht vorbei ist: der Start einer noch nicht
 * gestarteten Runde oder das Ende einer noch laufenden.
 */
export function chainIssues(s: SeriesSchedule, events: AssignEvent[], assignments: Assignment[], now: Date = new Date()): ChainIssue[] {
  if (s.mode !== "runden") return [];
  const byId = new Map(events.map(e => [e.id, e]));
  const rounds = assignments
    .filter(a => a.slotIndex != null)
    .sort((a, b) => a.slotIndex! - b.slotIndex!)
    .map(a => ({ a, e: byId.get(a.eventId)! }));
  const issues: ChainIssue[] = [];
  for (let k = 0; k < rounds.length; k++) {
    const { a, e } = rounds[k];
    if (!e.endAt) {
      const end = slotEnd(s, a.slotIndex!)!;
      issues.push({
        eventId: e.id, kind: "noEnd", note: "Runde ohne Ende",
        fix: end > now && end > e.startAt ? { eventId: e.id, endAt: end.toISOString(), note: `Ende auf ${fmtShort(end)} setzen` } : null,
      });
      continue;
    }
    const next = rounds[k + 1];
    if (!next) continue;
    const expected = e.endAt.getTime() + ROUND_GAP_MS;
    const delta = next.e.startAt.getTime() - expected;
    if (Math.abs(delta) < MINUTE_MS) continue;
    const kind = delta > 0 ? "gap" : "overlap";
    let fix: ChainFix | null = null;
    if (next.e.startAt > now && (!next.e.endAt || next.e.endAt.getTime() - expected > MIN_ROUND_MS)) {
      fix = { eventId: next.e.id, startAt: new Date(expected).toISOString(), note: `Start der nächsten Runde auf ${fmtShort(new Date(expected))} setzen` };
    } else if (e.endAt > now && next.e.startAt.getTime() - ROUND_GAP_MS > e.startAt.getTime()) {
      const end = new Date(next.e.startAt.getTime() - ROUND_GAP_MS);
      fix = { eventId: e.id, endAt: end.toISOString(), note: `Ende auf ${fmtShort(end)} setzen` };
    }
    issues.push({
      eventId: next.e.id, kind,
      note: kind === "gap" ? "Lücke zur vorigen Runde" : "Überschneidet sich mit der vorigen Runde",
      fix,
    });
  }
  return issues;
}

/**
 * Planung für die nächste Saison: gleiche Regel, Anker = erster regulärer Platz nach dem letzten
 * Termin der Vorsaison (frühestens jetzt). Ausgefallene Plätze und ein abgelaufenes Enddatum entfallen.
 */
export function nextSeasonSchedule(s: SeriesSchedule, events: { startAt: Date; endAt: Date | null }[], now: Date = new Date()): SeriesSchedule {
  const after = Math.max(now.getTime(), ...events.map(e => (e.endAt ?? e.startAt).getTime()));
  let anchor: Date;
  if (s.rhythm) {
    let i = Math.max(0, (nearestSlot(s, new Date(after))?.slot ?? 0) - 1);
    while (slotStart(s, i)!.getTime() < after && i < 100_000) i++;
    anchor = slotStart(s, i)!;
  } else {
    const a = getBerlinDateParts(new Date(s.anchorAt));
    const p = getBerlinDateParts(new Date(after + 7 * DAY_MS));
    anchor = berlinWall(p.year, p.month, p.day, a.hour, a.minute);
  }
  const end: ScheduleEnd = s.end.type === "date" && new Date(s.end.at) <= anchor ? { type: "none" } : s.end;
  return { ...s, anchorAt: anchor.toISOString(), skippedSlots: [], end };
}

// ── Vorschlag für alte Reihen (vor der Umstellung) ──────────────────────────

export type LegacySeries = {
  recurrenceType: string | null;
  recurrenceMonthlyMode: string | null;
  cycleConfigJson: string | null;
};

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
}

/** Alte Zyklus-Einstellung (cycleConfigJson) lesen — nur für den Vorschlag. */
function legacyCycle(json: string | null): { enabled: boolean; aheadCount: number; carry: boolean; endsAt: string | null } {
  try {
    const r = json ? JSON.parse(json) as Record<string, unknown> : {};
    return {
      enabled: r.enabled === true,
      aheadCount: clampInt(r.aheadCount, 1, MAX_AHEAD, 1),
      carry: r.carryParticipants !== false,
      endsAt: validIso(r.endsAt),
    };
  } catch { return { enabled: false, aheadCount: 1, carry: true, endsAt: null }; }
}

/** Rhythmus aus den Abständen der Termine erkennen. */
function inferRhythm(starts: Date[]): { rhythm: ScheduleRhythm | null; intervalDays: number } {
  if (starts.length < 2) return { rhythm: "weekly", intervalDays: 7 };
  const gaps = starts.slice(1).map((d, i) => (d.getTime() - starts[i].getTime()) / DAY_MS);
  const g = median(gaps);
  if (g >= 6 && g <= 8) return { rhythm: "weekly", intervalDays: 7 };
  if (g >= 13 && g <= 15) return { rhythm: "biweekly", intervalDays: 14 };
  if (g >= 27 && g <= 32) return { rhythm: "monthly", intervalDays: 30 };
  if (g >= MIN_INTERVAL_DAYS && g <= MAX_INTERVAL_DAYS) return { rhythm: "days", intervalDays: Math.round(g) };
  return { rhythm: null, intervalDays: 7 };
}

/**
 * Vorschlag für eine Reihe aus der alten Planung: Ablaufart aus der typischen Dauer (> 24 h → Runden),
 * Regel aus der alten Wiederholung bzw. den Abständen, Anker = erster Termin, Vorlauf/Übernahme/Ende
 * aus der alten Zyklus-Einstellung.
 */
export function suggestSchedule(legacy: LegacySeries, events: { startAt: Date; endAt: Date | null }[], now: Date = new Date()): SeriesSchedule {
  const sorted = [...events].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const durations = sorted.filter(e => e.endAt).map(e => e.endAt!.getTime() - e.startAt.getTime());
  const mode: ScheduleMode = median(durations) > DAY_MS ? "runden" : "termine";
  const base = defaultSchedule(mode, sorted[0]?.startAt ?? now);
  const legacyRhythm = isRhythm(legacy.recurrenceType) ? legacy.recurrenceType : null;
  const inferred = inferRhythm(sorted.map(e => e.startAt));
  const rhythm = legacyRhythm ?? inferred.rhythm ?? (mode === "runden" ? "weekly" : null);
  const withEnd = [...sorted].reverse().find(e => e.endAt);
  const cycle = legacyCycle(legacy.cycleConfigJson);
  return {
    ...base,
    rhythm,
    intervalDays: rhythm === "days" ? inferred.intervalDays : base.intervalDays,
    monthlyMode: legacy.recurrenceMonthlyMode === "weekdayOfMonth" ? "weekdayOfMonth" : "dayOfMonth",
    durationMinutes: mode === "termine" && withEnd ? Math.max(0, wallMinutesBetween(withEnd.startAt, withEnd.endAt!)) : base.durationMinutes,
    aheadCount: cycle.enabled ? cycle.aheadCount : base.aheadCount,
    carryParticipants: cycle.enabled ? cycle.carry : base.carryParticipants,
    end: cycle.endsAt ? { type: "date", at: cycle.endsAt } : { type: "none" },
  };
}

// ── Anzeige ─────────────────────────────────────────────────────────────────

/** Laufende Nummer eines Termins in seiner Reihe (1-basiert, nach Start sortiert). */
export function termNumber(eventId: string, events: { id: string; startAt: Date | string }[]): number {
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return sorted.findIndex(e => e.id === eventId) + 1;
}

const MONTHS_SHORT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

/** Kalendertage eines Zeitraums kurz: "17.–23. Nov.", "28. Nov. – 4. Dez.", "1.–30. Nov." */
export function shortDayRange(start: Date | string, end: Date | string): string {
  const a = getBerlinDateParts(new Date(start));
  const b = getBerlinDateParts(new Date(end));
  if (a.year === b.year && a.month === b.month) {
    return a.day === b.day ? `${a.day}. ${MONTHS_SHORT[a.month - 1]}` : `${a.day}.–${b.day}. ${MONTHS_SHORT[b.month - 1]}`;
  }
  return `${a.day}. ${MONTHS_SHORT[a.month - 1]} – ${b.day}. ${MONTHS_SHORT[b.month - 1]}`;
}

/**
 * Bezeichnung eines Termins in seiner Reihe — "Runde 12 · 17.–23. Nov." (Challenge-Reihe),
 * "Termin 7" bzw. "Sondertermin" (Eventreihe). null ohne Ablaufart (alte Reihen).
 */
export function termLabel(mode: string | null | undefined, ev: { slotIndex: number | null; startAt: Date | string; endAt?: Date | string | null }): string | null {
  if (mode === "runden") {
    const n = ev.slotIndex != null ? `Runde ${ev.slotIndex + 1}` : "Runde";
    return ev.endAt ? `${n} · ${shortDayRange(ev.startAt, ev.endAt)}` : n;
  }
  if (mode === "termine") return ev.slotIndex != null ? `Termin ${ev.slotIndex + 1}` : "Sondertermin";
  return null;
}

/** Zeigt die Events-Übersicht nur den nächsten Termin dieser Reihe? (alle Reihen mit Planung, Altbestand mit Zyklen) */
export function showsOnlyNextTerm(series: { scheduleMode?: string | null; cycleConfigJson?: string | null }): boolean {
  return !!series.scheduleMode || legacyCycle(series.cycleConfigJson ?? null).enabled;
}
