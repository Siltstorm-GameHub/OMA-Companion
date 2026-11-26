import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assignSlots, chainIssues, defaultSchedule, describeSchedule, missingSlots, planUpcoming, previewTerms,
  sanitizeSchedule, scheduleProblem, slotEnd, slotStart, suggestSchedule, ruleChanged, showsOnlyNextTerm,
  termLabel, shortDayRange, nextSeasonSchedule,
  type SeriesSchedule,
} from "./series-schedule";

const d = (iso: string) => new Date(iso);
const iso = (x: Date | null) => x?.toISOString() ?? null;

// Donnerstag, 5. Nov. 2026, 20:00 Berliner Zeit (Winterzeit = 19:00 UTC), 3 Stunden
const thursdays = (patch: Partial<SeriesSchedule> = {}): SeriesSchedule => ({
  ...defaultSchedule("termine", d("2026-11-05T19:00:00Z")), rhythm: "weekly", durationMinutes: 180, aheadCount: 2, ...patch,
});
// Kalenderwoche: Montag, 2. Nov. 2026, 00:00 Berlin = 1. Nov. 23:00 UTC
const weeks = (patch: Partial<SeriesSchedule> = {}): SeriesSchedule => ({
  ...defaultSchedule("runden", d("2026-11-01T23:00:00Z")), rhythm: "weekly", aheadCount: 1, ...patch,
});

describe("Terminplanung: Konfiguration", () => {
  test("sanitize setzt Standards und begrenzt", () => {
    const s = sanitizeSchedule({ mode: "runden", anchorAt: "2026-11-01T23:00:00Z", aheadCount: 9, skippedSlots: [1, 1], end: { type: "count", count: 0 } })!;
    assert.equal(s.rhythm, "weekly");
    assert.equal(s.aheadCount, 4);
    assert.deepEqual(s.skippedSlots, []); // nur bei Terminen
    assert.deepEqual(s.end, { type: "count", count: 1 });
    assert.equal(sanitizeSchedule({ mode: "termine" }), null);
    assert.equal(sanitizeSchedule({ mode: "x", anchorAt: "2026-01-01T00:00:00Z" }), null);
    assert.deepEqual(sanitizeSchedule({ ...thursdays(), skippedSlots: [3, 1, 3, -1, "x"] })!.skippedSlots, [1, 3]);
  });

  test("Termine dürfen sich nicht überschneiden", () => {
    assert.equal(scheduleProblem(thursdays()), null);
    assert.match(scheduleProblem(thursdays({ durationMinutes: 8 * 24 * 60 }))!, /überschneiden/);
    assert.equal(scheduleProblem(thursdays({ rhythm: null, durationMinutes: 8 * 24 * 60 })), null);
  });

  test("Regeländerung wird erkannt", () => {
    assert.equal(ruleChanged(thursdays(), thursdays({ aheadCount: 4, durationMinutes: 60 })), false);
    assert.equal(ruleChanged(thursdays(), thursdays({ rhythm: "biweekly" })), true);
    assert.equal(ruleChanged(thursdays(), thursdays({ anchorAt: "2026-11-06T19:00:00.000Z" })), true);
  });
});

describe("Terminplanung: Plätze der Regel", () => {
  test("wöchentlich behält die Wanduhrzeit über die Zeitumstellung", () => {
    // Do, 22. Okt. 2026, 20:00 Sommerzeit = 18:00 UTC; eine Woche später Winterzeit = 19:00 UTC
    const s = thursdays({ anchorAt: "2026-10-22T18:00:00.000Z" });
    assert.equal(iso(slotStart(s, 1)), "2026-10-29T19:00:00.000Z");
    assert.equal(iso(slotEnd(s, 1)), "2026-10-29T22:00:00.000Z");
  });

  test("monatlich am 1. Sonntag", () => {
    const s = thursdays({ anchorAt: "2026-11-01T17:00:00.000Z", rhythm: "monthly", monthlyMode: "weekdayOfMonth" });
    assert.equal(iso(slotStart(s, 1)), "2026-12-06T17:00:00.000Z");
    assert.equal(iso(slotStart(s, 2)), "2027-01-03T17:00:00.000Z");
  });

  test("Runden: Kalenderwoche endet So 23:59", () => {
    assert.equal(iso(slotEnd(weeks(), 0)), "2026-11-08T22:59:00.000Z");
    assert.equal(iso(slotStart(weeks(), 1)), "2026-11-08T23:00:00.000Z");
  });

  test("Runden: Kalendermonat", () => {
    const s = weeks({ anchorAt: "2026-10-31T23:00:00.000Z", rhythm: "monthly" });
    assert.equal(iso(slotEnd(s, 0)), "2026-11-30T22:59:00.000Z");
    assert.equal(iso(slotStart(s, 1)), "2026-11-30T23:00:00.000Z");
    assert.equal(describeSchedule(s), "Monatliche Runden (Kalendermonat)");
  });

  test("Beschreibung", () => {
    assert.equal(describeSchedule(thursdays()), "Jeden Donnerstag, 20:00–23:00");
    assert.equal(describeSchedule(weeks()), "Wöchentliche Runden (Mo 00:00 – So 23:59)");
    assert.match(describeSchedule(thursdays({ rhythm: null })), /Keine feste Regel/);
  });
});

