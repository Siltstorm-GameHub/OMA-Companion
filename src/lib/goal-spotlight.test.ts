import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { goalSpotlight, goalStreak } from "./goal-spotlight";

const H = 60 * 60 * 1000;
const D = 24 * H;
const start = new Date("2026-11-01T00:00:00Z");
const end = new Date(start.getTime() + 30 * D);
const at = (ms: number) => new Date(start.getTime() + ms);
const base = { startAt: start, endAt: end, percent: 40, reached: false, pace: null };

describe("Community-Ziel auf der Startseite", () => {
  test("die ersten 3 Tage groß, danach klein", () => {
    assert.equal(goalSpotlight({ ...base, now: at(2 * D) })?.kind, "start");
    assert.equal(goalSpotlight({ ...base, now: at(10 * D) }), null);
  });

  test("Meilenstein nur 24 Std. nach Erreichen", () => {
    const milestoneAt = { "25": at(5 * D).toISOString() };
    assert.equal(goalSpotlight({ ...base, milestoneAt, now: at(5 * D + 3 * H) })?.key, "m25");
    assert.equal(goalSpotlight({ ...base, milestoneAt, now: at(7 * D) }), null);
  });

  test("Endspurt nur, wenn das Ziel hinterherhängt", () => {
    const behind = { status: "behind" as const, label: "", expectedPercent: 90 };
    const onTrack = { status: "on_track" as const, label: "", expectedPercent: 90 };
    assert.equal(goalSpotlight({ ...base, pace: behind, now: at(27 * D) })?.kind, "final");
    assert.equal(goalSpotlight({ ...base, pace: onTrack, now: at(27 * D) }), null);
    assert.equal(goalSpotlight({ ...base, pace: behind, now: at(20 * D) }), null);
  });

  test("erreichtes Ziel bleibt 3 Tage groß, ohne Zeitstempel klein", () => {
    const reached = { ...base, percent: 100, reached: true, milestoneAt: { "100": at(10 * D).toISOString() } };
    assert.equal(goalSpotlight({ ...reached, now: at(11 * D) })?.kind, "reached");
    assert.equal(goalSpotlight({ ...reached, now: at(15 * D) }), null);
    assert.equal(goalSpotlight({ ...base, percent: 100, reached: true, now: at(15 * D) }), null);
  });

  test("kurze Events sind immer groß", () => {
    assert.equal(goalSpotlight({ ...base, endAt: at(4 * H), now: at(2 * H) })?.kind, "live");
  });

  test("Serie wird vom neuesten Termin aus gezählt", () => {
    assert.equal(goalStreak([true, false, true, true]), 2);
    assert.equal(goalStreak([true, true, false]), 0);
    assert.equal(goalStreak([]), 0);
  });
});
