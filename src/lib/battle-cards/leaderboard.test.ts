import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { compareLeaderboardRows } from "./leaderboard";

describe("Rangliste nach Kampagnen-Sternen", () => {
  test("mehr Sterne zuerst, bei Gleichstand wer früher dort war", () => {
    const rows = [
      { id: "spaet", stars: 10, reachedAt: "2026-10-02T10:00:00.000Z" },
      { id: "wenig", stars: 4, reachedAt: "2026-09-01T10:00:00.000Z" },
      { id: "frueh", stars: 10, reachedAt: "2026-10-01T10:00:00.000Z" },
    ];
    assert.deepEqual(rows.sort(compareLeaderboardRows).map((r) => r.id), ["frueh", "spaet", "wenig"]);
  });
});
