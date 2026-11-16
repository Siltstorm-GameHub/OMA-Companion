import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { coinsAwarded, isLate, notableKind, notableTransactions, pulse, sinceLabel } from "./admin-overview";

const NOW = new Date("2026-11-16T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const H = 3_600_000;

describe("Admin-Übersicht", () => {
  test("Wartezeit lesbar", () => {
    assert.equal(sinceLabel(ago(20 * 60_000), NOW), "seit 20 Min");
    assert.equal(sinceLabel(ago(10_000), NOW), "seit 1 Min");
    assert.equal(sinceLabel(ago(5 * H), NOW), "seit 5 Std");
    assert.equal(sinceLabel(ago(30 * H), NOW), "seit 1 Tag");
    assert.equal(sinceLabel(ago(80 * H), NOW), "seit 3 Tagen");
  });

  test("überfällig ab 2 Tagen", () => {
    assert.equal(isLate(ago(47 * H), NOW), false);
    assert.equal(isLate(ago(48 * H), NOW), true);
  });

  test("auffällige Buchungen", () => {
    assert.equal(notableKind({ amount: 50, reason: "⚙️ Admin-Korrektur (Münzen)" }), "manuell");
    assert.equal(notableKind({ amount: -500, reason: "[Korrektur] Poll-Gewinner: Cup" }), "korrektur");
    assert.equal(notableKind({ amount: -30, reason: "🎯 Korrektur: Sieger wurde neu ermittelt" }), "korrektur");
    assert.equal(notableKind({ amount: 1000, reason: "[Münzen] Platz 1: Cup" }), "gross");
    assert.equal(notableKind({ amount: -1500, reason: "[Münzen] 🛍️ Shop: Polarlicht" }), null);
    assert.equal(notableKind({ amount: 2000, reason: "[Rang-Punkte] Platz 1: Cup" }), null);
    assert.equal(notableKind({ amount: 80, reason: "[Münzen] Event besucht" }), null);
  });

  test("Liste der auffälligen Buchungen mit Klartext und Limit", () => {
    const user = { id: "u1", name: "Anna", username: null };
    const txs = [
      { id: "a", amount: 80, reason: "[Münzen] Event besucht", createdAt: NOW, user },
      { id: "b", amount: 2000, reason: "⚙️ Turnierpreis nachgetragen", createdAt: NOW, user },
      { id: "c", amount: -500, reason: "[Korrektur] Poll-Gewinner: Cup", createdAt: NOW, user },
    ];
    const list = notableTransactions(txs);
    assert.deepEqual(list.map((t) => [t.id, t.kind, t.label]), [["b", "manuell", "Turnierpreis nachgetragen"], ["c", "korrektur", "Korrektur: Poll-Gewinner: Cup"]]);
    assert.equal(list[0].userName, "Anna");
    assert.equal(notableTransactions(txs, 1).length, 1);
  });

  test("Puls und vergebene Münzen", () => {
    assert.deepEqual(pulse(48, 42), { value: 48, delta: 6 });
    assert.equal(coinsAwarded([
      { amount: 80, reason: "[Münzen] Event besucht" },
      { amount: 3, reason: "[Rang-Punkte] Platz 2" },
      { amount: -1200, reason: "[Münzen] 🛍️ Shop: X" },
      { amount: 60, reason: "🎯 Quest: 3 Events" },
    ]), 140);
  });
});
