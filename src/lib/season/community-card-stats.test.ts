import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { COMMUNITY_CLASS_BASE_STATS, rollCommunityCardClass, rollCommunityCardStats } from "./community-card-stats";

describe("Community-Karten: Klasse und Werte", () => {
  test("Klasse ist immer eine der drei Kampfrollen", () => {
    assert.equal(rollCommunityCardClass(() => 0), "TANK");
    assert.equal(rollCommunityCardClass(() => 0.5), "DAMAGE_DEALER");
    assert.equal(rollCommunityCardClass(() => 0.999), "SUPPORT");
  });

  test("Werte bleiben innerhalb von ±10 % um die Klassen-Basis, Speed fix", () => {
    for (const cls of ["TANK", "DAMAGE_DEALER", "SUPPORT"] as const) {
      const base = COMMUNITY_CLASS_BASE_STATS[cls];
      const low = rollCommunityCardStats(cls, () => 0);
      const high = rollCommunityCardStats(cls, () => 0.999999);
      assert.equal(low.baseHp, Math.round(base.hp * 0.9));
      assert.ok(high.baseHp <= Math.round(base.hp * 1.1) && high.baseHp > base.hp);
      assert.ok(low.baseAttack >= Math.round(base.attack * 0.9) && high.baseAttack <= Math.round(base.attack * 1.1));
      assert.equal(low.speed, base.speed);
    }
  });
});
