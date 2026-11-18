import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeStatStandings, mergeStandingRows, type SeriesEventForStandings, type StatConfig } from "./series-event-points";

const ev = (id: string, startAt: string, money: Record<string, number[]>, kills: Record<string, number> = {}): SeriesEventForStandings => ({
  id, status: "finished", finalRankingJson: null, startAt, goalStateJson: null,
  completionData: JSON.stringify({ gamePhaseComplete: true }),
  registrations: Object.keys(money).map(userId => ({ userId })),
  matches: [0, 1].map(i => ({
    entries: Object.entries(money).filter(([, v]) => v[i] !== undefined)
      .map(([userId, v]) => ({ userId, statsJson: JSON.stringify({ Geld: v[i], ...(i === 0 && kills[userId] ? { Kills: kills[userId] } : {}) }) })),
  })),
});

const cfg: StatConfig = {
  participationPoints: 0,
  stats: [{ field: "Geld", pointsPer: 1, latest: true }, { field: "Kills", pointsPer: 2 }],
};

describe("Statistiken mit „neuester Wert“", () => {
  test("Reihentabelle: Wert und Punkte aus dem neuesten Event, im Event der höchste Wert", () => {
    // Reihenfolge absichtlich verdreht — sortiert wird nach startAt
    const events = [
      ev("w2", "2026-11-09T17:00:00Z", { a: [300, 350] }, { a: 1 }),
      ev("w1", "2026-11-02T17:00:00Z", { a: [100], b: [50] }, { a: 2 }),
    ];
    const { rows } = computeStatStandings(events, cfg, []);
    const a = rows.find(r => r.userId === "a")!;
    const b = rows.find(r => r.userId === "b")!;
    assert.equal(a.stats.Geld, 350);
    assert.equal(a.stats.Kills, 3); // normale Stats werden weiter addiert
    assert.equal(a.totalPoints, 350 + 3 * 2);
    assert.equal(b.stats.Geld, 50); // b hat im neuesten Event nichts gemeldet → bleibt beim letzten Wert
    assert.equal(b.totalPoints, 50);
  });

  test("ohne Markierung wird wie bisher addiert", () => {
    const plain: StatConfig = { participationPoints: 0, stats: [{ field: "Geld", pointsPer: 1 }] };
    const { rows } = computeStatStandings([ev("w1", "2026-11-02T17:00:00Z", { a: [100] }), ev("w2", "2026-11-09T17:00:00Z", { a: [300] })], plain, []);
    assert.equal(rows[0].stats.Geld, 400);
  });

  test("All-Time: die spätere Saison überschreibt", () => {
    const row = (geld: number) => ({ userId: "a", totalPoints: geld, participations: 1, spectatorParticipations: 0, stats: { Geld: geld, Kills: 1 }, hasLegacy: false, disqualifiedEventCount: 0 });
    const merged = mergeStandingRows([[row(100)], [row(500)]], new Set(["Geld"]));
    assert.equal(merged[0].stats.Geld, 500);
    assert.equal(merged[0].stats.Kills, 2);
  });
});
