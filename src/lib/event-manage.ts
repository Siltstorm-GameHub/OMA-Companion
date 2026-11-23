import { dayBucket, type DayBucket } from "./event-display";

/*
 * Events → Reiter "Verwalten": reine Logik (ohne DB) — was eine Aktion braucht, Status in Klartext,
 * Gruppierung nach Zeit, Fortschritt von Eventreihen und Suche.
 */

export type ManageEvent = {
  id: string;
  title: string;
  status: string;
  startAt: Date;
  endAt: Date | null;
  game: string | null;
  maxPlayers: number | null;
  /** Anmeldungen als Spieler */
  players: number;
  tournamentStatus: string | null;
  hidden: boolean;
  /** null = von Mods angelegt; "pending" | "approved" = Community-Event */
  approvalStatus: string | null;
  completed: boolean;
  series: { id: string; name: string; icon: string | null; index: number; total: number } | null;
  /** Ersteller bei Community-Events (für Mods), sonst null */
  createdBy: string | null;
  /** Community-Ziel (eigen oder von der Reihe): Fortschritt in %, erreicht, abgerechnet — fehlt = kein Ziel */
  goal?: { percent: number; reached: boolean; settled: boolean } | null;
};

export type ManageAction = { kind: "tournament" | "poll" | "complete"; label: string; button: string; href: string; since: Date | null; late: boolean };

// Client-sicher (keine Server-Importe): wird auch von der Suche im Browser genutzt.
// Achtung: "closed" heißt "voll / Anmeldung geschlossen" — das Event steht noch an und ist NICHT beendet.
const CLOSED = ["finished", "archived"];
/** Ab 2 Tagen gilt ein vorbeigegangenes, nicht abgeschlossenes Event als überfällig */
const LATE_MS = 2 * 24 * 60 * 60 * 1000;
const isLate = (since: Date, now: Date) => now.getTime() - since.getTime() >= LATE_MS;
const isEnded = (e: Pick<ManageEvent, "startAt" | "endAt">, now: Date) => (e.endAt ? e.endAt < now : e.startAt < now);

/** Braucht dieses Event gerade eine Handlung? (Turnier, Umfragephase, vorbei und nicht abgeschlossen) */
export function actionFor(e: ManageEvent, now: Date = new Date()): ManageAction | null {
  if (e.status === "finished" || e.status === "archived") return null;
  if (e.tournamentStatus === "active" || e.tournamentStatus === "pending") {
    return {
      kind: "tournament", button: "Spielplan", href: `/events/verwalten/${e.id}/bracket`, since: null, late: false,
      label: e.tournamentStatus === "active" ? "Läuft, Ergebnisse eintragen" : "Spielplan bereit zum Start",
    };
  }
  if (e.status === "umfrage") {
    return { kind: "poll", button: "Abschließen", href: `/events/verwalten/${e.id}/complete`, since: null, late: false, label: "Umfragephase, danach abschließen" };
  }
  if (!e.tournamentStatus && isEnded(e, now)) {
    const since = e.endAt ?? e.startAt;
    const late = isLate(since, now);
    // Community-Ziel: noch nicht abgerechnet → passiert mit dem Abschluss
    const goalNote = e.goal && !e.goal.settled ? ` · Ziel ${Math.floor(e.goal.percent)} %, wird mit dem Abschluss abgerechnet` : "";
    return {
      kind: "complete", button: "Abschließen", href: `/events/verwalten/${e.id}/complete`, since, late,
      label: (late ? "Vorbei, Belohnungen stehen aus" : "Vorbei, noch nicht abgeschlossen") + goalNote,
    };
  }
  return null;
}

/** Status in Klartext statt Admin-Begriffen (open/active/closed …) */
export function statusText(e: ManageEvent, now: Date = new Date()): string {
  if (e.status === "finished" || e.status === "archived") return e.completed ? "Abgeschlossen" : "Beendet";
  if (e.status === "umfrage") return "Umfragephase";
  if (e.startAt <= now && !isEnded(e, now)) return "Läuft";
  if (e.status === "closed" || (e.maxPlayers != null && e.players >= e.maxPlayers)) return "Voll";
  if (isEnded(e, now)) return "Vorbei";
  return "Anmeldung offen";
}

