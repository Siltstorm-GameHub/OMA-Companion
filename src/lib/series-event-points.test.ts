import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyEventStatOverride, computeEventPoints, computeLiveLigaPunkte, computeStatStandings, computeTurnierpunkte,
  extractPlacementPoints, type EventCompletionData, type StatConfig,
} from "./series-event-points";

const baseCfg: StatConfig = {
  participationPoints: 10,
  spectatorParticipationPoints: 2,
  stats: [{ field: "Kills", pointsPer: 1 }, { field: "Sieg", pointsPer: 25 }],
  winnerStatKeys: ["Sieg"],
};

const entry = (userId: string, stats: Record<string, number>) => ({ userId, statsJson: JSON.stringify(stats) });
const done = (cd: EventCompletionData) => JSON.stringify({ gamePhaseComplete: true, ...cd });

describe("extractPlacementPoints", () => {
  test("rechnet Platz über die Tabelle um, sonst undefined", () => {
    const table = { "1": 10, "2": 6 };
    assert.equal(extractPlacementPoints({ Platzierung: 1 }, table), 10);
    assert.equal(extractPlacementPoints({ Platzierung: 3 }, table), undefined);
    assert.equal(extractPlacementPoints({}, table), undefined);
    assert.equal(extractPlacementPoints({ Platzierung: 1 }, undefined), undefined);
  });
});

describe("applyEventStatOverride", () => {
  test("ersetzt/ergänzt nur genannte Felder, Rest bleibt", () => {
    const out = applyEventStatOverride(baseCfg, JSON.stringify({ stats: [{ field: "Kills", pointsPer: 3 }, { field: "Assists", pointsPer: 1 }] }));
    assert.deepEqual(out.stats, [{ field: "Kills", pointsPer: 3 }, { field: "Sieg", pointsPer: 25 }, { field: "Assists", pointsPer: 1 }]);
    assert.equal(out.participationPoints, 10);
  });

  test("leere oder kaputte Überschreibung ändert nichts", () => {
    assert.equal(applyEventStatOverride(baseCfg, null), baseCfg);
    assert.equal(applyEventStatOverride(baseCfg, "{kaputt"), baseCfg);
    assert.equal(applyEventStatOverride(baseCfg, JSON.stringify({ stats: [], placementPoints: {} })), baseCfg);
  });
});

describe("computeTurnierpunkte", () => {
  const matches = [
    { entries: [entry("a", { Kills: 4, Sieg: 1, Platzierung: 1 }), entry("b", { Kills: 2, Platzierung: 2 })] },
    { entries: [entry("a", { Kills: 2, Platzierung: 2 }), entry("b", { Kills: 6, Platzierung: 1 }), { userId: null, statsJson: "{}" }] },
  ];
  const cfg = { ...baseCfg, placementPoints: { "1": 10, "2": 5 } };

  test("Summe: Stats × Punkte + Platzierungspunkte, Sieger-Stat ausgeklammert", () => {
    assert.deepEqual(computeTurnierpunkte(matches, cfg), { a: 6 + 15, b: 8 + 15 });
  });

  test("avg_stats teilt Stats durch gespielte Runden, Platzierung bleibt additiv", () => {
    assert.deepEqual(computeTurnierpunkte(matches, cfg, "avg_stats"), { a: 3 + 15, b: 4 + 15 });
  });
});

