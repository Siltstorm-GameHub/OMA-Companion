import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  battleXp,
  FLAWLESS_XP,
  formatXp,
  MAX_BATTLE_XP,
  MIN_BATTLE_XP,
  WIN_XP,
  MAX_RANK,
  nextRankProgress,
  rankBonusPercent,
  rankForXp,
  rankFrameColor,
  rankMultiplier,
  cardXp,
  rankTitle,
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

  test("Gesamt-XP: alter Stand (Sieg 100, halber Sieg 50) plus Gem-XP", () => {
    assert.equal(cardXp(4, 1), 450);
    assert.equal(cardXp(4, 1, 60), 510);
    assert.equal(rankForXp(cardXp(4, 1)), 0);
    assert.equal(rankForXp(cardXp(4, 2)), 1);
    assert.equal(nextRankProgress(cardXp(2, 1))?.xpNeeded, 250);
    assert.equal(formatXp(250), "250");
  });

  test("Kampf-XP richten sich nach den zerstörten Gems der Klasse", () => {
    // Sieg: 1 XP je 4 Gems + 25 Siegbonus
    assert.equal(battleXp({ gems: 300, won: true, flawless: false }), 75 + WIN_XP);
    assert.equal(battleXp({ gems: 300, won: true, flawless: true }), 75 + WIN_XP + FLAWLESS_XP);
    assert.ok(battleXp({ gems: 400, won: true, flawless: false }) > battleXp({ gems: 300, won: true, flawless: false }));
    // Niederlage: halbe Gem-XP, kein Siegbonus, kein flawless
    assert.equal(battleXp({ gems: 400, won: false, flawless: false }), 50);
    assert.equal(battleXp({ gems: 400, won: false, flawless: true }), 50);
    // Zwei echte Kampfwerte aus dem Spiel (Niederlage) unterscheiden sich sichtbar
    assert.notEqual(battleXp({ gems: 413, won: false, flawless: false }), battleXp({ gems: 476, won: false, flawless: false }));
    // Minimum bei 0 Gems, Deckel der Gem-XP bei sehr vielen
    assert.equal(battleXp({ gems: 0, won: false, flawless: false }), MIN_BATTLE_XP);
    assert.equal(battleXp({ gems: 100_000, won: false, flawless: false }), MAX_BATTLE_XP);
    // Ein schneller Sieg bringt nicht weniger als eine lange Niederlage
    assert.ok(battleXp({ gems: 150, won: true, flawless: false }) >= battleXp({ gems: 430, won: false, flawless: false }));
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
