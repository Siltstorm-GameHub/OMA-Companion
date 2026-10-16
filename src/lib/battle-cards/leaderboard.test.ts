import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { aggregateProgress, compareLeaderboardRows, stageOf } from "./leaderboard";

describe("Rangliste der Kampagne", () => {
  test("Stufennummern für Kapitel- und Endlos-Level", () => {
    assert.equal(stageOf("lvl-01"), 1);
    assert.equal(stageOf("lvl-12"), 12);
    assert.equal(stageOf("endless-27"), 27);
    assert.equal(stageOf("quatsch"), 0);
  });

  test("höchste Stufe vor Sternen, bei Gleichstand wer früher dort war", () => {
    const rows = [
      { id: "viele-sterne", highestStage: 12, stars: 36, reachedAt: "2026-09-01T00:00:00.000Z" },
      { id: "spaet", highestStage: 15, stars: 40, reachedAt: "2026-10-02T00:00:00.000Z" },
      { id: "frueh", highestStage: 15, stars: 40, reachedAt: "2026-10-01T00:00:00.000Z" },
      { id: "mehr-sterne", highestStage: 15, stars: 42, reachedAt: "2026-10-03T00:00:00.000Z" },
    ];
    assert.deepEqual(rows.sort(compareLeaderboardRows).map((r) => r.id), ["mehr-sterne", "frueh", "spaet", "viele-sterne"]);
  });

  test("Fortschritt wird je Spieler zusammengefasst", () => {
    const byUser = aggregateProgress([
      { userId: "a", levelId: "lvl-12", stars: 3, updatedAt: new Date("2026-10-01T00:00:00Z") },
      { userId: "a", levelId: "endless-14", stars: 2, updatedAt: new Date("2026-10-05T00:00:00Z") },
      { userId: "b", levelId: "lvl-03", stars: 1, updatedAt: new Date("2026-09-01T00:00:00Z") },
    ]);
    assert.deepEqual(byUser.get("a"), { highestStage: 14, stars: 5, reachedAt: "2026-10-05T00:00:00.000Z" });
    assert.equal(byUser.get("b")?.highestStage, 3);
  });
});
