import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bestAvgIds, compareAvg, computeAvgTotals, entryAvg, resolveAvgDirection, roundWinnerIds } from "./avg-stats";

const entry = (userId: string, stats: Record<string, unknown> | null) => ({ userId, statsJson: stats ? JSON.stringify(stats) : null });
const played = new Date("2026-01-01");

describe("resolveAvgDirection", () => {
  test("Abschluss vor Event-Einstellung, sonst high", () => {
    assert.equal(resolveAvgDirection(JSON.stringify({ avgWinnerDirection: "low" }), JSON.stringify({ avgDirection: "high" })), "low");
    assert.equal(resolveAvgDirection(JSON.stringify({ avgWinnerDirection: null }), JSON.stringify({ avgDirection: "low" })), "low");
    assert.equal(resolveAvgDirection(null, "{kaputt"), "high");
  });
});

describe("entryAvg", () => {
  test("ignoriert nicht eingetragene Felder statt sie als 0 zu zählen", () => {
    assert.equal(entryAvg(JSON.stringify({ A: 4, B: "" }), ["A", "B"]), 4);
    assert.equal(entryAvg(JSON.stringify({ A: 0, B: 2 }), ["A", "B"]), 1);
    assert.equal(entryAvg(JSON.stringify({ _team: "A" }), ["A"]), null);
    assert.equal(entryAvg(null, ["A"]), null);
  });
});

describe("computeAvgTotals", () => {
  test("nur gespielte Runden, Ø je Feld über die eingetragenen Runden", () => {
    const totals = computeAvgTotals([
      { playedAt: played, entries: [entry("a", { A: 2, B: 10 }), entry("b", { A: 4 })] },
      { playedAt: played, entries: [entry("a", { A: 4 }), entry("b", null)] },
      { playedAt: null, entries: [entry("a", { A: 100 })] },
    ], ["A", "B"]);
    assert.deepEqual(totals.get("a"), { rounds: 2, fieldAvgs: { A: 3, B: 10 }, combined: 6.5 });
    assert.deepEqual(totals.get("b"), { rounds: 1, fieldAvgs: { A: 4, B: null }, combined: 4 });
  });
});

describe("Vergleich und Sieger", () => {
  test("Richtung, Gleichstand, fehlende Werte hinten", () => {
    assert.ok(compareAvg(1, 2, "low") < 0);
    assert.ok(compareAvg(1, 2, "high") > 0);
    assert.ok(compareAvg(null, 0, "low") > 0);
    assert.equal(compareAvg(0.1 + 0.2, 0.3, "high"), 0);
    assert.deepEqual(bestAvgIds([["a", 2], ["b", 1], ["c", 1], ["d", null]], "low"), ["b", "c"]);
  });

  test("Rundensieger bei niedrigster-gewinnt, leerer Eintrag gewinnt nicht", () => {
    const entries = [entry("a", { A: 5 }), entry("b", { A: 3 }), entry("c", null), entry("d", { A: 3 })];
    assert.deepEqual(roundWinnerIds(entries, ["A"], "low"), ["b", "d"]);
    assert.deepEqual(roundWinnerIds(entries, ["A"], "high"), ["a"]);
  });
});
