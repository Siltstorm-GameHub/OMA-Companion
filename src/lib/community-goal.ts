/**
 * Community-Ziel — Zusatz zu den Stat-Formaten Skill-Index (coop_stats) und Durchschnittswerte
 * (avg_stats). Die Runden und Stats werden ganz normal erfasst (MatchEntry.statsJson); das Ziel wertet
 * ausgewählte Stat-Felder über alle Runden aus, bis eine Zielmarke erreicht ist — egal ob Tore, Kills
 * oder Schritte im echten Leben.
 *
 * Gespeichert in Event.statConfigJson unter "goal" bzw. (Eventreihe) in der Turniervorlage, siehe
 * lib/event-goal.ts. Kein eigener Format-Wert: Ranking, Overlay, Abschluss usw. bleiben unverändert.
 *
 * mode (Berechnungsart):
 *  - "sum" (Standard, fehlt im JSON): alle eingetragenen Werte werden zusammengezählt
 *  - "avg": gemeinsamer Durchschnitt — je Teilnehmer der Ø seiner Einträge (Wert je Eintrag = Summe der
 *           gewählten Felder), dann der Ø über alle Teilnehmer (jeder zählt gleich viel, egal wie viele
 *           Runden er gemeldet hat). Nicht eingetragene Felder zählen nicht als 0.
 *           direction "atMost" dreht das Ziel um ("Ø Platzierung höchstens 3").
 *           Ein Durchschnitt kann wieder fallen — deshalb wird ein Ø-Ziel erst mit dem Ende des
 *           Zeitraums (bzw. Abschluss der Spielphase) abgerechnet, siehe community-goal-milestones.ts.
 *
 * scope:
 *  - "community": alle zusammen — eine gemeinsame Summe bzw. ein gemeinsamer Ø über alle Teilnehmer
 *  - "team":      Team A und Team B zählen getrennt (Team-Zuordnung pro Runde, "_team" im statsJson)
 *  - "solo":      jeder Spieler für sich — jeder versucht die Zielmarke allein zu erreichen
 */
import { parseEntryStats, readStatValue } from "./avg-stats";

export type CommunityGoalScope = "community" | "team" | "solo";
export type CommunityGoalMode = "sum" | "avg";
export type CommunityGoalDirection = "atLeast" | "atMost";

export type CommunityGoal = {
  /** Kurzer Name des Ziels, z.B. "1.000 Tore für die Community" — optional */
  title?: string;
  /** Stat-Felder, deren Werte gezählt werden (mind. eins; bei mehreren: Summe je Eintrag) */
  fields: string[];
  /** Zielmarke (> 0) */
  target: number;
  scope: CommunityGoalScope;
  /** Berechnungsart — fehlt = "sum" (Altdaten) */
  mode?: CommunityGoalMode;
  /** Nur mode "avg": "atMost" = der Ø darf die Marke nicht überschreiten — fehlt = "atLeast" */
  direction?: CommunityGoalDirection;
  /** Nur mode "avg": so viele Teilnehmer müssen Werte haben, damit das Ziel zählen kann (fehlt = 1) */
  minParticipants?: number;
  /** Einheit für die Anzeige, z.B. "Tore", "Schritte" — fehlt = Feldname(n) */
  unit?: string;
  /** Münzen für jeden Mitwirkenden, sobald das Ziel erreicht ist (community: alle mit Beitrag, team: Mitglieder
   *  des Siegerteams, solo: wer die Marke selbst erreicht). Bei Community-Events gekappt, siehe
   *  lib/community-goal-milestones.ts */
  rewardCoins?: number;
};

export const COMMUNITY_GOAL_SCOPES: { value: CommunityGoalScope; label: string; desc: string }[] = [
  { value: "community", label: "Alle zusammen", desc: "Ein gemeinsamer Wert aller Teilnehmer" },
  { value: "team",      label: "Im Team",       desc: "Team A und Team B zählen getrennt" },
  { value: "solo",      label: "Alleine",       desc: "Jeder Spieler versucht das Ziel für sich" },
];

export const COMMUNITY_GOAL_MODES: { value: CommunityGoalMode; label: string; desc: string }[] = [
  { value: "sum", label: "Summe",        desc: "Alle Werte werden zusammengezählt" },
  { value: "avg", label: "Durchschnitt", desc: "Gemeinsamer Ø der Teilnehmer" },
];

/** Formate mit Community-Ziel: Skill-Index (Punktewertung) und Durchschnittswerte. */
export const GOAL_FORMATS = ["coop_stats", "avg_stats"] as const;

