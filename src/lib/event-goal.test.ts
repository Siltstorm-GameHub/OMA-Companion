import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveEventGoal, withGoalMode } from "./event-goal";

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

  test("withGoalMode setzt nur die Abweichung, Rest bleibt", () => {
    const base = JSON.stringify({ stats: [{ field: "Schritte", pointsPer: 1 }], goal: ownGoal });
    assert.deepEqual(JSON.parse(withGoalMode(base, "inherit", null)!), { stats: [{ field: "Schritte", pointsPer: 1 }] });
    assert.deepEqual(JSON.parse(withGoalMode(base, "off", null)!).goalOff, true);
    assert.equal(withGoalMode(JSON.stringify({ goal: ownGoal }), "inherit", null), null);
    assert.equal(JSON.parse(withGoalMode(null, "override", ownGoal)!).goal.target, 500_000);
  });
});