describe("Terminplanung: kommende Termine", () => {
  const now = d("2026-11-10T12:00:00Z");

  test("verschobener Termin behält seinen Platz, der nächste kommt regulär", () => {
    const events = [
      { slotIndex: 0, startAt: d("2026-11-05T19:00:00Z"), endAt: null },
      { slotIndex: 1, startAt: d("2026-11-13T19:00:00Z"), endAt: null }, // auf Freitag verschoben
    ];
    const plan = planUpcoming(thursdays(), events, now);
    assert.deepEqual(plan.map(p => [p.slotIndex, iso(p.startAt), iso(p.endAt)]), [[2, "2026-11-19T19:00:00.000Z", "2026-11-19T22:00:00.000Z"]]);
  });

  test("ausgefallene Plätze werden übersprungen, vergangene nicht nachgeholt", () => {
    const events = [{ slotIndex: 0, startAt: d("2026-11-05T19:00:00Z"), endAt: null }];
    const plan = planUpcoming(thursdays({ skippedSlots: [2] }), events, d("2026-11-13T12:00:00Z"));
    // Platz 1 (12.11.) ist vorbei, Platz 2 fällt aus → 26.11. und 3.12.
    assert.deepEqual(plan.map(p => p.slotIndex), [3, 4]);
  });

  test("Sondertermine zählen nicht mit, Ende nach Anzahl und Datum", () => {
    const events = [
      { slotIndex: 0, startAt: d("2026-11-05T19:00:00Z"), endAt: null },
      { slotIndex: null, startAt: d("2026-11-14T19:00:00Z"), endAt: null },
    ];
    assert.deepEqual(planUpcoming(thursdays({ end: { type: "count", count: 2 } }), events, now).map(p => p.slotIndex), [1]);
    assert.deepEqual(planUpcoming(thursdays({ end: { type: "date", at: "2026-11-13T00:00:00Z" } }), events, now).map(p => p.slotIndex), [1]);
    assert.deepEqual(planUpcoming(thursdays({ rhythm: null }), events, now), []);
  });

  test("Runden: laufende Runde + nächste Runde ohne Vorgänger", () => {
    const plan = planUpcoming(weeks(), [], d("2026-11-04T12:00:00Z"));
    assert.deepEqual(plan.map(p => [p.slotIndex, iso(p.startAt), iso(p.endAt)]), [
      [0, "2026-11-01T23:00:00.000Z", "2026-11-08T22:59:00.000Z"],
      [1, "2026-11-08T23:00:00.000Z", "2026-11-15T22:59:00.000Z"],
    ]);
  });

  test("Runden: verlängerte Runde → nächste beginnt später, endet an ihrer Grenze", () => {
    const extended = [{ slotIndex: 0, startAt: d("2026-11-01T23:00:00Z"), endAt: d("2026-11-10T22:59:00Z") }];
    const [next] = planUpcoming(weeks(), extended, d("2026-11-09T12:00:00Z"));
    assert.deepEqual([next.slotIndex, iso(next.startAt), iso(next.endAt)], [1, "2026-11-10T23:00:00.000Z", "2026-11-15T22:59:00.000Z"]);
    // Bis kurz vor die nächste Grenze verlängert → die nächste Runde reicht bis zur übernächsten Grenze
    const long = [{ slotIndex: 0, startAt: d("2026-11-01T23:00:00Z"), endAt: d("2026-11-15T10:00:00Z") }];
    const [n2] = planUpcoming(weeks(), long, d("2026-11-14T12:00:00Z"));
    assert.deepEqual([n2.slotIndex, iso(n2.endAt)], [2, "2026-11-22T22:59:00.000Z"]);
  });

  test("Vorschau ab dem ersten Termin", () => {
    assert.deepEqual(previewTerms(thursdays(), 3).map(p => iso(p.startAt)), [
      "2026-11-05T19:00:00.000Z", "2026-11-12T19:00:00.000Z", "2026-11-19T19:00:00.000Z",
    ]);
    assert.equal(previewTerms(thursdays({ rhythm: null }), 3).length, 1);
  });
});