export function supportsCommunityGoal(format: string | null | undefined): boolean {
  return !!format && (GOAL_FORMATS as readonly string[]).includes(format);
}

export function isAvgGoal(goal: Pick<CommunityGoal, "mode">): boolean {
  return goal.mode === "avg";
}

const SCOPES = new Set<string>(COMMUNITY_GOAL_SCOPES.map(s => s.value));

/** Prüft/normalisiert eine Ziel-Konfiguration aus Formular oder API. Optional nur Felder zulassen,
 *  die das Event auch als Stat-Feld hat. Gibt null zurück, wenn das Ziel unvollständig ist. */
export function sanitizeCommunityGoal(raw: unknown, allowedFields?: string[]): CommunityGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const target = Number(r.target);
  if (!Number.isFinite(target) || target <= 0) return null;
  const scope = typeof r.scope === "string" && SCOPES.has(r.scope) ? (r.scope as CommunityGoalScope) : "community";
  const fields = Array.isArray(r.fields)
    ? [...new Set(r.fields.filter((f): f is string => typeof f === "string").map(f => f.trim()).filter(Boolean))]
        .filter(f => !allowedFields || allowedFields.includes(f))
    : [];
  if (fields.length === 0) return null;
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 120) : "";
  const unit  = typeof r.unit  === "string" ? r.unit.trim().slice(0, 40)   : "";
  const rewardCoins = Math.min(1_000_000, Math.max(0, Math.floor(Number(r.rewardCoins) || 0)));
  const avg = r.mode === "avg";
  const atMost = avg && r.direction === "atMost";
  const minParticipants = avg ? Math.min(10_000, Math.max(1, Math.floor(Number(r.minParticipants) || 1))) : 1;
  return {
    fields, target, scope,
    ...(avg && { mode: "avg" as const }),
    ...(atMost && { direction: "atMost" as const }),
    ...(minParticipants > 1 && { minParticipants }),
    ...(title && { title }), ...(unit && { unit }), ...(rewardCoins > 0 && { rewardCoins }),
  };
}

/** Für API-Routen, die eine komplette statConfig vom Client übernehmen: das "goal" darin wird
 *  geprüft (nur in Formaten mit Ziel und nur mit vorhandenen Stat-Feldern) bzw. entfernt. */
export function withSanitizedGoal<T>(statConfig: T, format: string | null | undefined, statFields: unknown): T {
  if (!statConfig || typeof statConfig !== "object" || !("goal" in statConfig)) return statConfig;
  const { goal, ...rest } = statConfig as Record<string, unknown>;
  const fields = Array.isArray(statFields) ? statFields.filter((f): f is string => typeof f === "string") : undefined;
  const clean = supportsCommunityGoal(format) ? sanitizeCommunityGoal(goal, fields) : null;
  return (clean ? { ...rest, goal: clean } : rest) as T;
}

/** Liest das Ziel aus Event.statConfigJson — null, wenn keins (gültiges) hinterlegt ist. */
export function parseCommunityGoal(statConfigJson: string | null | undefined): CommunityGoal | null {
  if (!statConfigJson) return null;
  try {
    const cfg = JSON.parse(statConfigJson) as { goal?: unknown };
    return sanitizeCommunityGoal(cfg?.goal);
  } catch { return null; }
}

export type GoalBucket = { total: number; reached: boolean; percent: number };

export type CommunityGoalProgress = {
  goal: CommunityGoal;
  /** sum: Summe aller gezählten Werte · avg: gemeinsamer Ø aller Teilnehmer (0 ohne Werte) */
  total: number;
  /** Je Spieler: sum = sein Beitrag · avg = sein Ø (für "Top-Beiträge" bzw. den Solo-Fortschritt) */
  byUser: Record<string, number>;
  /** Nur scope "team": Summe bzw. Ø je Team; Einträge ohne Team-Zuordnung zählen in keinem Team */
  byTeam: { A: number; B: number };
  /** Spieler mit mindestens einem gezählten Wert */
  contributorIds: string[];
  /** Hauptfortschritt: community = gesamt, team = bestes Team, solo = bester Spieler */
  main: GoalBucket;
  /** Gilt das Ziel (gerade) als erreicht? Bei Ø-Zielen nur ein Zwischenstand bis zum Ende des Zeitraums */
  reached: boolean;
  /** Nur team: welche Teams das Ziel erreicht haben */
  reachedTeams: ("A" | "B")[];
  /** Nur solo: welche Spieler das Ziel erreicht haben */
  reachedUserIds: string[];
  /** Nur avg: Mindestanzahl Teilnehmer noch nicht erreicht (dann zählt das Ziel nicht als erreicht) */
  missingParticipants: number;
};

