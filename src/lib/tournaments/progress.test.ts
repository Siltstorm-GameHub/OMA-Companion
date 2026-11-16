import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { duelProgress, nextDuelMatches, statProgress, statStandings } from "./progress";

const duel = (id: string, round: number, position: number, o: Partial<{ p1: string | null; p2: string | null; winner: string | null; played: boolean; scheduled: string; live: boolean }> = {}) => ({
  id, round, position,
  player1Id: o.p1 === undefined ? `${id}a` : o.p1, player2Id: o.p2 === undefined ? `${id}b` : o.p2,
  winnerId: o.winner ?? null, playedAt: o.played ? "2026-11-16T10:00:00Z" : null,
  scheduledAt: o.scheduled ?? null, startedAt: o.live ? "2026-11-16T10:00:00Z" : null,
});

describe("Turnier: Fortschritt Duelle", () => {
  test("Freilose zählen nicht, aktuelle Runde = erste offene", () => {
    const ms = [
      duel("q1", 1, 1, { winner: "x", played: true }),
      duel("q2", 1, 2, { p2: null, winner: "q2a" }), // Freilos
      duel("h1", 2, 1),
      duel("f", 3, 1, { p1: null, p2: null }),
    ];
    const p = duelProgress(ms);
    assert.equal(p.total, 3);
    assert.equal(p.played, 1);
    assert.equal(p.current?.id, "h1");
  });

  test("Als Nächstes: nur spielbare, live zuerst, dann Termin", () => {
    const ms = [
      duel("a", 1, 1, { scheduled: "2026-11-16T20:00:00Z" }),
      duel("b", 1, 2, { scheduled: "2026-11-16T19:00:00Z" }),
      duel("c", 1, 3, { live: true }),
      duel("d", 2, 1, { p2: null }),
      duel("e", 1, 4, { winner: "e1", played: true }),
    ];
    assert.deepEqual(nextDuelMatches(ms).map((m) => m.id), ["c", "b", "a"]);
    assert.deepEqual(nextDuelMatches(ms, 1).map((m) => m.id), ["c"]);
  });
});

const round = (id: string, position: number, played: boolean, entries: [string, Record<string, unknown>][]) => ({
  id, position, playedAt: played ? "2026-11-16T10:00:00Z" : null,
  entries: entries.map(([userId, s]) => ({ userId, statsJson: JSON.stringify(s) })),
});

describe("Turnier: Stat-Formate", () => {
  const rounds = [
    round("r2", 2, true, [["chris", { Kills: 6, Assists: 2 }], ["dunja", { Kills: 3, Assists: 5 }]]),
    round("r1", 1, true, [["chris", { Kills: 5, Assists: 2 }], ["dunja", { Kills: 4, Assists: 4 }], ["elias", { Kills: 6 }]]),
    round("r3", 3, false, [["chris", {}], ["dunja", {}]]),
  ];

  test("Fortschritt und nächste Runde nach Rundennummer", () => {
    const p = statProgress(rounds);
    assert.deepEqual([p.played, p.total, p.next?.id], [2, 3, "r3"]);
  });

  test("Summen-Tabelle, sortiert nach dem ersten Feld", () => {
    const t = statStandings(rounds, ["Kills", "Assists"], "coop_stats");
    assert.deepEqual(t.map((r) => [r.userId, r.values.Kills, r.rounds]), [["chris", 11, 2], ["dunja", 7, 2], ["elias", 6, 1]]);
  });

  test("Mit Eventpunkten wird nach Punkten sortiert", () => {
    const t = statStandings(rounds, ["Kills"], "coop_stats", { points: { chris: 10, dunja: 30, elias: 5 } });
    assert.deepEqual(t.map((r) => [r.userId, r.points]), [["dunja", 30], ["chris", 10], ["elias", 5]]);
  });

  test("Durchschnittswerte: Ø je Spieler, Richtung beachtet", () => {
    const hi = statStandings(rounds, ["Kills"], "avg_stats");
    assert.deepEqual(hi.map((r) => [r.userId, r.avg]), [["elias", 6], ["chris", 5.5], ["dunja", 3.5]]);
    const lo = statStandings(rounds, ["Kills"], "avg_stats", { direction: "low" });
    assert.equal(lo[0].userId, "dunja");
    assert.equal(hi.find((r) => r.userId === "elias")?.rounds, 1);
  });
});
