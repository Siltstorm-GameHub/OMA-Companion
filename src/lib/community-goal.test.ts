import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeCommunityGoalProgress, parseCommunityGoal, sanitizeCommunityGoal, type CommunityGoal } from "./community-goal";

const entry = (userId: string, stats: Record<string, unknown>) => ({ userId, statsJson: JSON.stringify(stats) });

describe("sanitizeCommunityGoal", () => {
  test("verwirft unvollständige Ziele", () => {
    assert.equal(sanitizeCommunityGoal(null), null);
    assert.equal(sanitizeCommunityGoal({ fields: ["Tore"], target: 0 }), null);
    assert.equal(sanitizeCommunityGoal({ fields: [], target: 10 }), null);
    assert.equal(sanitizeCommunityGoal({ fields: ["Kills"], target: 10 }, ["Tore"]), null);
  });
  test("normalisiert Felder, Scope und Texte", () => {
    assert.deepEqual(
      sanitizeCommunityGoal({ fields: [" Tore ", "Tore", 3], target: "100", scope: "quatsch", title: " Ziel ", unit: "" }),
      { fields: ["Tore"], target: 100, scope: "community", title: "Ziel" },
    );
  });
  test("parseCommunityGoal liest goal aus statConfigJson", () => {
    assert.deepEqual(parseCommunityGoal(JSON.stringify({ stats: [], goal: { fields: ["Schritte"], target: 5000, scope: "solo" } })),
      { fields: ["Schritte"], target: 5000, scope: "solo" });
    assert.equal(parseCommunityGoal(JSON.stringify({ stats: [] })), null);
    assert.equal(parseCommunityGoal("{kaputt"), null);
  });
});

describe("computeCommunityGoalProgress", () => {
  const matches = [
    { entries: [entry("a", { Tore: 3, Assists: 1, _team: "A" }), entry("b", { Tore: 2, _team: "B" })] },
    { entries: [entry("a", { Tore: 4, _team: "A" }), entry("c", { Tore: "", Assists: 2 })] },
  ];

  test("community: Summe aller Teilnehmer", () => {
    const goal: CommunityGoal = { fields: ["Tore"], target: 9, scope: "community" };
    const p = computeCommunityGoalProgress(matches, goal);
    assert.equal(p.total, 9);
    assert.deepEqual(p.byUser, { a: 7, b: 2 });
    assert.equal(p.reached, true);
    assert.equal(p.main.percent, 100);
  });

  test("mehrere Felder werden addiert", () => {
    const p = computeCommunityGoalProgress(matches, { fields: ["Tore", "Assists"], target: 100, scope: "community" });
    assert.equal(p.total, 12);
    assert.equal(p.reached, false);
    assert.equal(p.main.percent, 12);
  });

  test("team: getrennte Summen, bestes Team zählt", () => {
    const p = computeCommunityGoalProgress(matches, { fields: ["Tore"], target: 7, scope: "team" });
    assert.deepEqual(p.byTeam, { A: 7, B: 2 });
    assert.deepEqual(p.reachedTeams, ["A"]);
    assert.equal(p.main.total, 7);
    assert.equal(p.reached, true);
  });

  test("solo: jeder für sich", () => {
    const p = computeCommunityGoalProgress(matches, { fields: ["Tore"], target: 5, scope: "solo" });
    assert.deepEqual(p.reachedUserIds, ["a"]);
    assert.equal(p.main.total, 7);
    assert.equal(p.main.percent, 100);
  });
});
