import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  RESULT_SCORE_FIELD, computeCommunityGoalProgress, goalFieldsFor, goalUnit, sanitizeCommunityGoal,
  supportsCommunityGoal, toGoalMatches, withSanitizedGoal, type CommunityGoal,
} from "./community-goal";
import { formToGoal, goalToForm } from "./community-goal-form";
import { goalStreakAfter, parseGoalState, streakBonusDue } from "./goal-state";
import { resultText } from "./community-goal-milestones";
import { takePlannedGoal } from "./goal-plan";
import { parseTournamentTemplate, serializeTournamentTemplate } from "./series-seasons";
import { computeEventPoints, GOAL_BONUS_POINTS_FIELD } from "./series-event-points";

const duel = (p1: string, p2: string, s1: number | null, s2: number | null) =>
  ({ entries: [], player1Id: p1, player2Id: p2, score1: s1, score2: s2 });

describe("Ergebnis-Ziele (Liga, K.O. & Co.)", () => {
  test("Formate", () => {
    for (const f of ["ffa", "coop_stats", "avg_stats", "round_robin", "liga", "single_elimination", "group_knockout"]) {
      assert.equal(supportsCommunityGoal(f), true, f);
    }
    assert.deepEqual(goalFieldsFor("liga", ["Kills"]), [RESULT_SCORE_FIELD]);
    assert.deepEqual(goalFieldsFor("coop_stats", ["Kills"]), ["Kills"]);
  });

  test("1v1-Ergebnisse werden zu Toren je Spieler, ungespielte Matches zählen nicht", () => {
    const m = toGoalMatches([duel("a", "b", 3, 1), duel("a", "c", null, null)]);
    assert.equal(m[0].entries.length, 2);
    assert.equal(m[1].entries.length, 0);
  });

  test("Summe: 100 Tore insgesamt", () => {
    const goal: CommunityGoal = { fields: [RESULT_SCORE_FIELD], target: 10, scope: "community" };
    const p = computeCommunityGoalProgress([duel("a", "b", 3, 1), duel("a", "c", 2, 4)], goal);
    assert.equal(p.total, 10);
    assert.deepEqual(p.byUser, { a: 5, b: 1, c: 4 });
    assert.equal(p.reached, true);
    assert.equal(goalUnit(goal), "Tore");
  });

  test("Durchschnitt: Ø Tore pro Spiel je Spieler", () => {
    const p = computeCommunityGoalProgress([duel("a", "b", 3, 1), duel("a", "b", 1, 1)],
      { fields: [RESULT_SCORE_FIELD], target: 1.5, scope: "community", mode: "avg" });
    assert.deepEqual(p.byUser, { a: 2, b: 1 });
    assert.equal(p.total, 1.5);
    assert.equal(p.reached, true);
  });

  test("withSanitizedGoal lässt in Liga nur das Ergebnis-Feld zu", () => {
    const ok = withSanitizedGoal({ goal: { fields: [RESULT_SCORE_FIELD], target: 100 } }, "liga", null) as { goal?: unknown };
    assert.ok(ok.goal);
    const bad = withSanitizedGoal({ goal: { fields: ["Kills"], target: 100 } }, "liga", ["Kills"]) as { goal?: unknown };
    assert.equal(bad.goal, undefined);
  });

  test("formToGoal setzt im Ergebnis-Modus das Feld und macht aus Team alle zusammen", () => {
    const g = formToGoal({ ...goalToForm(null), enabled: true, scope: "team", target: 50 }, [RESULT_SCORE_FIELD]);
    assert.deepEqual(g?.fields, [RESULT_SCORE_FIELD]);
    assert.equal(g?.scope, "community");
  });
});

