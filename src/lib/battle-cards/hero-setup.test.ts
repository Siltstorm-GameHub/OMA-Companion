import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { heroStepOf, requiredPackRoles } from "./hero-setup";
import { missingPackRoles } from "./starter-pick";
import { DND_CLASSES } from "../dnd/classes";
import { DND_CLASS_TO_CARD_CLASS, mapDndClassToCardClass } from "../dnd/class-mapping";
import { defaultTeConfig } from "../te-character";

describe("Helden-Einrichtung: Schritt aus dem Kartenzustand", () => {
  const look = defaultTeConfig();
  const at = new Date();
  test("ohne Charakter → look; danach class → pack → done", () => {
    assert.equal(heroStepOf({ teCharacter: null, heroRolledAt: null, heroPackAt: null }), "look");
    assert.equal(heroStepOf({ teCharacter: look as never, heroRolledAt: null, heroPackAt: null }), "class");
    assert.equal(heroStepOf({ teCharacter: look as never, heroRolledAt: at, heroPackAt: null }), "pack");
    assert.equal(heroStepOf({ teCharacter: look as never, heroRolledAt: at, heroPackAt: at }), "done");
  });

  test("ein ungültiger Charakter zählt nicht als gestaltet", () => {
    assert.equal(heroStepOf({ teCharacter: { v: 1, skin: 0, layers: {} } as never, heroRolledAt: at, heroPackAt: at }), "look");
  });
});

describe("Start-Pack um den Helden", () => {
  test("die beiden anderen Rollen sind Pflicht", () => {
    assert.deepEqual(requiredPackRoles("TANK"), ["DAMAGE_DEALER", "SUPPORT"]);
    assert.deepEqual(requiredPackRoles("SUPPORT"), ["TANK", "DAMAGE_DEALER"]);
  });

  test("fehlende Rollen werden erkannt; Held-Rolle darf im Pack fehlen", () => {
    assert.deepEqual(missingPackRoles("TANK", ["DAMAGE_DEALER", "DAMAGE_DEALER", "DAMAGE_DEALER", "TANK"]), ["SUPPORT"]);
    assert.deepEqual(missingPackRoles("TANK", ["DAMAGE_DEALER", "SUPPORT", "SUPPORT", "SUPPORT"]), []);
  });
});

describe("Klassen → Kampfrollen", () => {
  test("jede Klasse ist zugeordnet, jede Rolle hat mindestens zwei Klassen", () => {
    for (const c of DND_CLASSES) assert.ok(DND_CLASS_TO_CARD_CLASS[c.id], `${c.id} fehlt im Mapping`);
    const count = (role: string) => DND_CLASSES.filter((c) => mapDndClassToCardClass(c.id) === role).length;
    assert.ok(count("TANK") >= 2 && count("DAMAGE_DEALER") >= 2 && count("SUPPORT") >= 2);
    assert.equal(mapDndClassToCardClass("paladin"), "TANK");
  });
});
