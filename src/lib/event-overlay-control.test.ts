import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { activeAnnouncement, applyEventControlPatch, parseEventOverlayControl } from "./event-overlay-control";
import { EMPTY_EVENT_CONTROL } from "@/components/overlay/types";

const NOW = 1_800_000_000_000;

describe("Event-Overlay-Steuerung", () => {
  test("altes JSON ohne Szene/Durchsage bleibt gültig", () => {
    assert.deepEqual(parseEventOverlayControl(JSON.stringify({ hidden: ["table", "quatsch"], zoom: "bracket" })),
      { hidden: ["table"], zoom: "bracket", scene: null, announcement: null });
    assert.deepEqual(parseEventOverlayControl("kaputt"), EMPTY_EVENT_CONTROL);
  });

  test("Patch ändert nur angegebene Felder", () => {
    const start = { ...EMPTY_EVENT_CONTROL, hidden: ["ticker" as const], zoom: "table" as const };
    const next = applyEventControlPatch(start, { scene: "pause" }, NOW);
    assert.deepEqual(next, { ...start, scene: "pause" });
    assert.equal(applyEventControlPatch(next, { scene: null }, NOW).scene, null);
  });

  test("Durchsage mit Dauer und Countdown, Text wird gekürzt", () => {
    const next = applyEventControlPatch(EMPTY_EVENT_CONTROL, { announcement: { text: "  Finale   in 5 Minuten ", durationSec: 300, countdown: true } }, NOW);
    assert.equal(next.announcement?.text, "Finale in 5 Minuten");
    assert.equal(next.announcement?.until, NOW + 300_000);
    assert.equal(next.announcement?.countdown, true);
    const long = applyEventControlPatch(EMPTY_EVENT_CONTROL, { announcement: { text: "x".repeat(500) } }, NOW);
    assert.equal(long.announcement?.text.length, 120);
    assert.equal(long.announcement?.until, null);
    assert.equal(long.announcement?.countdown, false, "ohne Dauer kein Countdown");
  });

  test("leerer Text oder null nimmt die Durchsage zurück, Ablauf zählt als keine", () => {
    const on = applyEventControlPatch(EMPTY_EVENT_CONTROL, { announcement: { text: "Hallo", durationSec: 10 } }, NOW);
    assert.equal(applyEventControlPatch(on, { announcement: null }, NOW).announcement, null);
    assert.equal(applyEventControlPatch(on, { announcement: { text: "   " } }, NOW).announcement, null);
    assert.ok(activeAnnouncement(on, NOW + 5_000));
    assert.equal(activeAnnouncement(on, NOW + 10_000), null);
    // Rundreise über JSON
    assert.deepEqual(parseEventOverlayControl(JSON.stringify(on)), on);
  });
});
