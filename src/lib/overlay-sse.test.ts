import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPollMs, IDLE_AFTER_MS } from "./overlay-sse";

test("nextPollMs: schnell direkt nach einer Änderung", () => {
  assert.equal(nextPollMs({ fast: 1500, idle: 6000 }, 0, null), 1500);
  assert.equal(nextPollMs({ fast: 1500, idle: 6000 }, IDLE_AFTER_MS - 1, null), 1500);
});

test("nextPollMs: langsam nach Ruhe und ohne jede Änderung seit Verbindungsaufbau", () => {
  assert.equal(nextPollMs({ fast: 1500, idle: 6000 }, IDLE_AFTER_MS, null), 6000);
  assert.equal(nextPollMs({ fast: 1500, idle: 6000 }, Infinity, null), 6000);
});

test("nextPollMs: idle darf vom letzten Stand abhängen", () => {
  const pacing = { fast: 1500, idle: (last: unknown) => ((last as { mode?: string } | null)?.mode === "event" ? 3000 : 6000) };
  assert.equal(nextPollMs(pacing, Infinity, { mode: "event" }), 3000);
  assert.equal(nextPollMs(pacing, Infinity, { mode: "profile" }), 6000);
  assert.equal(nextPollMs(pacing, Infinity, null), 6000);
});
