import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseCycleConfig, plannedCycleStarts, sanitizeCycleConfig, type CycleConfig } from "./series-cycles-config";

const d = (iso: string) => new Date(iso);
const cfg = (patch: Partial<CycleConfig> = {}): CycleConfig => ({ enabled: true, aheadCount: 1, carryParticipants: true, ...patch });

describe("Zyklus-Automatik: Konfiguration", () => {
  test("sanitize begrenzt und setzt Standards", () => {
    assert.deepEqual(sanitizeCycleConfig({ enabled: true, aheadCount: 9 }), { enabled: true, aheadCount: 4, carryParticipants: true });
    assert.deepEqual(sanitizeCycleConfig({ enabled: "ja", aheadCount: 0, carryParticipants: false }), { enabled: false, aheadCount: 1, carryParticipants: false });
    assert.equal(sanitizeCycleConfig({ enabled: true, endsAt: "kaputt" })?.endsAt, undefined);
    assert.equal(parseCycleConfig("{kaputt").enabled, false);
    assert.equal(parseCycleConfig(null).enabled, false);
  });
});

describe("Zyklus-Automatik: Planung", () => {
  // Montags 18:00 Berliner Zeit (Winterzeit = 17:00 UTC)
  const events = [{ startAt: d("2026-11-02T17:00:00Z") }, { startAt: d("2026-11-09T17:00:00Z") }, { startAt: d("2026-11-16T17:00:00Z") }];

  test("legt so viele Zyklen an, dass aheadCount kommende existieren", () => {
    const now = d("2026-11-17T09:00:00Z"); // Zyklus vom 16.11. läuft
    const one = plannedCycleStarts(events, "weekly", "dayOfMonth", cfg(), now);
    assert.deepEqual(one.map(x => x.toISOString()), ["2026-11-23T17:00:00.000Z"]);
    const two = plannedCycleStarts(events, "weekly", "dayOfMonth", cfg({ aheadCount: 2 }), now);
    assert.deepEqual(two.map(x => x.toISOString()), ["2026-11-23T17:00:00.000Z", "2026-11-30T17:00:00.000Z"]);
  });

  test("nichts zu tun, wenn genug kommende Zyklen existieren oder die Automatik aus ist", () => {
    const now = d("2026-11-10T09:00:00Z"); // 16.11. liegt noch in der Zukunft
    assert.deepEqual(plannedCycleStarts(events, "weekly", "dayOfMonth", cfg(), now), []);
    assert.deepEqual(plannedCycleStarts(events, "weekly", "dayOfMonth", cfg({ enabled: false }), d("2026-12-01T00:00:00Z")), []);
  });

  test("vergangene Lücken werden übersprungen, nicht nachträglich angelegt", () => {
    const now = d("2026-12-08T09:00:00Z");
    const r = plannedCycleStarts(events, "weekly", "dayOfMonth", cfg(), now);
    assert.deepEqual(r.map(x => x.toISOString()), ["2026-12-14T17:00:00.000Z"]);
  });

  test("Enddatum stoppt die Reihe", () => {
    const now = d("2026-11-17T09:00:00Z");
    assert.deepEqual(plannedCycleStarts(events, "weekly", "dayOfMonth", cfg({ aheadCount: 3, endsAt: "2026-11-29T23:00:00.000Z" }), now)
      .map(x => x.toISOString()), ["2026-11-23T17:00:00.000Z"]);
  });
});
