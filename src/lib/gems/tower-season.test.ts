import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { packForPlace, previousSeason, rankSeason, seasonDaysLeft, seasonKey, seasonLabel } from "./tower-season";

describe("Turm-Saisons", () => {
  test("Saison = Berliner Kalendermonat", () => {
    assert.equal(seasonKey(new Date("2026-10-17T12:00:00Z")), "2026-10");
    // 31.10. 23:30 UTC ist in Berlin schon der 1. November
    assert.equal(seasonKey(new Date("2026-10-31T23:30:00Z")), "2026-11");
    assert.equal(previousSeason("2026-01"), "2025-12");
    assert.equal(previousSeason("2026-10"), "2026-09");
    assert.equal(seasonLabel("2026-10"), "Oktober 2026");
  });

  test("Resttage zählen den heutigen Tag mit", () => {
    assert.equal(seasonDaysLeft(new Date("2026-10-31T10:00:00Z")), 1);
    assert.equal(seasonDaysLeft(new Date("2026-10-17T10:00:00Z")), 15);
  });

  test("Rangliste: höchste Stufe, bei Gleichstand wer zuerst dort war", () => {
    const at = (iso: string) => new Date(iso);
    const ranking = rankSeason([
      { userId: "a", stage: 20, clearedAt: at("2026-10-05T00:00:00Z") },
      { userId: "a", stage: 21, clearedAt: at("2026-10-06T00:00:00Z") },
      { userId: "b", stage: 21, clearedAt: at("2026-10-04T00:00:00Z") },
      { userId: "c", stage: 15, clearedAt: at("2026-10-01T00:00:00Z") },
    ]);
    assert.deepEqual(ranking.map((r) => r.userId), ["b", "a", "c"]);
    assert.equal(ranking[1].highestStage, 21);
  });

  test("Packs für die Top 10", () => {
    assert.equal(packForPlace(1), "COMMUNITY");
    assert.equal(packForPlace(3), "PREMIUM");
    assert.equal(packForPlace(10), "STANDARD");
    assert.equal(packForPlace(11), null);
  });
});
