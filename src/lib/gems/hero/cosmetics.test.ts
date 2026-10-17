import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cosmeticItemId, isAvailable, unavailableParts, unlockFor, unlockLabel } from "./cosmetics";
import { defaultLook, randomLook, type HeroClass } from "./look";

const CLASSES: HeroClass[] = ["TANK", "DAMAGE_DEALER", "SUPPORT"];
const none = new Set<string>();

describe("Kosmetik für Mein Held", () => {
  test("automatische Looks bestehen nur aus freien Teilen — jedes Mitglied kann seinen Start-Look speichern", () => {
    for (const cls of CLASSES) {
      assert.deepEqual(unavailableParts(defaultLook(cls), cls, none), [], `Grund-Look ${cls}`);
      for (let i = 0; i < 50; i++) {
        assert.deepEqual(unavailableParts(randomLook(`karte-${i}`, cls), cls, none), [], `Zufalls-Look ${cls} ${i}`);
      }
    }
  });

  test("Klassenfarbe und zwei Kopfbedeckungen sind je Klasse frei", () => {
    assert.equal(unlockFor("scheme", "rot", "DAMAGE_DEALER").kind, "free");
    assert.equal(unlockFor("scheme", "rot", "TANK").kind, "coins");
    assert.equal(unlockFor("headgear", "helm", "TANK").kind, "free");
    assert.equal(unlockFor("headgear", "helm", "SUPPORT").kind, "coins");
  });

  test("gesperrt, bis freigeschaltet", () => {
    assert.equal(isAvailable("accessory", "umhang", "TANK", none), false);
    assert.equal(isAvailable("accessory", "umhang", "TANK", new Set([cosmeticItemId("accessory", "umhang")])), true);
    const look = { ...defaultLook("TANK"), scheme: "gold", pose: "jubel" };
    assert.deepEqual(unavailableParts(look, "TANK", none), ["scheme:gold", "pose:jubel"]);
  });

  test("fremde Grundfigur wird abgelehnt", () => {
    assert.deepEqual(unavailableParts({ ...defaultLook("TANK"), base: "dd-klinge" }, "TANK", none), ["base:dd-klinge"]);
  });

  test("Texte für die Freischaltung", () => {
    assert.equal(unlockLabel(unlockFor("accessory", "headset", "TANK")), "1200 Münzen");
    assert.equal(unlockLabel(unlockFor("accessory", "umhang", "TANK")), "Turmwächter 20");
    assert.equal(unlockLabel(unlockFor("pose", "jubel", "TANK")), "Karte auf Rang 5");
    assert.equal(unlockLabel(unlockFor("scheme", "gold", "TANK")), "Saison Top 10");
  });
});
