import { describe, test } from "node:test";
import { RESULT_SCORE_FIELD } from "./community-goal";
import assert from "node:assert/strict";
import { resolveEventGoal, withGoalMode, freezeGoalForStartedEvent, upcomingGoalOverrides } from "./event-goal";

const seriesGoal = { fields: ["Schritte"], target: 1_000_000, scope: "community" as const };
const series = { tournamentTemplateJson: JSON.stringify({ communityGoal: seriesGoal }) };
const ownGoal = { fields: ["Schritte"], target: 500_000, scope: "community" as const };

describe("Community-Ziel mit Vererbung", () => {
  test("ohne Abweichung erbt der Termin das Reihen-Ziel", () => {
    const r = resolveEventGoal({ format: "coop_stats", statConfigJson: null, series });
    assert.equal(r.source, "series");
    assert.equal(r.goal?.target, 1_000_000);
  });

  test("eigenes Ziel überschreibt, goalOff schaltet ab", () => {
    const override = resolveEventGoal({ format: "coop_stats", statConfigJson: JSON.stringify({ goal: ownGoal }), series });
    assert.equal(override.source, "event");
    assert.equal(override.goal?.target, 500_000);
    const off = resolveEventGoal({ format: "coop_stats", statConfigJson: JSON.stringify({ goalOff: true }), series });
    assert.equal(off.source, "off");
    assert.equal(off.goal, null);
    assert.equal(off.seriesGoal?.target, 1_000_000);
  });

  test("nur Punktewertung, nur vorhandene Stat-Felder", () => {
    assert.equal(resolveEventGoal({ format: "single_elimination", statConfigJson: null, series }).goal, null);
    assert.equal(resolveEventGoal({ format: "coop_stats", statConfigJson: null, series }, ["Kills"]).goal, null);
    assert.equal(resolveEventGoal({ format: "coop_stats", statConfigJson: null, series: null }).source, "none");
  });

  test("Liga/K.O. erben nur Ziele auf das Spielergebnis, Stat-Formate keine Ergebnis-Ziele", () => {
    const resultSeries = { tournamentTemplateJson: JSON.stringify({ communityGoal: { fields: [RESULT_SCORE_FIELD], target: 100 } }) };
    assert.equal(resolveEventGoal({ format: "liga", statConfigJson: null, series: resultSeries }).goal?.target, 100);
    assert.equal(resolveEventGoal({ format: "coop_stats", statConfigJson: null, series: resultSeries }).goal, null);
  });

  test("withGoalMode setzt nur die Abweichung, Rest bleibt", () => {
    const base = JSON.stringify({ stats: [{ field: "Schritte", pointsPer: 1 }], goal: ownGoal });
    assert.deepEqual(JSON.parse(withGoalMode(base, "inherit", null)!), { stats: [{ field: "Schritte", pointsPer: 1 }] });
    assert.deepEqual(JSON.parse(withGoalMode(base, "off", null)!).goalOff, true);
    assert.equal(withGoalMode(JSON.stringify({ goal: ownGoal }), "inherit", null), null);
    assert.equal(JSON.parse(withGoalMode(null, "override", ownGoal)!).goal.target, 500_000);
  });
});

describe("Reihen-Ziel ändern: kommende übernehmen, laufende/beendete bleiben", () => {
  const oldGoal = { fields: ["Tore"], target: 100, scope: "community" as const };
  const newGoal = { fields: ["Tore"], target: 500, scope: "community" as const };
  const tpl = (g: unknown) => ({ tournamentTemplateJson: JSON.stringify(g ? { communityGoal: g } : {}) });

  test("gestarteter Termin, der geerbt hat, behält das alte Ziel", () => {
    const frozen = freezeGoalForStartedEvent(JSON.stringify({ stats: [{ field: "Tore", pointsPer: 1 }] }), oldGoal);
    const r = resolveEventGoal({ format: "coop_stats", statConfigJson: frozen, series: tpl(newGoal) });
    assert.equal(r.goal?.target, 100);
    assert.equal(r.source, "event");
    assert.deepEqual(JSON.parse(frozen!).stats, [{ field: "Tore", pointsPer: 1 }]);
  });

  test("hatte die Reihe vorher kein Ziel, bekommt ein gestarteter Termin auch kein neues", () => {
    const frozen = freezeGoalForStartedEvent(null, null);
    const r = resolveEventGoal({ format: "coop_stats", statConfigJson: frozen, series: tpl(newGoal) });
    assert.equal(r.goal, null);
    assert.equal(r.source, "off");
  });

  test("eigene Einstellungen bleiben unangetastet", () => {
    assert.equal(freezeGoalForStartedEvent(JSON.stringify({ goal: { fields: ["Tore"], target: 7 } }), oldGoal), undefined);
    assert.equal(freezeGoalForStartedEvent(JSON.stringify({ goalOff: true }), oldGoal), undefined);
  });

  test("kommender Termin ohne eigenes Ziel folgt dem neuen Reihen-Ziel", () => {
    assert.equal(resolveEventGoal({ format: "coop_stats", statConfigJson: null, series: tpl(newGoal) }).goal?.target, 500);
  });

  test("Rückfrage nur für kommende Termine mit eigenem Ziel oder 'kein Ziel'", () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    const events = [
      { id: "laeuft", startAt: "2026-11-24T00:00:00Z", status: "active", statConfigJson: JSON.stringify({ goal: oldGoal }) },
      { id: "erbt", startAt: "2026-12-01T00:00:00Z", status: "open", statConfigJson: null },
      { id: "eigen", startAt: "2026-12-08T00:00:00Z", status: "open", statConfigJson: JSON.stringify({ goal: oldGoal }) },
      { id: "aus", startAt: "2026-12-15T00:00:00Z", status: "open", statConfigJson: JSON.stringify({ goalOff: true }) },
    ];
    assert.deepEqual(upcomingGoalOverrides(events, now).map(e => e.id), ["eigen", "aus"]);
  });
});
