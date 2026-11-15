import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { monthlyRanking, myStanding, overallRanking, rankDelta, windowAround } from "./leaderboard";

const users = [
  { id: "a", points: 100 },
  { id: "b", points: 90 },
  { id: "c", points: 90 },
  { id: "d", points: 80 },
  { id: "e", points: 10 },
];

describe("Rangliste", () => {
  test("Gleichstand teilt den Platz", () => {
    const r = overallRanking(users, new Map());
    assert.deepEqual(r.map(e => [e.id, e.rank]), [["a", 1], ["b", 2], ["c", 2], ["d", 4], ["e", 5]]);
  });

  test("Trend aus Monatsgewinn: d hat diesen Monat 30 geholt und ist aufgestiegen", () => {
    // Monatsbeginn: a 100, b 90, c 90, d 50, e 10 → d war 4., jetzt 4. (80) … mit 30 Gewinn
    const r = overallRanking(users, new Map([["d", 30], ["b", 15]]));
    // vorher: a 100, c 90, b 75, d 50, e 10 → b war 3., jetzt 2.
    const b = r.find(e => e.id === "b")!;
    assert.equal(b.prevRank, 3);
    assert.equal(rankDelta(b), 1);
    const a = r.find(e => e.id === "a")!;
    assert.equal(rankDelta(a), 0);
  });

  test("Neu dazugekommen → kein Trend", () => {
    const r = overallRanking([{ id: "n", points: 20 }, { id: "x", points: 5 }], new Map([["n", 20]]));
    assert.equal(r[0].prevRank, null);
    assert.equal(rankDelta(r[0]), null);
  });

  test("Monatswertung nur mit Gewinn > 0", () => {
    const r = monthlyRanking(new Map([["a", 5], ["b", 0], ["c", 12], ["d", -3]]));
    assert.deepEqual(r.map(e => [e.id, e.points, e.rank]), [["c", 12, 1], ["a", 5, 2]]);
  });

  test("Dein Stand: Abstand nach oben über Gleichstand hinweg", () => {
    const r = overallRanking(users, new Map());
    const me = myStanding(r, "c")!;
    assert.equal(me.entry.rank, 2);
    assert.deepEqual(me.above, { id: "a", gap: 10 });
    assert.deepEqual(me.below, { id: "d", lead: 10 });
    assert.equal(myStanding(r, "a")!.above, null);
    assert.equal(myStanding(r, "e")!.below, null);
    assert.equal(myStanding(r, "zz"), null);
    assert.equal(myStanding(r, null), null);
  });

  test("Ausschnitt um einen Platz", () => {
    const r = overallRanking(users, new Map());
    assert.deepEqual(windowAround(r, 3).map(e => e.id), ["c", "d", "e"]);
    assert.deepEqual(windowAround(r, 0).map(e => e.id), ["a", "b"]);
  });
});
