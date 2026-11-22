import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SECTION_ORDER, isPrePhase, pagePhaseOf } from "./event-page-layout";

const NOW = "2026-11-22T18:00:00Z";

describe("Phase der Eventseite", () => {
  test("ausgelost vor dem Start ist nicht live", () => {
    assert.equal(pagePhaseOf({ status: "active", startAt: "2026-11-22T19:00:00Z", gamePhaseComplete: false }, NOW), "drawn");
    assert.equal(pagePhaseOf({ status: "active", startAt: "2026-11-22T17:00:00Z", gamePhaseComplete: false }, NOW), "live");
  });
  test("übrige Phasen", () => {
    assert.equal(pagePhaseOf({ status: "open", startAt: NOW, gamePhaseComplete: false }, NOW), "before");
    assert.equal(pagePhaseOf({ status: "active", startAt: NOW, gamePhaseComplete: true }, NOW), "voting");
    assert.equal(pagePhaseOf({ status: "umfrage", startAt: NOW, gamePhaseComplete: false }, NOW), "voting");
    assert.equal(pagePhaseOf({ status: "finished", startAt: NOW, gamePhaseComplete: true }, NOW), "after");
    assert.ok(isPrePhase("drawn") && isPrePhase("before") && !isPrePhase("live"));
  });
});

describe("Reihenfolge", () => {
  test("live und ausgelost: dein Match zuerst", () => {
    assert.equal(SECTION_ORDER.live[0], "myMatch");
    assert.equal(SECTION_ORDER.drawn[0], "myMatch");
    assert.ok(SECTION_ORDER.live.indexOf("tournament") < SECTION_ORDER.live.indexOf("stream"));
  });
  test("vor dem Start: Regeln direkt nach der Beschreibung", () => {
    const b = SECTION_ORDER.before;
    assert.equal(b.indexOf("rules"), b.indexOf("description") + 1);
  });
  test("danach: dein Ergebnis zuerst; kein Abschnitt doppelt", () => {
    assert.equal(SECTION_ORDER.after[0], "myResult");
    for (const keys of Object.values(SECTION_ORDER)) assert.equal(new Set(keys).size, keys.length);
  });
});
