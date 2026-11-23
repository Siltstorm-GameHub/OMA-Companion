import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkWinnerStat, rewardTotals, topByStat, rewardLines } from "./event-complete-checks";

const stats = {
  chris: { Kills: 42, Punkte: 18 },
  dunja: { Kills: 38, Punkte: 21 },
  elias: { Kills: 31, Punkte: 9 },
  fiona: { Kills: 0, Punkte: 0 },
  gus:   { Punkte: 4 },
};
const users = Object.keys(stats);

describe("Abschluss: Gewinner-Stat prüfen", () => {
  test("Bester je Stat, Gleichstand, ohne Werte leer", () => {
    assert.deepEqual(topByStat(users, stats, "Kills"), { ids: ["chris"], value: 42 });
    assert.deepEqual(topByStat(["a", "b"], { a: { X: 5 }, b: { X: 5 } }, "X").ids, ["a", "b"]);
    assert.deepEqual(topByStat(users, stats, "Assists").ids, []);
    assert.deepEqual(topByStat(users, stats, "Kills", new Set(["chris"])).ids, ["dunja"]);
  });

  test("Vergleich mit dem Reihen-Stat und fehlende Werte", () => {
    const c = checkWinnerStat(users, stats, "Kills", "Punkte");
    assert.equal(c.compareField, "Punkte");
    assert.equal(c.compareWinnerDiffers, true);
    assert.deepEqual(c.compareWinners, ["dunja"]);
    assert.equal(c.missing, 2); // fiona (0) und gus (fehlt)
    assert.deepEqual(c.runnerUp, { id: "dunja", value: 38 });
  });

  test("Gleicher Stat oder gleicher Sieger → kein Hinweis", () => {
    assert.equal(checkWinnerStat(users, stats, "Kills", "Kills").compareField, null);
    const same = checkWinnerStat(["a", "b"], { a: { X: 3, Y: 9 }, b: { X: 1, Y: 2 } }, "X", "Y");
    assert.equal(same.compareWinnerDiffers, false);
  });

  test("Disqualifizierte zählen nicht", () => {
    const c = checkWinnerStat(users, stats, "Kills", "Punkte", new Set(["dunja", "fiona"]));
    assert.equal(c.compareWinnerDiffers, false); // ohne dunja gewinnt chris auch nach Punkten
    assert.equal(c.missing, 1);
  });
});

describe("Abschluss: Summe der Belohnungen", () => {
  test("Teilnahme + Platz, Disqualifizierte ohne, Zuschauer dazu", () => {
    const order = ["a", "b", "c", "d"];
    const place: Record<string, number> = { a: 1, b: 2, c: 2, d: 4 };
    const t = rewardTotals({
      order, placementOf: (u) => place[u],
      rewardForPlace: (p) => (p === 1 ? { coins: 500, rankPoints: 3 } : p === 2 ? { coins: 250, rankPoints: 2, tablePoints: 5 } : undefined),
      excluded: new Set(["d"]), participationCoins: 50, spectatorsAttended: 4, spectatorCoins: 10,
    });
    assert.deepEqual(t, { players: 3, coins: 150 + 500 + 250 + 250 + 40, rankPoints: 3 + 2 + 2, tablePoints: 10 });
  });
});

describe("rewardLines", () => {
  test("je Person: Teilnahme + Platz, Ausgeschlossene mit 0", () => {
    const lines = rewardLines({
      order: ["a", "b", "c"],
      placementOf: uid => ["a", "b", "c"].indexOf(uid) + 1,
      rewardForPlace: place => (place === 1 ? { coins: 100, rankPoints: 3, tablePoints: 5 } : undefined),
      excluded: new Set(["c"]),
      participationCoins: 10,
    });
    assert.deepEqual(lines, [
      { uid: "a", place: 1, coins: 110, rankPoints: 3, tablePoints: 5, excluded: false },
      { uid: "b", place: 2, coins: 10, rankPoints: 0, tablePoints: 0, excluded: false },
      { uid: "c", place: 3, coins: 0, rankPoints: 0, tablePoints: 0, excluded: true },
    ]);
  });
});
