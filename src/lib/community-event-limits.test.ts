import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_COMMUNITY_LIMITS,
  capSeasonPlacements,
  normalizeCommunityLimits,
  seasonFactor,
  seriesConfigLimits,
} from "./community-event-limits";
import { capCaptainRewardFields } from "./captain-reward-limits";

describe("Community-Event-Limits", () => {
  test("leere/kaputte Eingabe ergibt die Standardwerte", () => {
    assert.deepEqual(normalizeCommunityLimits(null), DEFAULT_COMMUNITY_LIMITS);
    assert.deepEqual(normalizeCommunityLimits({ standalone: "x", season: 5 }), DEFAULT_COMMUNITY_LIMITS);
  });

  test("negative Werte werden 0, maxFactor nie unter minFactor, Referenz mindestens 1", () => {
    const cfg = normalizeCommunityLimits({
      standalone: { participationCoins: -5, placementCoins: [1000, "200"] },
      season: { minFactor: 2, maxFactor: 1, referenceEventCount: 0 },
    });
    assert.equal(cfg.standalone.participationCoins, 0);
    assert.deepEqual(cfg.standalone.placementCoins, [1000, 200, DEFAULT_COMMUNITY_LIMITS.standalone.placementCoins[2]]);
    assert.equal(cfg.season.maxFactor, 2);
    assert.equal(cfg.season.referenceEventCount, 1);
  });

  test("Saison-Faktor skaliert mit der Terminanzahl, begrenzt auf [min, max]", () => {
    const season = { ...DEFAULT_COMMUNITY_LIMITS.season, referenceEventCount: 4, minFactor: 0.5, maxFactor: 3 };
    assert.equal(seasonFactor(season, 1), 0.5);
    assert.equal(seasonFactor(season, 4), 1);
    assert.equal(seasonFactor(season, 6), 1.5);
    assert.equal(seasonFactor(season, 40), 3);
  });

  test("Endwertung wird nach Terminanzahl gekappt", () => {
    const season = { placementCoins: [500, 250, 100], placementCoinsOther: 50, placementRankPoints: [3, 2, 1], referenceEventCount: 4, minFactor: 0.5, maxFactor: 3 };
    const placements = [
      { place: 1, coins: 5000, rankPoints: 20 },
      { place: 2, coins: 100, rankPoints: 1 },
      { place: 5, coins: 999, rankPoints: 9 },
    ];
    // 2 Termine → Faktor 0.5
    assert.deepEqual(capSeasonPlacements(placements, season, 2), [
      { place: 1, coins: 250, rankPoints: 1 },
      { place: 2, coins: 100, rankPoints: 1 },
      { place: 5, coins: 25, rankPoints: 0 },
    ]);
    // 8 Termine → Faktor 2
    assert.deepEqual(capSeasonPlacements(placements, season, 8)[0], { place: 1, coins: 1000, rankPoints: 6 });
  });

  test("Reihen-Konfiguration darf bis zur höchsten Endwertung gehen, Termine nur bis seriesEvent", () => {
    const cfg = DEFAULT_COMMUNITY_LIMITS;
    const seriesCfg = capCaptainRewardFields(
      { placementRewardsJson: { placements: [{ place: 1, coins: 99999, rankPoints: 99 }] } },
      seriesConfigLimits(cfg),
    );
    assert.deepEqual((seriesCfg.placementRewardsJson as { placements: unknown[] }).placements[0], {
      place: 1,
      coins: cfg.season.placementCoins[0] * cfg.season.maxFactor,
      rankPoints: cfg.season.placementRankPoints[0] * cfg.season.maxFactor,
    });
    const eventCfg = capCaptainRewardFields(
      { placementRewardsJson: { placements: [{ place: 1, coins: 99999, rankPoints: 99 }] } },
      cfg.seriesEvent,
    );
    assert.deepEqual((eventCfg.placementRewardsJson as { placements: unknown[] }).placements[0], {
      place: 1, coins: cfg.seriesEvent.placementCoins[0], rankPoints: cfg.seriesEvent.placementRankPoints[0],
    });
  });
});
