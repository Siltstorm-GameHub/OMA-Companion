/**
 * Community-Ziel — Zusatz zum Skill-Index Modus (coop_stats). Die Runden und Stats werden ganz normal
 * im Skill-Index erfasst (MatchEntry.statsJson); das Ziel ist nur ein Zähler, der die Werte
 * ausgewählter Stat-Felder über alle Runden aufaddiert, bis eine Zielmarke erreicht ist — egal ob
 * Tore, Kills oder Schritte im echten Leben.
 *
 * Gespeichert in Event.statConfigJson unter "goal" (siehe schema.prisma). Kein eigener Format-Wert:
 * das Event bleibt "coop_stats", damit Ranking, Overlay, Abschluss usw. unverändert funktionieren.
 *
 * scope:
 *  - "community": alle zusammen — eine gemeinsame Summe über alle Teilnehmer
 *  - "team":      Team A und Team B zählen getrennt (Team-Zuordnung pro Runde, "_team" im statsJson)
 *  - "solo":      jeder Spieler für sich — jeder versucht die Zielmarke allein zu erreichen
 */
import { parseEntryStats, readStatValue } from "./avg-stats";

export type CommunityGoalScope = "community" | "team" | "solo";

export type CommunityGoal = {
  /** Kurzer Name des Ziels, z.B. "1.000 Tore für die Community" — optional */
  title?: string;
  /** Stat-Felder, deren Werte aufaddiert werden (mind. eins) */
  fields: string[];
  /** Zielmarke (> 0) */
  target: number;
  scope: CommunityGoalScope;
  /** Einheit für die Anzeige, z.B. "Tore", "Schritte" — fehlt = Feldname(n) */
  unit?: string;
  /** Münzen für jeden Mitwirkenden, sobald das Ziel erreicht ist (community: alle mit Beitrag, team: Mitglieder
   *  des Siegerteams, solo: wer die Marke selbst erreicht). Bei Community-Events gekappt, siehe
   *  lib/community-goal-milestones.ts */
  rewardCoins?: number;
};

export const COMMUNITY_GOAL_SCOPES: { value: CommunityGoalScope; label: string; desc: string }[] = [
  { value: "community", label: "Alle zusammen", desc: "Eine gemeinsame Summe aller Teilnehmer" },
  { value: "team",      label: "Im Team",       desc: "Team A und Team B zählen getrennt" },
  { value: "solo",      label: "Alleine",       desc: "Jeder Spieler versucht das Ziel für sich" },
];

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
  return { fields, target, scope, ...(title && { title }), ...(unit && { unit }), ...(rewardCoins > 0 && { rewardCoins }) };
}

/** Für API-Routen, die eine komplette statConfig vom Client übernehmen: das "goal" darin wird
 *  geprüft (nur bei coop_stats und nur mit vorhandenen Stat-Feldern) bzw. entfernt. */
export function withSanitizedGoal<T>(statConfig: T, format: string | null | undefined, statFields: unknown): T {
  if (!statConfig || typeof statConfig !== "object" || !("goal" in statConfig)) return statConfig;
  const { goal, ...rest } = statConfig as Record<string, unknown>;
  const fields = Array.isArray(statFields) ? statFields.filter((f): f is string => typeof f === "string") : undefined;
  const clean = format === "coop_stats" ? sanitizeCommunityGoal(goal, fields) : null;
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
  /** Summe aller gezählten Werte (alle Teilnehmer, alle Runden) */
  total: number;
  /** Beitrag je Spieler (für "Top-Beiträge" bzw. den Solo-Fortschritt) */
  byUser: Record<string, number>;
  /** Nur scope "team": Summe je Team; Einträge ohne Team-Zuordnung zählen in keinem Team */
  byTeam: { A: number; B: number };
  /** Hauptfortschritt: community = total, team = bestes Team, solo = bester Spieler */
  main: GoalBucket;
  /** Gilt das Ziel als erreicht? community: Summe ≥ Ziel; team: ein Team hat es geschafft; solo: mind. ein Spieler */
  reached: boolean;
  /** Nur team: welche Teams das Ziel erreicht haben */
  reachedTeams: ("A" | "B")[];
  /** Nur solo: welche Spieler das Ziel erreicht haben */
  reachedUserIds: string[];
};

function bucket(total: number, target: number): GoalBucket {
  return { total, reached: total >= target, percent: target > 0 ? Math.max(0, Math.min(100, (total / target) * 100)) : 0 };
}

/** Zählt die Ziel-Felder über alle Runden. Werden auch für noch nicht abgeschlossene Runden gezählt —
 *  ein eingetragener Wert ist ein eingetragener Wert, das Ziel soll live mitlaufen. */
export function computeCommunityGoalProgress(
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
  const main = bucket(mainTotal, goal.target);
  return { goal, total, byUser, byTeam, main, reached: main.reached, reachedTeams, reachedUserIds };
}

export function goalPercent(value: number, target: number): number {
  return bucket(value, target).percent;
}

/** Einheit für die Anzeige: explizite Einheit, sonst die Feldnamen ("Tore + Assists"). */
export function goalUnit(goal: CommunityGoal): string {
  return goal.unit || goal.fields.join(" + ");
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
