import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BLOCKS_GOALS, goalProgress, normalizeBlocksGoals } from "./goals-config";

test("Monatsziele: bereinigt, sortiert, ohne Doppelte und ohne leere Belohnung", () => {
  const g = normalizeBlocksGoals([
    { score: 50000, coins: 100 },
    { score: "10000", coins: 20, rankPoints: -3 },
    { score: 50000, coins: 999 },
    { score: 0, coins: 50 },
    { score: 70000, coins: 0, rankPoints: 0 },
    null,
  ]);
  assert.deepEqual(g, [
    { score: 10000, coins: 20, rankPoints: 0 },
    { score: 50000, coins: 100, rankPoints: 0 },
  ]);
  assert.deepEqual(normalizeBlocksGoals("kaputt"), DEFAULT_BLOCKS_GOALS);
  assert.deepEqual(normalizeBlocksGoals([]), []);
  assert.equal(normalizeBlocksGoals(Array.from({ length: 9 }, (_, i) => ({ score: (i + 1) * 1000, coins: 1 }))).length, 5);
});

test("Monatsziele: höchstes erreichtes und nächstes Ziel", () => {
  const goals = normalizeBlocksGoals(DEFAULT_BLOCKS_GOALS);
  assert.deepEqual(goalProgress(0, goals), { reached: null, next: goals[0] });
  assert.deepEqual(goalProgress(25_000, goals), { reached: goals[0], next: goals[1] });
  assert.deepEqual(goalProgress(999_999, goals), { reached: goals[2], next: null });
  assert.deepEqual(goalProgress(500, []), { reached: null, next: null });
});
