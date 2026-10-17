import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MAX_RANK, nextRankProgress, rankForWins, rankMultiplier, withRankBonus } from "./card-ranks";

describe("Karten-Ränge", () => {
  test("Ränge nach Siegen in der Startaufstellung", () => {
    assert.equal(rankForWins(0), 0);
    assert.equal(rankForWins(4), 0);
    assert.equal(rankForWins(5), 1);
    assert.equal(rankForWins(34), 2);
    assert.equal(rankForWins(35), 3);
    assert.equal(rankForWins(10_000), MAX_RANK);
  });

  test("Fortschritt zum nächsten Rang, auf dem höchsten Rang keiner mehr", () => {
    assert.deepEqual(nextRankProgress(0), { nextRank: 1, winsNeeded: 5, share: 0 });
    assert.deepEqual(nextRankProgress(10), { nextRank: 2, winsNeeded: 5, share: 0.5 });
    assert.equal(nextRankProgress(120), null);
  });

  test("Bonus: +5 % je Rang auf Leben und Angriff, Verteidigung unverändert", () => {
    assert.equal(rankMultiplier(0), 1);
    assert.equal(rankMultiplier(MAX_RANK), 1.25);
    const unit = withRankBonus({ baseHp: 1000, baseAttack: 100, baseDefense: 50 }, 2);
    assert.deepEqual(unit, { baseHp: 1100, baseAttack: 110, baseDefense: 50 });
  });
});
