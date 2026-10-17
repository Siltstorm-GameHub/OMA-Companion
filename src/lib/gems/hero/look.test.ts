import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { STANDARD_CARDS } from "../../../../prisma/gems-seed-data";
import {
  basesForClass,
  classOfBase,
  defaultLook,
  effectiveHeroLook,
  heroLookForUnit,
  randomLook,
  sanitizeHeroLook,
  STANDARD_LOOKS,
} from "./look";

describe("Helden-Look", () => {
  test("Zufalls-Look ist stabil je Karte und passt zur Klasse", () => {
    assert.deepEqual(randomLook("karte-1", "SUPPORT"), randomLook("karte-1", "SUPPORT"));
    for (const cls of ["TANK", "DAMAGE_DEALER", "SUPPORT"] as const) {
      for (let i = 0; i < 30; i++) assert.equal(classOfBase(randomLook(`k${i}`, cls).base), cls);
    }
  });

  test("alle Standard-Karten haben einen festen, gültigen Look ihrer Klasse", () => {
    for (const card of STANDARD_CARDS) {
      const look = STANDARD_LOOKS[card.name];
      assert.ok(look, `Look für ${card.name}`);
      assert.deepEqual(sanitizeHeroLook(look, card.class), look, `${card.name} ist gültig`);
      assert.equal(classOfBase(look.base), card.class, `${card.name} passt zur Klasse`);
    }
  });

  test("ungültige Felder fallen einzeln zurück, fremde Grundfigur wird abgelehnt", () => {
    const fallback = defaultLook("TANK");
    const look = sanitizeHeroLook({ base: "dd-klinge", face: "staunend", skin: 99, hair: "gibts-nicht", scheme: "gold" }, "TANK", fallback);
    assert.equal(look.base, fallback.base);
    assert.equal(look.face, "staunend");
    assert.equal(look.skin, fallback.skin);
    assert.equal(look.hair, fallback.hair);
    assert.equal(look.scheme, "gold");
    assert.deepEqual(sanitizeHeroLook(null, "SUPPORT"), defaultLook("SUPPORT"));
    assert.ok(basesForClass("SUPPORT").includes(defaultLook("SUPPORT").base));
  });

  test("Karte: eigener Look vor Standard-Look vor Zufall", () => {
    const own = { ...defaultLook("SUPPORT"), face: "frech" };
    assert.equal(effectiveHeroLook({ id: "x", name: "Pflästerchen", rarity: "STANDARD", class: "SUPPORT", heroLook: own }).face, "frech");
    assert.deepEqual(effectiveHeroLook({ id: "x", name: "Pflästerchen", rarity: "STANDARD", class: "SUPPORT" }), STANDARD_LOOKS["Pflästerchen"]);
    assert.deepEqual(effectiveHeroLook({ id: "c1", name: "Mira", rarity: "COMMUNITY", class: "TANK" }), randomLook("c1", "TANK"));
  });

  test("Hintergrund: alte Looks ohne Feld bekommen den Standard, Zufalls-Looks nur freie", () => {
    const old = { ...defaultLook("TANK"), backdrop: undefined };
    assert.equal(sanitizeHeroLook(old, "TANK", { ...defaultLook("TANK"), backdrop: "berge" }).backdrop, "berge");
    assert.equal(sanitizeHeroLook({ ...defaultLook("TANK"), backdrop: "mond" }, "TANK").backdrop, "wiese");
    for (let i = 0; i < 30; i++) assert.ok(["wiese", "wald", "berge"].includes(randomLook(`k${i}`, "SUPPORT").backdrop));
  });

  test("alte Kämpfe: Look aus der Pixel-Figur ableiten, Monster bleiben ohne Look", () => {
    const unit = { cardId: "c1", name: "Mira", class: "TANK" as const, teCharacter: { v: 1 } };
    assert.deepEqual(heroLookForUnit(unit), randomLook("c1", "TANK"));
    assert.equal(heroLookForUnit({ cardId: "m1", name: "Lag-Spike", class: "DAMAGE_DEALER" }), null);
  });
});