describe("computeEventPoints", () => {
  const ev = {
    registrations: [{ userId: "a" }, { userId: "b" }, { userId: "c", role: "spectator" }],
    matches: [{ entries: [entry("a", { Kills: 5 }), entry("b", { Kills: 3 })] }],
  };

  test("vor Abschluss der Spielphase keine Punkte", () => {
    assert.deepEqual(computeEventPoints({ ...ev, completionData: null }, baseCfg).pointsByUser, {});
    assert.deepEqual(computeEventPoints({ ...ev, completionData: JSON.stringify({}) }, baseCfg).pointsByUser, {});
  });

  test("Teilnahme + Stats + Sieger-Zielfeld; Zuschauer nur bei Anwesenheit", () => {
    const r = computeEventPoints({ ...ev, completionData: done({ eventWinnerId: "a", spectatorAttendedIds: ["c"] }) }, baseCfg);
    assert.deepEqual(r.pointsByUser, { a: 10 + 5 + 25, b: 10 + 3, c: 2 });
    assert.deepEqual(r.participationsByUser, { a: 1, b: 1 });
    assert.deepEqual(r.spectatorParticipationsByUser, { c: 1 });
  });

  test("ausgeschlossene User: Stats sichtbar, aber 0 Punkte und kein Sieger-Bonus", () => {
    const r = computeEventPoints({ ...ev, completionData: done({ eventWinnerId: "a", excludedUserIds: ["a"] }) }, baseCfg);
    assert.equal(r.pointsByUser.a, 0);
    assert.equal(r.statsByUser.a.Kills, 5);
    assert.equal(r.statsByUser.a.Sieg, undefined);
    assert.deepEqual(r.excludedFromPointsUserIds, ["a"]);
  });

  test("eingefrorene Konfiguration hat Vorrang vor der aktuellen", () => {
    const frozen: StatConfig = { ...baseCfg, participationPoints: 1, stats: [{ field: "Kills", pointsPer: 0 }] };
    const r = computeEventPoints({ ...ev, completionData: done({ frozenStatConfig: frozen }) }, baseCfg);
    assert.deepEqual(r.pointsByUser, { a: 1, b: 1 });
  });

  test("Umfrage-Teilnahmepunkte nur einmal pro Event (höchster Betrag), Siegerpunkte je Sieg", () => {
    const r = computeEventPoints({ ...ev, completionData: done({
      eventPollRewards: [
        { label: "MVP", voterIds: ["b"], winnerIds: ["a"], participationSeriesPoints: 2, winnerRankPoints: 5 },
        { label: "Clip", voterIds: ["b"], winnerIds: ["a"], participationSeriesPoints: 3, winnerRankPoints: 4 },
      ],
    }) }, baseCfg);
    assert.equal(r.pointsByUser.a, 10 + 5 + 5 + 4);
    assert.equal(r.pointsByUser.b, 10 + 3 + 3);
    assert.equal(r.statsByUser.b["Umfrage-Teilnahmen"], 1);
  });

  test("Dominion-Bonus zählt nur bei ausgelöstem Bonus", () => {
    const r = computeEventPoints({ ...ev, completionData: done({ dominionChanges: {
      a: { streakBefore: 2, streakAfter: 3, bonusAwarded: true, coins: 50, seriesPoints: 7 },
      b: { streakBefore: 0, streakAfter: 1, bonusAwarded: false, coins: 0, seriesPoints: 7 },
    } }) }, baseCfg);
    assert.equal(r.pointsByUser.a, 10 + 5 + 7);
    assert.equal(r.pointsByUser.b, 10 + 3);
  });
});

describe("computeStatStandings", () => {
  test("summiert Events und Legacy-Stand, sortiert nach Punkten dann Teilnahmen", () => {
    const mk = (id: string, winner: string) => ({
      id, status: "finished", finalRankingJson: null,
      completionData: done({ eventWinnerId: winner }),
      registrations: [{ userId: "a" }, { userId: "b" }],
      matches: [],
    });
    const { rows } = computeStatStandings([mk("e1", "a"), mk("e2", "b")], baseCfg, [
      { userId: "b", points: 5, participations: 1, stats: { Sieg: 1 } },
      { userId: "z", points: 70, participations: 0, stats: {} },
    ]);
    assert.deepEqual(rows.map(r => [r.userId, r.totalPoints, r.participations]), [["z", 70, 0], ["b", 50, 3], ["a", 45, 2]]);
    assert.equal(rows.find(r => r.userId === "b")!.stats.Sieg, 2);
    assert.equal(rows.find(r => r.userId === "b")!.hasLegacy, true);
  });
});

describe("computeLiveLigaPunkte", () => {
  test("Vorschau ohne Sieger-Bonus, Führende separat (Gleichstand → alle)", () => {
    const r = computeLiveLigaPunkte(
      { registrations: [{ userId: "a" }, { userId: "b" }], matches: [{ entries: [entry("a", { Kills: 2 })] }] },
      baseCfg,
      { a: 10, b: 10, c: 0 },
    );
    assert.deepEqual(r.pointsByUser, { a: 12, b: 10 });
    assert.deepEqual(r.projectedWinnerIds.sort(), ["a", "b"]);
    assert.deepEqual(r.projectedWinnerBonusByUser, { a: 25, b: 25 });
  });
});
