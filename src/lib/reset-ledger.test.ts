import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  expandToSeasonGroups, mergeTotals, rankPointsFromEventCompletion, rankPointsFromSeriesCompletion,
} from "./reset-ledger";

const regs = [
  { userId: "a", role: "player" },
  { userId: "b", role: "player" },
  { userId: "s", role: "spectator" },
];

describe("Reset: Rang-Punkte aus Event-Abschluss", () => {
  test("liest Zuschauer, Platzierung und Reihentabellen-Übertrag", () => {
    const cd = JSON.stringify({
      rewardLedger: {
        participationCoins: { a: 10, b: 10 },
        spectatorRewards: { s: { coins: 5, rankPoints: 1 } },
        placementRewards: { a: { coins: 500, rankPoints: 3 } },
      },
      seriesContrib: {
        transferredParticipationPoints: { a: 2, b: 2 },
        transferredStatPoints: { a: 4 },
        transferredSpectatorPoints: { s: 1 },
        transferredPlacementPoints: { a: 5 },
      },
      frozenStatConfig: { transferToGlobalRanking: true },
    });
    assert.deepEqual(rankPointsFromEventCompletion(cd, regs, true), { s: 2, a: 14, b: 2 });
  });

  test("Umfragen: filtert Ausgeschlossene und falsche Rolle, Übertrag nur bei transferToGlobalRanking", () => {
    const base = {
      excludedUserIds: ["b"],
      pollWinnerIds: ["a"], pollBonusRankPoints: 2,
      pollResults: [
        { label: "MVP", winnerIds: ["a", "b", "s"], rankPoints: 3, type: "player" },
        { label: "Fan", winnerIds: ["s", "a"], rankPoints: 1, type: "spectator" },
      ],
      eventPollRewards: [{ label: "X", winnerIds: ["a", "b"], voterIds: [], winnerRankPoints: 4, participationSeriesPoints: 0 }],
      pollParticipationSeriesReward: [{ userId: "s", points: 1 }],
    };
    const withTransfer = JSON.stringify({ ...base, frozenStatConfig: { transferToGlobalRanking: true } });
    assert.deepEqual(rankPointsFromEventCompletion(withTransfer, regs, true), { a: 9, s: 2 });
    const without = JSON.stringify({ ...base, frozenStatConfig: { transferToGlobalRanking: false } });
    assert.deepEqual(rankPointsFromEventCompletion(without, regs, true), { a: 5, s: 1 });
  });

  test("Dominion-Bonus nur, wenn er ausgezahlt wurde und die Reihe überträgt", () => {
    const cd = JSON.stringify({
      dominionChanges: {
        a: { streakBefore: 2, streakAfter: 0, bonusAwarded: true, coins: 50, seriesPoints: 5 },
        b: { streakBefore: 0, streakAfter: 1, bonusAwarded: false, coins: 50, seriesPoints: 5 },
      },
    });
    assert.deepEqual(rankPointsFromEventCompletion(cd, regs, true), { a: 5 });
    assert.deepEqual(rankPointsFromEventCompletion(cd, regs, false), {});
  });

  test("kaputte oder fehlende Daten ergeben nichts", () => {
    assert.deepEqual(rankPointsFromEventCompletion(null, regs, true), {});
    assert.deepEqual(rankPointsFromEventCompletion("{kaputt", regs, true), {});
  });
});

describe("Reset: Rang-Punkte aus Reihen-Abschluss", () => {
  test("Endplatzierung und Saison-Poll", () => {
    const cd = JSON.stringify({
      placementRewards: [{ userId: "a", place: 1, coins: 500, rankPoints: 3 }, { userId: "b", place: 2, coins: 250, rankPoints: 2 }],
      pollWinnerIds: ["b"], pollBonusRankPoints: 1,
    });
    assert.deepEqual(rankPointsFromSeriesCompletion(cd), { a: 3, b: 3 });
    assert.deepEqual(mergeTotals({ a: 1 }, { a: 2, c: 1 }), { a: 3, c: 1 });
  });
});

describe("Reset: Saison-Gruppen", () => {
  test("eine gewählte Saison nimmt alle Saisons derselben Reihe mit", () => {
    const all = [
      { id: "s1", groupId: "g" }, { id: "s2", groupId: "g" }, { id: "solo", groupId: null }, { id: "other", groupId: "h" },
    ];
    assert.deepEqual(expandToSeasonGroups(["s2", "solo"], all), ["s1", "s2", "solo"]);
    assert.deepEqual(expandToSeasonGroups(["unbekannt"], all), []);
  });
});