describe("Terminplanung: Zuordnung bestehender Termine", () => {
  const ev = (id: string, start: string, end: string | null = null, status = "open") =>
    ({ id, startAt: d(start), endAt: end ? d(end) : null, status });

  test("regulär, verschoben, Sondertermin und Lücken", () => {
    const events = [
      ev("a", "2026-11-05T19:00:00Z"),
      ev("b", "2026-11-13T19:00:00Z"),   // Fr nach dem regulären Do → Platz 1 ist schon belegt → Sondertermin
      ev("c", "2026-11-12T19:00:00Z"),   // genau Platz 1 → gewinnt (näher)
      ev("d", "2026-11-26T19:00:00Z"),   // Platz 3, Platz 2 fehlt
      ev("e", "2026-12-04T19:00:00Z"),   // Fr statt Do → auf Platz 4 verschoben
    ];
    const a = assignSlots(thursdays(), events);
    assert.deepEqual(a.map(x => [x.eventId, x.slotIndex, x.kind]), [
      ["a", 0, "regular"], ["b", null, "extra"], ["c", 1, "regular"], ["d", 3, "regular"], ["e", 4, "moved"],
    ]);
    assert.deepEqual(missingSlots(thursdays(), a), [2]);
    const a2 = assignSlots(thursdays(), [events[0], events[3]]);
    assert.deepEqual(missingSlots(thursdays(), a2), [1, 2]);
  });

  test("Runden: Lücke wird bei noch nicht gestarteter Runde geschlossen", () => {
    const events = [
      ev("r0", "2026-11-01T23:00:00Z", "2026-11-08T22:59:00Z"),
      ev("r1", "2026-11-09T11:00:00Z", "2026-11-15T22:59:00Z"),
    ];
    const s = weeks();
    const issues = chainIssues(s, events, assignSlots(s, events), d("2026-11-09T08:00:00Z"));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].kind, "gap");
    assert.deepEqual(issues[0].fix && { id: issues[0].fix.eventId, start: issues[0].fix.startAt }, { id: "r1", start: "2026-11-08T23:00:00.000Z" });
  });

  test("Vorschlag aus alter Planung", () => {
    const rounds = [
      { startAt: d("2026-11-01T23:00:00Z"), endAt: d("2026-11-08T22:59:00Z") },
      { startAt: d("2026-11-08T23:00:00Z"), endAt: d("2026-11-15T22:59:00Z") },
    ];
    const s = suggestSchedule({ recurrenceType: null, recurrenceMonthlyMode: null, cycleConfigJson: JSON.stringify({ enabled: true, aheadCount: 3, carryParticipants: true }) }, rounds);
    assert.equal(s.mode, "runden");
    assert.equal(s.rhythm, "weekly");
    assert.equal(s.aheadCount, 3);
    assert.equal(s.carryParticipants, true);
    const t = suggestSchedule({ recurrenceType: "weekly", recurrenceMonthlyMode: null, cycleConfigJson: null },
      [{ startAt: d("2026-11-05T19:00:00Z"), endAt: d("2026-11-05T21:30:00Z") }]);
    assert.equal(t.mode, "termine");
    assert.equal(t.durationMinutes, 150);
  });

  test("Übersicht zeigt nur den nächsten Termin", () => {
    assert.equal(showsOnlyNextTerm({ scheduleMode: "termine" }), true);
    assert.equal(showsOnlyNextTerm({ scheduleMode: null, cycleConfigJson: '{"enabled":true}' }), true);
    assert.equal(showsOnlyNextTerm({ scheduleMode: null, cycleConfigJson: null }), false);
  });
});

describe("Terminplanung: Anzeige und Sonderfälle", () => {
  test("Bezeichnung je Ablaufart", () => {
    assert.equal(termLabel("runden", { slotIndex: 11, startAt: d("2026-11-15T23:00:00Z"), endAt: d("2026-11-22T22:59:00Z") }), "Runde 12 · 16.–22. Nov.");
    assert.equal(termLabel("termine", { slotIndex: 6, startAt: d("2026-11-05T19:00:00Z") }), "Termin 7");
    assert.equal(termLabel("termine", { slotIndex: null, startAt: d("2026-11-05T19:00:00Z") }), "Sondertermin");
    assert.equal(termLabel(null, { slotIndex: 1, startAt: d("2026-11-05T19:00:00Z") }), null);
    assert.equal(shortDayRange(d("2026-11-29T23:00:00Z"), d("2026-12-06T22:59:00Z")), "30. Nov. – 6. Dez.");
  });

  test("abgesagter Termin belegt seinen Platz, zählt aber nicht zum Vorlauf", () => {
    const events = [
      { slotIndex: 0, startAt: d("2026-11-05T19:00:00Z"), endAt: null },
      { slotIndex: 1, startAt: d("2026-11-12T19:00:00Z"), endAt: null, status: "cancelled" },
    ];
    // Vorlauf 2: Platz 1 ist abgesagt → es kommen Platz 2 und 3 dazu
    assert.deepEqual(planUpcoming(thursdays(), events, d("2026-11-10T12:00:00Z")).map(p => p.slotIndex), [2, 3]);
  });

  test("neue Saison beginnt am nächsten regulären Platz", () => {
    const next = nextSeasonSchedule(thursdays({ skippedSlots: [2] }), [{ startAt: d("2026-11-26T19:00:00Z"), endAt: d("2026-11-26T22:00:00Z") }], d("2026-11-27T12:00:00Z"));
    assert.equal(next.anchorAt, "2026-12-03T19:00:00.000Z");
    assert.deepEqual(next.skippedSlots, []);
  });
});
