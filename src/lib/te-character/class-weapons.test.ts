import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CLASS_WEAPONS, allowedWeapons, enforceWeapon, isWeaponAllowed, weaponItemId } from "./class-weapons";
import { TE_CATALOG, defaultTeConfig } from "./index";
import { DND_CLASSES } from "../dnd/classes";

const withWeapon = (variant?: string) => ({ ...defaultTeConfig(), layers: { ...defaultTeConfig().layers, ...(variant ? { weapon: variant } : {}) } });

describe("Waffen je Klasse", () => {
  test("jede Klasse hat Waffen, alle gibt es im Katalog", () => {
    const ids = new Set(TE_CATALOG.categories.find((c) => c.id === "weapon")!.items.map((i) => i.id));
    for (const c of DND_CLASSES) {
      assert.ok(CLASS_WEAPONS[c.id]?.length, c.id);
      for (const w of CLASS_WEAPONS[c.id]) assert.ok(ids.has(w), `${c.id}: ${w}`);
    }
  });
  test("Magier nur Stab, ohne Klasse keine Einschränkung, keine Waffe geht immer", () => {
    assert.deepEqual(allowedWeapons("magier"), ["wand1"]);
    assert.equal(allowedWeapons(null), null);
    assert.equal(isWeaponAllowed("magier", withWeapon("wand1")), true);
    assert.equal(isWeaponAllowed("magier", withWeapon("sword1")), false);
    assert.equal(isWeaponAllowed("magier", withWeapon()), true);
    assert.equal(isWeaponAllowed(null, withWeapon("sword1")), true);
    assert.equal(weaponItemId(withWeapon("sword1")), "sword1");
  });
  test("bisherige Waffe darf bleiben, Wechsel muss passen", () => {
    const old = withWeapon("sword1");
    assert.equal(isWeaponAllowed("magier", old, old), true);
    assert.equal(isWeaponAllowed("magier", withWeapon("axe1"), old), false);
    assert.equal(isWeaponAllowed("magier", withWeapon("wand1"), old), true);
  });
  test("enforceWeapon entfernt nur unpassende Waffen", () => {
    assert.equal(enforceWeapon(withWeapon("sword1"), "magier").layers.weapon, undefined);
    assert.equal(enforceWeapon(withWeapon("wand1"), "magier").layers.weapon, "wand1");
  });
});
