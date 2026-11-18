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

describe("Durchschnitts-Ziele (mode avg)", () => {
  const avgMatches = [
    { entries: [entry("a", { Kills: 4, _team: "A" }), entry("b", { Kills: 1, _team: "B" }), entry("c", { Kills: "" })] },
    { entries: [entry("a", { Kills: 2, _team: "A" }), entry("b", { Kills: 3, _team: "B" })] },
  ];

  test("sanitize: mode/direction/minParticipants nur bei avg, sum bleibt kompatibel", () => {
    assert.deepEqual(sanitizeCommunityGoal({ fields: ["Kills"], target: 2.5, mode: "avg", direction: "atMost", minParticipants: "3" }),
      { fields: ["Kills"], target: 2.5, scope: "community", mode: "avg", direction: "atMost", minParticipants: 3 });
    assert.deepEqual(sanitizeCommunityGoal({ fields: ["Kills"], target: 5, mode: "sum", direction: "atMost", minParticipants: 4 }),
      { fields: ["Kills"], target: 5, scope: "community" });
    assert.deepEqual(sanitizeCommunityGoal({ fields: ["Kills"], target: 2, mode: "avg", minParticipants: 0 }),
      { fields: ["Kills"], target: 2, scope: "community", mode: "avg" });
  });

  test("community: Ø je Spieler, dann Ø über alle — leere Werte zählen nicht", () => {
    const p = computeCommunityGoalProgress(avgMatches, { fields: ["Kills"], target: 2.5, scope: "community", mode: "avg" });
    assert.deepEqual(p.byUser, { a: 3, b: 2 });
    assert.deepEqual(p.contributorIds.sort(), ["a", "b"]);
    assert.equal(p.total, 2.5);
    assert.equal(p.reached, true);
    assert.equal(p.main.percent, 100);
  });

  test("jeder Teilnehmer zählt gleich viel, egal wie viele Einträge", () => {
    const many = [{ entries: [entry("a", { Kills: 10 })] }, { entries: [entry("a", { Kills: 10 }), entry("b", { Kills: 0 })] }];
    const p = computeCommunityGoalProgress(many, { fields: ["Kills"], target: 6, scope: "community", mode: "avg" });
    assert.equal(p.total, 5);
    assert.equal(p.reached, false);
    assert.ok(Math.abs(p.main.percent - 83.33) < 0.01);
  });

  test("Mindestanzahl Teilnehmer", () => {
    const p = computeCommunityGoalProgress(avgMatches, { fields: ["Kills"], target: 2, scope: "community", mode: "avg", minParticipants: 3 });
    assert.equal(p.reached, false);
    assert.equal(p.missingParticipants, 1);
  });

  test("höchstens: kleiner ist besser", () => {
    const goal: CommunityGoal = { fields: ["Kills"], target: 2.5, scope: "community", mode: "avg", direction: "atMost" };
    const p = computeCommunityGoalProgress(avgMatches, goal);
    assert.equal(p.reached, true);
    const worse = computeCommunityGoalProgress(avgMatches, { ...goal, target: 2 });
    assert.equal(worse.reached, false);
    assert.equal(worse.main.percent, 80);
    const empty = computeCommunityGoalProgress([], goal);
    assert.equal(empty.reached, false);
    assert.equal(empty.main.percent, 0);
  });

  test("team und solo", () => {
    const team = computeCommunityGoalProgress(avgMatches, { fields: ["Kills"], target: 2.5, scope: "team", mode: "avg" });
    assert.deepEqual(team.byTeam, { A: 3, B: 2 });
    assert.deepEqual(team.reachedTeams, ["A"]);
    assert.equal(team.main.total, 3);
    const solo = computeCommunityGoalProgress(avgMatches, { fields: ["Kills"], target: 2, scope: "solo", mode: "avg", direction: "atMost" });
    assert.deepEqual(solo.reachedUserIds, ["b"]);
    assert.equal(solo.main.total, 2);
  });
});

describe("Ø-Ziel: genau auf der Marke", () => {
  test("Ø genau gleich dem Ziel gilt als erreicht", () => {
    const m = [{ entries: [entry("a", { Kills: 2 }), entry("b", { Kills: 4 })] }];
    const p = computeCommunityGoalProgress(m, { fields: ["Kills"], target: 3, scope: "community", mode: "avg" });
    assert.equal(p.reached, true);
  });
  test("angezeigter (gerundeter) Ø zählt: 2,996 → 3 erreicht das Ziel 3", () => {
    // 1000 Einträge: 996 × 3 und 4 × 2 → Ø 2,996
    const entries = Array.from({ length: 1000 }, (_, i) => ({ userId: "a", statsJson: JSON.stringify({ Kills: i < 4 ? 2 : 3 }) }));
    const p = computeCommunityGoalProgress(entries.map(e => ({ entries: [e] })), { fields: ["Kills"], target: 3, scope: "community", mode: "avg" });
    assert.equal(p.reached, true);
    assert.equal(p.main.percent, 100);
  });
  test("knapp darunter bleibt verfehlt", () => {
    const m = [{ entries: [entry("a", { Kills: 2 }), entry("b", { Kills: 3 })] }];
    const p = computeCommunityGoalProgress(m, { fields: ["Kills"], target: 2.51, scope: "community", mode: "avg" });
    assert.equal(p.reached, false);
  });
});