/** "running" = läuft gerade (Zeitraum-Event mitten drin oder schon gestartet), sonst nach Starttag */
export type ManageBucket = "running" | DayBucket;
export type ManageGroups = { action: { ev: ManageEvent; action: ManageAction }[]; upcoming: Record<ManageBucket, ManageEvent[]>; past: ManageEvent[] };

/**
 * Teilt Events auf: "Braucht dich" (mit Aktion, Überfälliges zuerst), "Anstehend" nach
 * Läuft gerade / Heute / Diese Woche / Später (ohne die mit Aktion) und "Beendet" (neueste zuerst).
 */
export function groupManageEvents(events: ManageEvent[], now: Date = new Date()): ManageGroups {
  const action: ManageGroups["action"] = [];
  const upcoming: ManageGroups["upcoming"] = { running: [], today: [], week: [], later: [] };
  const past: ManageEvent[] = [];
  for (const ev of events) {
    const a = actionFor(ev, now);
    if (a) { action.push({ ev, action: a }); continue; }
    if (CLOSED.includes(ev.status) || isEnded(ev, now)) { past.push(ev); continue; }
    if (ev.startAt <= now || ev.status === "active") { upcoming.running.push(ev); continue; }
    upcoming[dayBucket(ev.startAt, now)].push(ev);
  }
  action.sort((a, b) => Number(b.action.late) - Number(a.action.late)
    || (a.action.since?.getTime() ?? Infinity) - (b.action.since?.getTime() ?? Infinity)
    || a.ev.startAt.getTime() - b.ev.startAt.getTime());
  for (const k of Object.keys(upcoming) as ManageBucket[]) upcoming[k].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  past.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  return { action, upcoming, past };
}

export type SeriesProgress = { played: number; total: number; next: Date | null; seasonDone: boolean };

/** Fortschritt einer Eventreihe; "seasonDone" = alle Termine gespielt, Endwertung noch offen */
export function seriesProgress(
  events: { startAt: Date; endAt: Date | null; status: string }[],
  seriesCompleted: boolean,
  now: Date = new Date(),
): SeriesProgress {
  const total = events.length;
  const played = events.filter((e) => CLOSED.includes(e.status) || isEnded(e, now)).length;
  const next = events.filter((e) => !CLOSED.includes(e.status) && e.startAt >= now).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0]?.startAt ?? null;
  return { played, total, next, seasonDone: total > 0 && played === total && !seriesCompleted };
}

/** Suche über Titel, Spiel, Reihe und Ersteller (ohne Groß/Klein und Akzente) */
export function matchesQuery(e: ManageEvent, query: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm(query.trim());
  if (!q) return true;
  return [e.title, e.game ?? "", e.series?.name ?? "", e.createdBy ?? ""].some((s) => norm(s).includes(q));
}

/** Ablauf-Leiste der Bearbeitungsseite */
export const LIFECYCLE_STEPS = ["Anmeldung offen", "Läuft", "Abschluss", "Abgeschlossen"] as const;

/**
 * Wo steht das Event im Ablauf? 0 = Anmeldung offen (vor dem Start), 1 = läuft, 2 = Abschluss fällig
 * (Umfragephase oder vorbei, aber nicht abgeschlossen), 3 = abgeschlossen.
 */
export function lifecycleStep(e: { status: string; startAt: Date; endAt: Date | null }, now: Date = new Date()): 0 | 1 | 2 | 3 {
  if (e.status === "finished" || e.status === "archived") return 3;
  if (e.status === "umfrage") return 2;
  const ended = e.endAt ? e.endAt < now : false;
  if (ended) return 2;
  if (e.status === "active" || e.startAt <= now) return e.endAt || e.status === "active" ? 1 : 2;
  return 0;
}
