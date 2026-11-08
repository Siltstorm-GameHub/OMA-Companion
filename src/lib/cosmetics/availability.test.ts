import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { COSMETICS, COSMETIC_SETS, getCosmetic, isSeasonActive, isoWeekKey, weekEnd } from "./catalog";
import { DEFAULT_SETTINGS, computeAvailability } from "./availability";

// 12:00 UTC = 13:00/14:00 Berliner Zeit — weit weg von Tagesgrenzen
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("Katalog", () => {
  test("IDs sind eindeutig", () => {
    const ids = COSMETICS.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  test("Sets verweisen nur auf existierende, käufliche Artikel", () => {
    for (const s of COSMETIC_SETS) {
      for (const id of s.items) {
        const c = getCosmetic(id);
        assert.ok(c, `${s.id}: ${id} fehlt`);
        assert.notEqual(c!.defaultPrice, null, `${s.id}: ${id} ist nicht käuflich`);
        assert.ok(!c!.season && !c!.rotationOnly, `${s.id}: ${id} ist zeitlich begrenzt`);
      }
    }
  });
});

describe("Saisons", () => {
  test("Zeitfenster inklusive Grenzen", () => {
    assert.equal(isSeasonActive("halloween", at("2026-10-15")), true);
    assert.equal(isSeasonActive("halloween", at("2026-11-05")), true);
    assert.equal(isSeasonActive("halloween", at("2026-11-06")), false);
  });
  test("Silvester läuft über den Jahreswechsel", () => {
    assert.equal(isSeasonActive("newyear", at("2026-12-31")), true);
    assert.equal(isSeasonActive("newyear", at("2027-01-06")), true);
    assert.equal(isSeasonActive("newyear", at("2027-01-07")), false);
    assert.equal(isSeasonActive("newyear", at("2026-12-26")), false);
  });
  test("Saison-Artikel nur im Fenster kaufbar", () => {
    const avail = (d: string) => computeAvailability({}, DEFAULT_SETTINGS, at(d)).get("frame:pumpkin")!;
    assert.equal(avail("2026-10-20").buyable, true);
    assert.equal(avail("2026-12-20").buyable, false);
    assert.equal(avail("2026-12-20").visible, false);
  });
});

describe("Wochen-Rotation", () => {
  test("ISO-Woche wechselt montags", () => {
    assert.equal(isoWeekKey(at("2026-11-08")), "2026-W45"); // Sonntag
    assert.equal(isoWeekKey(at("2026-11-09")), "2026-W46"); // Montag
    assert.equal(isoWeekKey(at("2027-01-01")), "2026-W53");
  });
  test("Wochenende liegt auf dem nächsten Montag", () => {
    const end = weekEnd(at("2026-11-05")); // Donnerstag
    assert.ok(end > at("2026-11-08") && end < at("2026-11-09"));
  });
  test("gleiche Woche → gleiche Angebote, korrekter Rabatt", () => {
    const a = computeAvailability({}, DEFAULT_SETTINGS, at("2026-11-03"));
    const b = computeAvailability({}, DEFAULT_SETTINGS, at("2026-11-07"));
    const offers = (m: typeof a) => [...m.values()].filter(x => x.tag === "offer").map(x => x.id).sort();
    assert.deepEqual(offers(a), offers(b));
    assert.equal(offers(a).length, DEFAULT_SETTINGS.weeklyCount);
    for (const id of offers(a)) {
      const x = a.get(id)!;
      assert.equal(x.price, Math.round(x.basePrice! * (100 - DEFAULT_SETTINGS.weeklyDiscountPct) / 100));
    }
  });
  test("genau die eingestellte Zahl Exklusiv-Artikel ist kaufbar", () => {
    const a = computeAvailability({}, { ...DEFAULT_SETTINGS, exclusiveCount: 2 }, at("2026-11-03"));
    assert.equal([...a.values()].filter(x => x.tag === "exclusive" && x.buyable).length, 2);
  });
  test("deaktivierte Artikel kommen nicht ins Angebot", () => {
    const config = Object.fromEntries(COSMETICS.filter(c => c.id !== "frame:steel").map(c => [c.id, { enabled: false }]));
    const a = computeAvailability(config, DEFAULT_SETTINGS, at("2026-11-03"));
    const offers = [...a.values()].filter(x => x.tag === "offer");
    assert.deepEqual(offers.map(x => x.id), ["frame:steel"]);
  });
  test("Admin-Preis wird übernommen", () => {
    const a = computeAvailability({ "title:newbie": { price: 50 } }, { ...DEFAULT_SETTINGS, weeklyEnabled: false }, at("2026-11-03"));
    assert.equal(a.get("title:newbie")!.price, 50);
  });
});
