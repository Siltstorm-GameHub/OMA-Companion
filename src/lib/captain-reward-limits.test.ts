import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { capCaptainRewardFields } from "./captain-reward-limits";

describe("Belohnungs-Obergrenzen für Squad-Captains", () => {
  test("Platzierungen und Teilnahme werden gekappt, Zusatzfelder bleiben", () => {
    const out = capCaptainRewardFields({
      placementRewardsJson: {
        participationCoins: 9999, participationRankPts: 5,
        placements: [
          { place: 1, coins: 1_000_000, rankPoints: 50, packKind: "STANDARD" },
          { place: 2, coins: 100, rankPoints: 1 },
          { place: 4, coins: 500, rankPoints: 2 },
        ],
      },
    });
    assert.deepEqual(out.placementRewardsJson, {
      participationCoins: 10, participationRankPts: 0,
      placements: [
        { place: 1, coins: 500, rankPoints: 3, packKind: "STANDARD" },
        { place: 2, coins: 100, rankPoints: 1 },
        { place: 4, coins: 50, rankPoints: 0 },
      ],
    });
  });

  test("JSON-Strings bleiben Strings, negative Werte werden 0", () => {
    const out = capCaptainRewardFields({
      spectatorRewardJson: JSON.stringify({ coins: 80, rankPoints: 4 }),
      pollsConfigJson: [{ label: "MVP", participationCoins: -5, winnerCoins: 900, winnerRankPoints: 3 }],
      seriesStatConfig: JSON.stringify({ participationCoins: 50, transferToGlobalRanking: true, dominionBonus: { enabled: true, coins: 300, seriesPoints: 5 } }),
      pointReward: 1000,
    });
    assert.deepEqual(JSON.parse(out.spectatorRewardJson as string), { coins: 5, rankPoints: 0 });
    assert.deepEqual(out.pollsConfigJson, [{ label: "MVP", participationCoins: 0, winnerCoins: 50, winnerRankPoints: 0 }]);
    assert.deepEqual(JSON.parse(out.seriesStatConfig as string), {
      participationCoins: 10, transferToGlobalRanking: false, dominionBonus: { enabled: true, coins: 0, seriesPoints: 5 },
    });
    assert.equal(out.pointReward, 50);
  });

  test("fehlende Felder werden nicht ergänzt", () => {
    assert.deepEqual(capCaptainRewardFields({ title: "x" }), { title: "x" });
  });
});
