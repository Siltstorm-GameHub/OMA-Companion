import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPoints,
  MAX_RANK,
  nextRankProgress,
  rankBonusPercent,
  rankForWins,
  rankFrameColor,
  rankMultiplier,
  rankPoints,
  rankTitle,
  withRankBonus,
} from "./card-ranks";

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

  test("Halbe Punkte aus Niederlagen und makellosen Siegen zählen mit", () => {
    assert.equal(rankPoints(4, 1), 4.5);
    assert.equal(rankForWins(rankPoints(4, 1)), 0);
    assert.equal(rankForWins(rankPoints(4, 2)), 1);
    assert.equal(nextRankProgress(rankPoints(2, 1))?.winsNeeded, 2.5);
    assert.equal(formatPoints(2.5), "2,5");
    assert.equal(formatPoints(3), "3");
  });

  test("Meilenstein-Titel und Rahmen ab Rang 3 und 5", () => {
    assert.equal(rankTitle(2), null);
    assert.equal(rankTitle(3), "Veteran");
    assert.equal(rankTitle(4), "Veteran");
    assert.equal(rankTitle(5), "Meister");
    assert.equal(rankFrameColor(2), null);
    assert.equal(rankFrameColor(5), "#fbbf24");
    assert.equal(rankBonusPercent(3), 15);
  });
});
