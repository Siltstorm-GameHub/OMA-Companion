import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  FLAWLESS_XP,
  formatXp,
  LOSS_XP,
  MAX_RANK,
  nextRankProgress,
  rankBonusPercent,
  rankForXp,
  rankFrameColor,
  rankMultiplier,
  cardXp,
  rankTitle,
  WIN_XP,
  withRankBonus,
} from "./card-ranks";

describe("Karten-Ränge", () => {
  test("Ränge nach XP in der Startaufstellung", () => {
    assert.equal(rankForXp(0), 0);
    assert.equal(rankForXp(499), 0);
    assert.equal(rankForXp(500), 1);
    assert.equal(rankForXp(3499), 2);
    assert.equal(rankForXp(3500), 3);
    assert.equal(rankForXp(1_000_000), MAX_RANK);
  });

  test("Fortschritt zum nächsten Rang, auf dem höchsten Rang keiner mehr", () => {
    assert.deepEqual(nextRankProgress(0), { nextRank: 1, xpNeeded: 500, share: 0 });
    assert.deepEqual(nextRankProgress(1000), { nextRank: 2, xpNeeded: 500, share: 0.5 });
    assert.equal(nextRankProgress(12000), null);
  });

  test("Bonus: +5 % je Rang auf Leben und Angriff, Verteidigung unverändert", () => {
    assert.equal(rankMultiplier(0), 1);
    assert.equal(rankMultiplier(MAX_RANK), 1.25);
    const unit = withRankBonus({ baseHp: 1000, baseAttack: 100, baseDefense: 50 }, 2);
    assert.deepEqual(unit, { baseHp: 1100, baseAttack: 110, baseDefense: 50 });
  });

  test("XP: Sieg 100, halbe Siege aus Niederlagen/makellosen Siegen je 50", () => {
    assert.equal(cardXp(4, 1), 450);
    assert.equal(rankForXp(cardXp(4, 1)), 0);
    assert.equal(rankForXp(cardXp(4, 2)), 1);
    assert.equal(nextRankProgress(cardXp(2, 1))?.xpNeeded, 250);
    assert.equal(formatXp(250), "250");
    assert.equal(WIN_XP + FLAWLESS_XP, 150);
    assert.equal(LOSS_XP, 50);
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
