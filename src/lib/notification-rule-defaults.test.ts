import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_PERSONAL_RULES, defaultRule } from "./notification-rule-defaults";
import { PREF_KEY, prefAllows } from "./notifications";

describe("Standard-Regeln der Event-Meldungen", () => {
  test("Schlüssel sind eindeutig und auffindbar", () => {
    const keys = EVENT_PERSONAL_RULES.map(r => r.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const k of keys) assert.equal(defaultRule(k)?.key, k);
    assert.equal(defaultRule("gibt_es_nicht"), null);
  });

  test("Jede Regel nennt den Event-Namen und hat Titel und Text", () => {
    for (const r of EVENT_PERSONAL_RULES) {
      assert.ok(r.titleTemplate.includes("{eventName}"), r.key);
      assert.ok(r.bodyTemplate.length > 0, r.key);
    }
  });
});

describe("Schalter Meine Events / Neue Events", () => {
  test("getrennte Präferenzen", () => {
    assert.equal(PREF_KEY.event_personal, "myEvent");
    assert.equal(PREF_KEY.event_start, "event");
  });
  test("Ankündigungen aus, eigene Events weiter an", () => {
    const prefs = JSON.stringify({ event: false });
    assert.equal(prefAllows(prefs, "event_start"), false);
    assert.equal(prefAllows(prefs, "event_personal"), true);
    assert.equal(prefAllows(JSON.stringify({ myEvent: false }), "event_personal"), false);
    assert.equal(prefAllows(null, "event_personal"), true);
  });
});
