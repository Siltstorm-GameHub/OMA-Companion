import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { homeRows, periodHighlight, pickHomeFeature, runningPeriodEvents, weekCount, type HomeEventCandidate } from "./home-event-feature";

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
    const f = pickHomeFeature([ev({ isRegistered: true })], { id: "r", title: "x", game: null, coverUrl: null, omaOriginal: false, place: 4, total: 12, winnerNames: ["Tobi"], pollWins: [] }, NOW);
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

describe("Zeitraum-Events (Woche/Monat) als Hintergrund", () => {
  // NOW = 15.11. 12:00 UTC
  const hours = (h: number) => new Date(NOW.getTime() + h * 3600_000);
  const week = (startH: number) => ev({ status: "active", startAt: hours(startH), endAt: hours(startH + 7 * 24) });

  test("Mittendrin: Zeitraum-Event verdrängt kein festes Event", () => {
    const fitness = week(-72); // seit 3 Tagen, noch 4 Tage
    const cup = ev({ startAt: day(2) });
    const f = pickHomeFeature([fitness, cup], null, NOW);
    assert.ok(f.kind === "recommend" && f.ev.id === cup.id);
    // auch angemeldet: das feste Event gewinnt
    const mine = pickHomeFeature([{ ...fitness, isRegistered: true }, { ...cup, isRegistered: true }], null, NOW);
    assert.ok(mine.kind === "registered" && mine.ev.id === cup.id);
  });

  test("Frisch gestartet oder endet bald → darf nach oben", () => {
    const fresh = week(-5);
    const f = pickHomeFeature([fresh, ev({ startAt: day(2) })], null, NOW);
    assert.ok(f.kind === "live" && f.ev.id === fresh.id && f.highlight === "new");
    const ending = week(-7 * 24 + 30); // endet in 30 Std
    const g = pickHomeFeature([fresh, ending], null, NOW);
    assert.ok(g.kind === "live" && g.ev.id === ending.id && g.highlight === "ending");
  });

  test("Festes laufendes Event schlägt Zeitraum-Event mit Anlass", () => {
    const fresh = week(-5);
    const tonight = ev({ status: "active", startAt: hours(-1) });
    const f = pickHomeFeature([fresh, tonight], null, NOW);
    assert.ok(f.kind === "live" && f.ev.id === tonight.id);
  });

  test("Steht sonst nichts an, bleibt die Kachel nicht leer", () => {
    const fitness = week(-72);
    const f = pickHomeFeature([fitness], null, NOW);
    assert.ok(f.kind === "live" && f.ev.id === fitness.id && !("highlight" in f && f.highlight));
  });

  test("Zeilen nur feste Termine, Zeitraum-Events separat", () => {
    const fitness = week(-72);
    const monat = ev({ status: "active", startAt: hours(-10 * 24), endAt: hours(20 * 24) });
    const a = ev({ startAt: day(1) });
    assert.deepEqual(homeRows([fitness, monat, a], null, NOW).map(e => e.id), [a.id]);
    assert.deepEqual(runningPeriodEvents([monat, fitness, a], null).map(e => e.id), [fitness.id, monat.id]);
    assert.equal(periodHighlight(a, NOW), null);
  });
});
