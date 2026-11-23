import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { actionFor, groupManageEvents, lifecycleStep, matchesQuery, seriesProgress, statusText, type ManageEvent } from "./event-manage";

// Mo 16. Nov 2026, 15:00 Berlin
const NOW = new Date("2026-11-16T14:00:00Z");
const H = 3_600_000;
const at = (h: number) => new Date(NOW.getTime() + h * H);

const ev = (o: Partial<ManageEvent>): ManageEvent => ({
  id: "e", title: "Event", status: "open", startAt: at(5), endAt: null, game: null, maxPlayers: null, players: 0,
  tournamentStatus: null, hidden: false, approvalStatus: null, completed: false, series: null, createdBy: null, ...o,
});

describe("Verwalten: Aktionen", () => {
  test("Turnier, Umfragephase, vorbei und nicht abgeschlossen", () => {
    assert.equal(actionFor(ev({ tournamentStatus: "active" }), NOW)?.button, "Spielplan");
    assert.equal(actionFor(ev({ status: "umfrage", startAt: at(-5) }), NOW)?.kind, "poll");
    const late = actionFor(ev({ startAt: at(-80) }), NOW);
    assert.equal(late?.kind, "complete");
    assert.equal(late?.late, true);
    assert.equal(actionFor(ev({ startAt: at(-3) }), NOW)?.late, false);
    assert.equal(actionFor(ev({ startAt: at(5) }), NOW), null);
    assert.equal(actionFor(ev({ status: "finished", startAt: at(-80) }), NOW), null);
    // Zeitraum-Event läuft noch → keine Aktion
    assert.equal(actionFor(ev({ startAt: at(-24), endAt: at(24) }), NOW), null);
  });

  test("Status in Klartext", () => {
    assert.equal(statusText(ev({}), NOW), "Anmeldung offen");
    assert.equal(statusText(ev({ maxPlayers: 4, players: 4 }), NOW), "Voll");
    assert.equal(statusText(ev({ status: "closed" }), NOW), "Voll");
    assert.equal(statusText(ev({ startAt: at(-1), endAt: at(2) }), NOW), "Läuft");
    assert.equal(statusText(ev({ status: "finished", completed: true }), NOW), "Abgeschlossen");
    assert.equal(statusText(ev({ status: "umfrage" }), NOW), "Umfragephase");
  });
});

describe("Verwalten: Gruppen", () => {
  test("Braucht dich, Läuft gerade, Heute/Woche/Später, Beendet", () => {
    const g = groupManageEvents([
      ev({ id: "later", startAt: at(24 * 10) }),
      ev({ id: "today", startAt: at(3) }),
      ev({ id: "week", startAt: at(48) }),
      ev({ id: "overdue", startAt: at(-80) }),
      ev({ id: "fresh", startAt: at(-2) }),
      ev({ id: "done", status: "finished", startAt: at(-100), completed: true }),
      ev({ id: "running", startAt: at(-24), endAt: at(24) }),
      // "closed" = voll: steht weiter an, ist nicht beendet
      ev({ id: "full", status: "closed", startAt: at(26) }),
      // voll und vorbei: braucht trotzdem einen Abschluss
      ev({ id: "fullPast", status: "closed", startAt: at(-1) }),
    ], NOW);
    assert.deepEqual(g.action.map((a) => a.ev.id), ["overdue", "fresh", "fullPast"]);
    assert.deepEqual(g.upcoming.running.map((e) => e.id), ["running"]);
    assert.deepEqual(g.upcoming.today.map((e) => e.id), ["today"]);
    assert.deepEqual(g.upcoming.week.map((e) => e.id), ["full", "week"]);
    assert.deepEqual(g.upcoming.later.map((e) => e.id), ["later"]);
    assert.deepEqual(g.past.map((e) => e.id), ["done"]);
  });
});

describe("Verwalten: Reihen und Suche", () => {
  test("Fortschritt und Saison durch", () => {
    const events = [
      { startAt: at(-200), endAt: null, status: "finished" },
      { startAt: at(-100), endAt: null, status: "finished" },
      { startAt: at(50), endAt: null, status: "open" },
    ];
    assert.deepEqual(seriesProgress(events, false, NOW), { played: 2, total: 3, next: at(50), seasonDone: false });
    const done = seriesProgress(events.slice(0, 2), false, NOW);
    assert.equal(done.seasonDone, true);
    assert.equal(seriesProgress(events.slice(0, 2), true, NOW).seasonDone, false);
    assert.equal(seriesProgress([], false, NOW).seasonDone, false);
  });

  test("Suche über Titel, Spiel, Reihe, Ersteller", () => {
    const e = ev({ title: "Wochen-Cup", game: "Rocket League", series: { id: "s", name: "Liga", icon: null, index: 1, total: 4 }, createdBy: "Lena" });
    assert.ok(matchesQuery(e, "rocket"));
    assert.ok(matchesQuery(e, "liga"));
    assert.ok(matchesQuery(e, "LENA"));
    assert.ok(matchesQuery(e, ""));
    assert.ok(!matchesQuery(e, "valorant"));
  });
});

describe("Verwalten: Ablauf-Leiste", () => {
  test("Schritt aus Status und Zeit", () => {
    assert.equal(lifecycleStep({ status: "open", startAt: at(5), endAt: null }, NOW), 0);
    assert.equal(lifecycleStep({ status: "active", startAt: at(-1), endAt: null }, NOW), 1);
    assert.equal(lifecycleStep({ status: "open", startAt: at(-1), endAt: at(2) }, NOW), 1);
    // Ohne Ende und ohne aktiven Status: nach dem Start ist der Abschluss dran
    assert.equal(lifecycleStep({ status: "open", startAt: at(-1), endAt: null }, NOW), 2);
    assert.equal(lifecycleStep({ status: "open", startAt: at(-5), endAt: at(-1) }, NOW), 2);
    assert.equal(lifecycleStep({ status: "umfrage", startAt: at(-5), endAt: null }, NOW), 2);
    assert.equal(lifecycleStep({ status: "finished", startAt: at(-50), endAt: null }, NOW), 3);
  });
});
