import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { eventPayout } from "./placement-rewards";

const finalRewards = JSON.stringify({ placements: [{ place: 1, coins: 1000, rankPoints: 3 }, { place: 2, coins: 500, rankPoints: 0 }] });

describe("Auszahlung je Event", () => {
  test("Reihen-Termin: Bonus je Event aus der Reihentabelle, Endwertung getrennt", () => {
    const p = eventPayout({
      seriesId: "s1",
      // Der Assistent schreibt die Reihen-Platzierungen auch ins Event — die zählen hier NICHT
      placementRewardsJson: finalRewards,
      series: {
        seriesStatConfig: JSON.stringify({ participationCoins: 10, eventPlacementCoins: [{ place: 2, coins: 50 }, { place: 1, coins: 100 }, { place: 3, coins: 0 }] }),
        placementRewardsJson: finalRewards,
      },
    });
    assert.equal(p.participationCoins, 10);
    assert.deepEqual(p.placements, [{ place: 1, coins: 100, rankPoints: 0 }, { place: 2, coins: 50, rankPoints: 0 }]);
    assert.deepEqual(p.seriesFinal?.map(r => r.coins), [1000, 500]);
  });

  test("Reihen-Termin ohne Bonus und mit kaputter Konfiguration", () => {
    const p = eventPayout({ seriesId: "s1", placementRewardsJson: finalRewards, series: { seriesStatConfig: "{kaputt" } });
    assert.equal(p.participationCoins, 0);
    assert.deepEqual(p.placements, []);
  });

  test("Einzel-Event: alles aus dem Event selbst", () => {
    const p = eventPayout({
      seriesId: null,
      placementRewardsJson: JSON.stringify({ participationCoins: 25, placements: [{ place: 1, coins: 300, rankPoints: 2 }] }),
    });
    assert.equal(p.participationCoins, 25);
    assert.deepEqual(p.placements, [{ place: 1, coins: 300, rankPoints: 2 }]);
    assert.equal(p.seriesFinal, null);
    assert.equal(eventPayout({ seriesId: null, placementRewardsJson: null, pointReward: 50 }).participationCoins, 50);
  });
});