/** Erfüllt ein Wert die Zielmarke? Berücksichtigt bei Ø-Zielen die Richtung. */
export function meetsGoal(value: number, goal: CommunityGoal): boolean {
  return goal.direction === "atMost" ? value <= goal.target : value >= goal.target;
}

/** Fortschritt in % (0–100). "höchstens"-Ziele: 100 %, sobald der Ø unter der Marke liegt, sonst
 *  Marke / Wert (je weiter darüber, desto weniger). hasData = false (noch keine Werte) → 0 %. */
export function goalPercent(value: number, goal: CommunityGoal, hasData = true): number {
  const t = goal.target;
  if (t <= 0) return 0;
  let pct: number;
  if (goal.direction === "atMost") {
    if (!hasData) return 0;
    pct = value <= t ? 100 : (t / value) * 100;
  } else {
    pct = (value / t) * 100;
  }
  return Math.max(0, Math.min(100, pct));
}

function bucket(total: number, goal: CommunityGoal, hasData = true): GoalBucket {
  return { total, reached: hasData && meetsGoal(total, goal), percent: goalPercent(total, goal, hasData) };
}

const mean = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);

/** Wert eines Eintrags: Summe der eingetragenen Ziel-Felder — null, wenn keins eingetragen ist. */
function entryValue(stats: Record<string, unknown> | null, fields: string[]): number | null {
  let sum = 0;
  let any = false;
  for (const f of fields) {
    const v = readStatValue(stats, f);
    if (v === null) continue;
    sum += v;
    any = true;
  }
  return any ? sum : null;
}

/** Zählt die Ziel-Felder über alle Runden. Werden auch für noch nicht abgeschlossene Runden gezählt —
 *  ein eingetragener Wert ist ein eingetragener Wert, das Ziel soll live mitlaufen. */
export function computeCommunityGoalProgress(
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[],
  goal: CommunityGoal,
): CommunityGoalProgress {
  return isAvgGoal(goal) ? computeAvgProgress(matches, goal) : computeSumProgress(matches, goal);
}

function computeSumProgress(
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[],
  goal: CommunityGoal,
): CommunityGoalProgress {
  let total = 0;
  const byUser: Record<string, number> = {};
  const byTeam = { A: 0, B: 0 };
  for (const m of matches) {
    for (const e of m.entries) {
      const stats = parseEntryStats(e.statsJson);
      if (!stats) continue;
      let sum = 0;
      for (const f of goal.fields) sum += readStatValue(stats, f) ?? 0;
      if (sum === 0) continue;
      total += sum;
      if (e.userId) byUser[e.userId] = (byUser[e.userId] ?? 0) + sum;
      const team = stats["_team"];
      if (team === "A" || team === "B") byTeam[team] += sum;
    }
  }

  const reachedTeams = (["A", "B"] as const).filter(t => byTeam[t] >= goal.target);
  const reachedUserIds = Object.entries(byUser).filter(([, v]) => v >= goal.target).map(([id]) => id);
  const mainTotal =
    goal.scope === "team" ? Math.max(byTeam.A, byTeam.B)
    : goal.scope === "solo" ? Math.max(0, ...Object.values(byUser))
    : total;
  const main = bucket(mainTotal, goal);
  const contributorIds = Object.entries(byUser).filter(([, v]) => v > 0).map(([id]) => id);
  return { goal, total, byUser, byTeam, contributorIds, main, reached: main.reached, reachedTeams, reachedUserIds, missingParticipants: 0 };
}

