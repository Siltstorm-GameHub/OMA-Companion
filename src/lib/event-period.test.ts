import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { endsSoonLabel, isPeriodEvent, periodInfo, remainingLabel } from "./event-period";

const H = 60 * 60 * 1000;
const D = 24 * H;

describe("Zeitraum-Events", () => {
  test("erst ab mehr als 24 Stunden Dauer und nur mit Ende", () => {
    const start = new Date("2026-11-01T18:00:00Z");
    assert.equal(isPeriodEvent({ startAt: start, endAt: null }), false);
    assert.equal(isPeriodEvent({ startAt: start, endAt: new Date(start.getTime() + 3 * H) }), false);
    assert.equal(isPeriodEvent({ startAt: start, endAt: new Date(start.getTime() + D) }), false);
    assert.equal(isPeriodEvent({ startAt: start, endAt: new Date(start.getTime() + 30 * D) }), true);
  });

  test("Fortschritt und Restlaufzeit", () => {
    const start = 0, end = 30 * D;
    const info = periodInfo({ startAt: start, endAt: end }, 18 * D);
    assert.equal(info.progress, 0.6);
    assert.equal(info.remainingLabel, "Noch 12 Tage");
    assert.equal(periodInfo({ startAt: start, endAt: end }, 31 * D).ended, true);
    assert.equal(periodInfo({ startAt: start, endAt: end }, -D).progress, 0);
  });

  test("Beschriftungen", () => {
    assert.equal(remainingLabel(36 * H), "Noch 1 Tag");
    assert.equal(remainingLabel(5 * H), "Noch 5 Std.");
    assert.equal(remainingLabel(30 * 60 * 1000), "Endet gleich");
    assert.equal(endsSoonLabel(2.5 * D), "Endet in 2 Tagen");
    assert.equal(endsSoonLabel(30 * H), "Endet morgen");
    assert.equal(endsSoonLabel(3 * H), "Endet heute");
  });
});
