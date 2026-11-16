import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { daysSinceMonday, discordDailyMax, groupLedgerByDay, txCurrency, txLabel, txSource, weekSummary } from "./coin-ledger";

// Mo 16. Nov 2026, Mittag Berlin
const NOW = new Date("2026-11-16T12:00:00Z");

describe("Münzen-Verlauf: Texte", () => {
  test("Währung aus Präfix, Korrekturen mit Rang-Punkten zählen als Rang", () => {
    assert.equal(txCurrency("[Münzen] Stunde im Sprachkanal 🎙"), "coins");
    assert.equal(txCurrency("[Rang-Punkte] Poll-Sieger: Cup"), "rank");
    assert.equal(txCurrency("[Korrektur] Poll-Rang-Punkte: Cup"), "rank");
    assert.equal(txCurrency("[Korrektur] Poll-Gewinner: Cup"), "coins");
    assert.equal(txCurrency("🎯 Quest: 3 Events"), "coins");
  });

  test("Klartext ohne Präfix und Emojis", () => {
    assert.equal(txLabel("[Münzen] Stunde im Sprachkanal 🎙"), "Stunde im Sprachkanal");
    assert.equal(txLabel("[Münzen] 🛍️ Shop: Goldrand"), "Shop: Goldrand");
    assert.equal(txLabel("🎯 Quest: 3 Events"), "Quest: 3 Events");
    assert.equal(txLabel("Tages-Spin 🎰: 5 Münzen"), "Tages-Spin: 5 Münzen");
    assert.equal(txLabel("[Münzen] Stunde im Sprachkanal 🎙 🎂×2"), "Stunde im Sprachkanal (Geburtstag ×2)");
    assert.equal(txLabel("[Korrektur] Poll-Gewinner: Cup"), "Korrektur: Poll-Gewinner: Cup");
    assert.equal(txLabel("🎯 Korrektur: Sieger wurde neu ermittelt"), "Korrektur: Sieger wurde neu ermittelt");
  });

  test("Quelle", () => {
    assert.equal(txSource("[Münzen] 🛍️ Shop-Set: Phönix"), "shop");
    assert.equal(txSource("🎯 Quest: 3 Events"), "quests");
    assert.equal(txSource("Tages-Spin 🎰: 50 Münzen"), "spin");
    assert.equal(txSource("[Münzen] Clip des Monats Teilnahme – 10/2026"), "clips");
    assert.equal(txSource("[Münzen] 10 Nachrichten gesendet"), "discord");
    assert.equal(txSource("[Münzen] Profil: Bio ausgefüllt"), "profile");
    assert.equal(txSource("[Münzen] Umfrage Teilnahme: Cup"), "events");
    assert.equal(txSource("Admin-Gutschrift"), "other");
  });
});

describe("Münzen-Verlauf: Tage und Woche", () => {
  const txs = [
    { id: "a", amount: 60, reason: "🎯 Quest: 3 Events", createdAt: "2026-11-16T09:00:00Z" },
    { id: "b", amount: 15, reason: "[Münzen] Stunde im Sprachkanal 🎙", createdAt: "2026-11-16T10:00:00Z" },
    { id: "c", amount: -1200, reason: "[Münzen] 🛍️ Shop: Polarlicht", createdAt: "2026-11-14T18:00:00Z" },
    { id: "d", amount: 350, reason: "[Rang-Punkte] Platz 2: Cup", createdAt: "2026-11-14T20:00:00Z" },
    { id: "e", amount: 500, reason: "[Münzen] Profil: Bio ausgefüllt", createdAt: "2026-11-09T10:00:00Z" },
  ];

  test("Gruppierung nach Berliner Tagen mit Summen", () => {
    const days = groupLedgerByDay(txs, NOW);
    assert.deepEqual(days.map((d) => d.label.split(",")[0]), ["Heute", "Samstag", "Montag"]);
    assert.deepEqual([days[0].coinsIn, days[1].coinsOut, days[1].rank], [75, -1200, 350]);
    assert.deepEqual(days[0].items.map((i) => i.id), ["b", "a"]);
  });

  test("Filter nach Währung", () => {
    assert.deepEqual(groupLedgerByDay(txs, NOW, "rank").flatMap((d) => d.items.map((i) => i.id)), ["d"]);
  });

  test("Woche ab Montag, nur Münzen-Einnahmen", () => {
    assert.equal(daysSinceMonday(NOW), 0);
    assert.equal(daysSinceMonday(new Date("2026-11-15T12:00:00Z")), 6);
    assert.deepEqual(weekSummary(txs, NOW), { earned: 75, topSources: ["quests", "discord"] });
    // Sonntag: Woche reicht zurück bis Montag 9.11.
    assert.equal(weekSummary(txs, new Date("2026-11-15T12:00:00Z")).earned, 500);
  });

  test("Discord-Tagesmaximum aus Caps und Boni", () => {
    assert.equal(discordDailyMax(), 200);
  });
});
