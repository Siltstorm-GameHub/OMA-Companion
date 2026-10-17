import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  coinPrice,
  cosmeticItemId,
  cosmeticsUnlockedBy,
  earnedCosmetics,
  isAvailable,
  unavailableParts,
  unlockFor,
  unlockLabel,
} from "./cosmetics";
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

  test("erspielte Teile aus Rang, Wächtern und Saison", () => {
    const nothing = { maxCardRank: 0, guardianStages: new Set<number>(), bestSeasonPlace: null };
    assert.deepEqual(earnedCosmetics(nothing), []);
    const strong = { maxCardRank: 5, guardianStages: new Set([20, 30]), bestSeasonPlace: 1 };
    assert.deepEqual(
      new Set(earnedCosmetics(strong)),
      new Set(["scheme:glut", "scheme:gold", "emblem:stern", "emblem:krone", "accessory:umhang", "pose:jubel"])
    );
    const top10 = earnedCosmetics({ maxCardRank: 3, guardianStages: new Set([20]), bestSeasonPlace: 7 });
    assert.ok(top10.includes("scheme:gold") && !top10.includes("emblem:krone") && !top10.includes("pose:jubel"));
  });

  test("Kartenhintergründe: drei frei, Vulkan über Turmwächter 40", () => {
    assert.equal(unlockFor("backdrop", "wald", "SUPPORT").kind, "free");
    assert.equal(coinPrice("backdrop:burg"), 700);
    assert.equal(unlockLabel(unlockFor("backdrop", "vulkan", "TANK")), "Turmwächter 40");
    assert.ok(earnedCosmetics({ maxCardRank: 0, guardianStages: new Set([40]), bestSeasonPlace: null }).includes("backdrop:vulkan"));
    assert.deepEqual(cosmeticsUnlockedBy({ guardianStage: 40 }).map((u) => u.label), ["Hintergrund Vulkan"]);
    assert.deepEqual(unavailableParts({ ...defaultLook("TANK"), backdrop: "nacht" }, "TANK", none), ["backdrop:nacht"]);
  });

  test("Preise nur für kaufbare Teile", () => {
    assert.equal(coinPrice("accessory:headset"), 1200);
    assert.equal(coinPrice("accessory:umhang"), null);
    assert.equal(coinPrice("scheme:tuerkis"), null);
    assert.equal(coinPrice("gibt:es-nicht"), null);
  });

  test("welcher Erfolg was freischaltet", () => {
    assert.deepEqual(cosmeticsUnlockedBy({ rankReached: 3 }).map((u) => u.itemId), ["emblem:stern"]);
    assert.deepEqual(cosmeticsUnlockedBy({ rankReached: 2 }), []);
    assert.deepEqual(cosmeticsUnlockedBy({ guardianStage: 20 }).map((u) => u.label), ["Accessoire Umhang"]);
  });
});
