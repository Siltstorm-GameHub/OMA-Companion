import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { freeSlots, isSessionActive, makeSlug, sanitizeSessionTitle, SESSION_MAX_AGE_MS } from "./watch-session-rules";

const NOW = Date.parse("2026-10-23T20:00:00Z");

describe("Zusammen ansehen: Einladungs-Sessions", () => {
  test("aktiv bis beendet oder 12h alt", () => {
    assert.ok(isSessionActive({ endedAt: null, createdAt: new Date(NOW - 3600_000) }, NOW));
    assert.ok(!isSessionActive({ endedAt: new Date(NOW - 1000), createdAt: new Date(NOW - 3600_000) }, NOW));
    assert.ok(!isSessionActive({ endedAt: null, createdAt: new Date(NOW - SESSION_MAX_AGE_MS - 1) }, NOW));
  });

  test("höchstens 4 Streams: abgelehnte belegen keinen Platz", () => {
    assert.equal(freeSlots([{ status: "accepted" }]), 3);
    assert.equal(freeSlots([{ status: "accepted" }, { status: "invited" }, { status: "declined" }]), 2);
    assert.equal(freeSlots([{ status: "accepted" }, { status: "accepted" }, { status: "invited" }, { status: "invited" }]), 0);
  });

  test("Link-Teil: kurz, eindeutig lesbar, verschieden", () => {
    const a = makeSlug(), b = makeSlug();
    assert.match(a, /^[a-hjkmnp-z2-9]{8}$/);
    assert.notEqual(a, b);
  });

  test("Titel: Leerzeichen zusammengefasst, Länge begrenzt, leer = keiner", () => {
    assert.equal(sanitizeSessionTitle("  Rocket   League 2v2 "), "Rocket League 2v2");
    assert.equal(sanitizeSessionTitle("x".repeat(100))!.length, 60);
    assert.equal(sanitizeSessionTitle("   "), null);
    assert.equal(sanitizeSessionTitle(42), null);
  });
});