describe("Zusatzoptionen", () => {
  test("sanitize: Endstand-Meldung, Serien-Bonus (mind. 2 Zyklen), Tabellenpunkte", () => {
    const g = sanitizeCommunityGoal({ fields: ["Tore"], target: 10, announceResult: true, streakBonus: { length: 3, coins: 50 }, rewardSeriesPoints: 5 });
    assert.deepEqual(g, { fields: ["Tore"], target: 10, scope: "community", announceResult: true, streakBonus: { length: 3, coins: 50 }, rewardSeriesPoints: 5 });
    const off = sanitizeCommunityGoal({ fields: ["Tore"], target: 10, announceResult: "ja", streakBonus: { length: 1, coins: 50 }, rewardSeriesPoints: -3 });
    assert.deepEqual(off, { fields: ["Tore"], target: 10, scope: "community" });
  });

  test("Formular ↔ Ziel bleibt erhalten", () => {
    const g: CommunityGoal = { fields: ["Tore"], target: 10, scope: "community", announceResult: true, streakBonus: { length: 4, coins: 20 }, rewardSeriesPoints: 3 };
    assert.deepEqual(formToGoal(goalToForm(g), ["Tore"]), g);
  });

  test("Serie: geschafft in Folge und Bonus alle N Zyklen", () => {
    assert.equal(goalStreakAfter([]), 1);
    assert.equal(goalStreakAfter([true, true, false, true]), 3);
    assert.equal(streakBonusDue(3, { length: 3 }), true);
    assert.equal(streakBonusDue(6, { length: 3 }), true);
    assert.equal(streakBonusDue(4, { length: 3 }), false);
    assert.equal(streakBonusDue(3, null), false);
  });

  test("Endstand-Text", () => {
    const base = computeCommunityGoalProgress([{ entries: [{ userId: "a", statsJson: JSON.stringify({ Tore: 95 }) }] }],
      { fields: ["Tore"], target: 100, scope: "community" });
    assert.equal(resultText(base).title, "Knapp verfehlt");
    assert.match(resultText(base).text, /5 %/);
    const far = computeCommunityGoalProgress([], { fields: ["Tore"], target: 100, scope: "community" });
    assert.equal(resultText(far).title, "Verfehlt");
  });

  test("Tabellenpunkte aus dem Ziel zählen in der Reihentabelle (nur abgeschlossene Spielphase)", () => {
    const goalStateJson = JSON.stringify({ milestones: [100], rewardedUserIds: ["a"], seriesPoints: { a: 5 } });
    const done = computeEventPoints({
      completionData: JSON.stringify({ gamePhaseComplete: true }), registrations: [{ userId: "a" }], matches: [], goalStateJson,
    }, { participationPoints: 1, stats: [] });
    assert.equal(done.pointsByUser.a, 6);
    assert.equal(done.statsByUser.a[GOAL_BONUS_POINTS_FIELD], 5);
    const open = computeEventPoints({ completionData: null, registrations: [{ userId: "a" }], matches: [], goalStateJson }, { participationPoints: 1, stats: [] });
    assert.equal(open.pointsByUser.a, undefined);
    assert.deepEqual(parseGoalState(goalStateJson).seriesPoints, { a: 5 });
  });
});

describe("Ziel-Planung", () => {
  const plan: CommunityGoal[] = [
    { fields: ["Kills"], target: 2, scope: "community", mode: "avg" },
    { fields: ["Tore"], target: 500, scope: "community" },
  ];

  test("Vorlage speichert den Plan", () => {
    const t = parseTournamentTemplate(serializeTournamentTemplate({ goalPlan: plan }));
    assert.deepEqual(t.goalPlan, plan);
    assert.equal(parseTournamentTemplate(serializeTournamentTemplate({ goalPlan: [] })).goalPlan, undefined);
  });

  test("der nächste Zyklus nimmt das erste Ziel, der Rest bleibt", () => {
    const r = takePlannedGoal(plan, "coop_stats", ["Kills", "Tore"]);
    assert.deepEqual(r.goal, plan[0]);
    assert.deepEqual(r.rest, [plan[1]]);
  });

  test("passt das Feld nicht zum Termin, wird das Ziel verbraucht, aber nicht gesetzt", () => {
    const r = takePlannedGoal(plan, "coop_stats", ["Tore"]);
    assert.equal(r.goal, null);
    assert.deepEqual(r.rest, [plan[1]]);
  });

  test("Formate ohne Ziel verbrauchen nichts", () => {
    const r = takePlannedGoal(plan, null, []);
    assert.equal(r.goal, null);
    assert.equal(r.rest.length, 2);
  });
});
