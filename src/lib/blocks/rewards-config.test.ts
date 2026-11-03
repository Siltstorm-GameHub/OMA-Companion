import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBlocksRewards, rewardLabel, DEFAULT_BLOCKS_REWARDS } from "./rewards-config";

test("Belohnungen: ungültige Werte werden bereinigt", () => {
  const r = normalizeBlocksRewards([{ coins: -5, rankPoints: "20" }, { coins: 12.6, rankPoints: null }, null, { coins: 9 }]);
  assert.deepEqual(r, [{ coins: 0, rankPoints: 20 }, { coins: 13, rankPoints: 0 }, DEFAULT_BLOCKS_REWARDS[2]]);
  assert.equal(normalizeBlocksRewards("kaputt").length, 3);
});

test("Belohnungs-Text", () => {
  assert.equal(rewardLabel({ coins: 1500, rankPoints: 0 }), "1.500 Münzen");
  assert.equal(rewardLabel({ coins: 0, rankPoints: 50 }), "50 Rang-Punkte");
  assert.equal(rewardLabel({ coins: 0, rankPoints: 0 }), "");
});
