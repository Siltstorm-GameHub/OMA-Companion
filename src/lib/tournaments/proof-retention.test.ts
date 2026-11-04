import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isProofExpired } from "./proof-retention";

const D = 24 * 60 * 60 * 1000;
const t = (day: number) => new Date(Date.UTC(2026, 10, 1) + day * D); // Tag 0 = 1. November

describe("Löschfrist für Nachweis-Screenshots", () => {
  test("kurzes Event: 14 Tage nach der letzten Änderung", () => {
    const ev = { startAt: t(0), endAt: t(0.2), phaseClosedAt: null };
    assert.equal(isProofExpired({ updatedAt: t(0) }, ev, t(13).getTime()), false);
    assert.equal(isProofExpired({ updatedAt: t(0) }, ev, t(15).getTime()), true);
  });

  test("Zeitraum-Event: 14 Tage erst ab Event-Ende", () => {
    const ev = { startAt: t(0), endAt: t(30), phaseClosedAt: null };
    assert.equal(isProofExpired({ updatedAt: t(1) }, ev, t(20).getTime()), false, "mitten im Event bleibt das Bild");
    assert.equal(isProofExpired({ updatedAt: t(1) }, ev, t(43).getTime()), false);
    assert.equal(isProofExpired({ updatedAt: t(1) }, ev, t(45).getTime()), true);
  });

  test("7 Tage nach Abschluss der Spielphase gilt immer", () => {
    const ev = { startAt: t(0), endAt: t(30), phaseClosedAt: t(31) };
    assert.equal(isProofExpired({ updatedAt: t(1) }, ev, t(37).getTime()), false);
    assert.equal(isProofExpired({ updatedAt: t(1) }, ev, t(39).getTime()), true);
  });
});
