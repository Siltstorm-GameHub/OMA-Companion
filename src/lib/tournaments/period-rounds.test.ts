import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { shouldAutoStartRound } from "./period-rounds";

const D = 24 * 60 * 60 * 1000;
const start = new Date(Date.UTC(2026, 10, 1, 10));
const base = { format: "coop_stats", status: "open", startAt: start, endAt: new Date(start.getTime() + 30 * D), matchCount: 0 };
const during = new Date(start.getTime() + D);

describe("Zeitraum-Events: Runde 1 automatisch", () => {
  test("startet ab dem Starttermin, solange es keine Runde gibt", () => {
    assert.equal(shouldAutoStartRound(base, during), true);
    assert.equal(shouldAutoStartRound({ ...base, format: "avg_stats", status: "active" }, during), true);
    assert.equal(shouldAutoStartRound(base, new Date(start.getTime() - 1000)), false, "vor dem Start");
    assert.equal(shouldAutoStartRound({ ...base, matchCount: 1 }, during), false, "Runde existiert schon");
  });

  test("nur Zeitraum-Events in Punktewertung/Durchschnittswerten, nicht beendet", () => {
    assert.equal(shouldAutoStartRound({ ...base, format: "single_elimination" }, during), false);
    assert.equal(shouldAutoStartRound({ ...base, endAt: new Date(start.getTime() + 3 * 60 * 60 * 1000) }, during), false);
    assert.equal(shouldAutoStartRound({ ...base, status: "finished" }, during), false);
    assert.equal(shouldAutoStartRound(base, new Date(start.getTime() + 31 * D)), false, "nach dem Ende");
  });
});
