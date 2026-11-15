import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { homeRows, pickHomeFeature, weekCount, type HomeEventCandidate } from "./home-event-feature";

const NOW = new Date("2026-11-15T12:00:00Z");
const day = (n: number, h = 19) => new Date(Date.UTC(2026, 10, 15 + n, h));

let seq = 0;
function ev(p: Partial<HomeEventCandidate>): HomeEventCandidate {
  seq++;
  return {
    id: `e${seq}`, title: `Event ${seq}`, game: null, coverUrl: null, omaOriginal: false, status: "open",
    startAt: day(3), endAt: null, maxPlayers: null, playerCount: 0, isRegistered: false, canSelfRegister: true,
    gameVoteOpen: false, gameVoteMissing: false, pollMissingVote: false, pollEndsAt: null, relevance: [],
    coins: 10, avatars: [], friendNames: [], discordUrl: null, ...p,
  };
}

describe("Startseiten-Event: Priorität", () => {
  test("Ergebnis schlägt alles", () => {
    const f = pickHomeFeature([ev({ isRegistered: true })], { id: "r", title: "x", game: null, coverUrl: null, omaOriginal: false, place: 4, total: 12, winnerName: "Tobi" }, NOW);
    assert.equal(f.kind, "result");
  });

  test("angemeldet vor live, laufend vor anstehend", () => {
    const later = ev({ isRegistered: true, startAt: day(5) });
    const live = ev({ status: "active", startAt: day(-1) });
    assert.equal(pickHomeFeature([live, later], null, NOW).kind, "registered");
    const mineLive = ev({ isRegistered: true, status: "active", startAt: day(-2) });
    const f = pickHomeFeature([later, mineLive], null, NOW);
    assert.ok(f.kind === "registered" && f.ev.id === mineLive.id);
  });

  test("live, dann fehlende Stimme, dann Spielwahl", () => {
    const poll = ev({ status: "umfrage", pollMissingVote: true, startAt: day(-1) });
    const vote = ev({ gameVoteOpen: true, gameVoteMissing: true });
    assert.equal(pickHomeFeature([poll, vote, ev({ status: "active", startAt: day(0, 10) })], null, NOW).kind, "live");
    assert.equal(pickHomeFeature([vote, poll], null, NOW).kind, "poll");
    assert.equal(pickHomeFeature([vote, ev({})], null, NOW).kind, "gamevote");
  });

  test("Empfehlung: Relevanz vor Datum, volle Events nie", () => {
    const soon = ev({ startAt: day(1) });
    const mine = ev({ startAt: day(4), relevance: ["Dein Spiel"] });
    const full = ev({ startAt: day(1), relevance: ["Dein Squad", "Dein Spiel"], maxPlayers: 4, playerCount: 4 });
    const f = pickHomeFeature([soon, mine, full], null, NOW);
    assert.ok(f.kind === "recommend" && f.ev.id === mine.id);
    const g = pickHomeFeature([ev({ startAt: day(6) }), soon], null, NOW);
    assert.ok(g.kind === "recommend" && g.ev.id === soon.id);
    assert.equal(pickHomeFeature([], null, NOW).kind, "none");
  });

  test("Zeilen und Wochenzähler", () => {
    const a = ev({ startAt: day(1) });
    const b = ev({ startAt: day(2) });
    const c = ev({ startAt: day(9) });
    const p = ev({ status: "umfrage", startAt: day(-1) });
    assert.deepEqual(homeRows([c, b, a, p], a.id, NOW).map(e => e.id), [b.id, c.id]);
    assert.equal(weekCount([a, b, c, p], NOW), 2);
  });
});
