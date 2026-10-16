import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeCardRefund, DEFAULT_LEGACY_UPGRADE_COSTS, DUPLICATE_COIN_VALUE } from "./card-coins";

describe("Umstellung Karten-Level → Münzen", () => {
  test("Stufe 1 ohne Duplikate: nichts zu erstatten", () => {
    assert.deepEqual(computeCardRefund("STANDARD", 1, 1, DEFAULT_LEGACY_UPGRADE_COSTS), { upgradeCoins: 0, duplicateCoins: 0, total: 0 });
  });

  test("bezahlte Upgrades werden summiert, Duplikate einzeln vergütet", () => {
    const r = computeCardRefund("STANDARD", 3, 7, DEFAULT_LEGACY_UPGRADE_COSTS);
    assert.equal(r.upgradeCoins, 120 + 280);
    assert.equal(r.duplicateCoins, 6 * DUPLICATE_COIN_VALUE.STANDARD);
    assert.equal(r.total, r.upgradeCoins + r.duplicateCoins);
  });

  test("Höchststufe Community nutzt alle vier Sprünge", () => {
    const r = computeCardRefund("COMMUNITY", 5, 1, DEFAULT_LEGACY_UPGRADE_COSTS);
    assert.equal(r.upgradeCoins, 180 + 400 + 750 + 1300);
    assert.equal(r.duplicateCoins, 0);
  });

  test("Admin-Override der Kostentabelle wird verwendet", () => {
    const costs = { STANDARD: [1, 2, 3, 4] as [number, number, number, number], COMMUNITY: [10, 20, 30, 40] as [number, number, number, number] };
    assert.equal(computeCardRefund("COMMUNITY", 4, 1, costs).upgradeCoins, 60);
  });
});
