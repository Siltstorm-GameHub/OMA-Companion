import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildEventIcs, icsEscape } from "./ics";

describe("Kalender-Export", () => {
  test("escaped Sonderzeichen", () => {
    assert.equal(icsEscape("A, B; C\\D\nE"), "A\\, B\\; C\\\\D\\nE");
  });

  test("baut ein gültiges VEVENT mit 2 Std Standarddauer", () => {
    const ics = buildEventIcs({
      id: "ev1",
      title: "RL 2v2, Cup",
      startAt: new Date("2026-11-22T19:00:00Z"),
      url: "https://example.test/tournament/ev1",
      now: new Date("2026-11-15T12:00:00Z"),
    });
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /DTSTART:20261122T190000Z\r\n/);
    assert.match(ics, /DTEND:20261122T210000Z\r\n/);
    assert.match(ics, /SUMMARY:RL 2v2\\, Cup\r\n/);
    assert.match(ics, /END:VCALENDAR\r\n$/);
  });

  test("faltet lange Zeilen auf höchstens 75 Oktette", () => {
    const ics = buildEventIcs({
      id: "ev2",
      title: "Ä".repeat(80),
      startAt: new Date("2026-11-22T19:00:00Z"),
      endAt: new Date("2026-11-22T22:00:00Z"),
      url: "https://example.test/x",
    });
    for (const line of ics.split("\r\n")) {
      assert.ok(new TextEncoder().encode(line).length <= 75, line);
    }
    assert.match(ics, /DTEND:20261122T220000Z/);
  });
});