function computeAvgProgress(
  matches: { entries: { userId: string | null; statsJson: string | null }[] }[],
  goal: CommunityGoal,
): CommunityGoalProgress {
  const perUser = new Map<string, number[]>();
  const teamOf: Record<string, "A" | "B"> = {};
  for (const m of matches) {
    for (const e of m.entries) {
      if (!e.userId) continue;
      const stats = parseEntryStats(e.statsJson);
      const v = entryValue(stats, goal.fields);
      if (v === null) continue;
      const list = perUser.get(e.userId) ?? [];
      list.push(v);
      perUser.set(e.userId, list);
      const team = stats?.["_team"];
      if (team === "A" || team === "B") teamOf[e.userId] = team;
    }
  }

  const byUser: Record<string, number> = {};
  for (const [uid, vals] of perUser) byUser[uid] = mean(vals);
  const contributorIds = Object.keys(byUser);
  const minP = goal.minParticipants ?? 1;
  const enough = (n: number) => n >= minP;

  const teamIds = { A: contributorIds.filter(id => teamOf[id] === "A"), B: contributorIds.filter(id => teamOf[id] === "B") };
  const byTeam = { A: mean(teamIds.A.map(id => byUser[id])), B: mean(teamIds.B.map(id => byUser[id])) };
  const reachedTeams = (["A", "B"] as const).filter(t => enough(teamIds[t].length) && meetsGoal(byTeam[t], goal));
  // Solo: jeder für sich — die Mindestanzahl gilt hier für die Runde insgesamt
  const reachedUserIds = enough(contributorIds.length) ? contributorIds.filter(id => meetsGoal(byUser[id], goal)) : [];
  const total = mean(contributorIds.map(id => byUser[id]));

  // Bester Wert je nach Richtung (höchstens → kleinster Ø)
  const best = (vals: number[]) => (vals.length === 0 ? 0 : goal.direction === "atMost" ? Math.min(...vals) : Math.max(...vals));
  let main: GoalBucket;
  let missingParticipants: number;
  if (goal.scope === "team") {
    const teams = (["A", "B"] as const).filter(t => teamIds[t].length > 0);
    const value = best(teams.map(t => byTeam[t]));
    missingParticipants = Math.max(0, minP - Math.max(teamIds.A.length, teamIds.B.length));
    main = { ...bucket(value, goal, teams.length > 0), reached: reachedTeams.length > 0 };
  } else if (goal.scope === "solo") {
    missingParticipants = Math.max(0, minP - contributorIds.length);
    main = { ...bucket(best(contributorIds.map(id => byUser[id])), goal, contributorIds.length > 0), reached: reachedUserIds.length > 0 };
  } else {
    missingParticipants = Math.max(0, minP - contributorIds.length);
    const b = bucket(total, goal, contributorIds.length > 0);
    main = { ...b, reached: b.reached && missingParticipants === 0 };
  }
  return { goal, total, byUser, byTeam, contributorIds, main, reached: main.reached, reachedTeams, reachedUserIds, missingParticipants };
}

/** Einheit für die Anzeige: explizite Einheit, sonst die Feldnamen ("Tore + Assists"). */
export function goalUnit(goal: CommunityGoal): string {
  return goal.unit || goal.fields.join(" + ");
}

/** Zahl eines Ziels anzeigen: Summen ganzzahlig, Durchschnitte mit bis zu 2 Nachkommastellen. */
export function formatGoalNumber(n: number, goal: Pick<CommunityGoal, "mode">): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: isAvgGoal(goal) ? 2 : 0 });
}

/** Kurzbeschreibung der Zielmarke: "1.000 Tore" bzw. "Ø mind. 2,5 Kills" / "Ø höchstens 3 Platzierung". */
export function goalTargetLabel(goal: CommunityGoal): string {
  const n = formatGoalNumber(goal.target, goal);
  if (!isAvgGoal(goal)) return `${n} ${goalUnit(goal)}`;
  return `Ø ${goal.direction === "atMost" ? "höchstens" : "mind."} ${n} ${goalUnit(goal)}`;
}

export type GoalPace = {
  /** "ahead" = vor dem Plan, "on_track" = auf Kurs, "behind" = hängt hinterher */
  status: "ahead" | "on_track" | "behind";
  label: string;
  /** Erwarteter Fortschritt in % anhand der verstrichenen Zeit */
  expectedPercent: number;
};

/**
 * Tempo eines Ziels: Fortschritt im Vergleich zur verstrichenen Zeit des Event-Zeitraums.
 * Toleranz ±5 Prozentpunkte gilt als "auf Kurs". null, wenn das Ziel schon erreicht ist oder
 * noch keine Zeit vergangen ist (kein sinnvoller Vergleich).
 */
export function goalPace(goalPercent: number, timeProgress: number): GoalPace | null {
  if (goalPercent >= 100 || timeProgress <= 0) return null;
  const expectedPercent = Math.min(100, timeProgress * 100);
  const diff = goalPercent - expectedPercent;
  if (diff > 5) return { status: "ahead", label: "Vor dem Plan", expectedPercent };
  if (diff >= -5) return { status: "on_track", label: "Auf Kurs", expectedPercent };
  return { status: "behind", label: "Wir hängen hinterher", expectedPercent };
}
