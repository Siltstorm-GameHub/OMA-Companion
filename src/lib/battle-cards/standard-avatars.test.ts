import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { effectiveTeCharacter, STANDARD_AVATARS } from "./standard-avatars";
import { sanitizeTeConfig } from "../te-character";

describe("Karten-Figuren", () => {
  test("jede Karte hat eine gültige Figur, stabil je Karten-Id", () => {
    const c = { id: "abc123", name: "Irgendwer", rarity: "COMMUNITY", teCharacter: null };
    const a = effectiveTeCharacter(c);
    assert.ok(sanitizeTeConfig(a));
    assert.deepEqual(effectiveTeCharacter(c), a);
    assert.notDeepEqual(effectiveTeCharacter({ ...c, id: "zzz999" }), a);
  });
  test("eigene Figur hat Vorrang, Standard-Karten haben ihre feste", () => {
    const own = STANDARD_AVATARS["Scherbe"];
    assert.deepEqual(effectiveTeCharacter({ id: "x", name: "Mitglied", rarity: "COMMUNITY", teCharacter: own }), own);
    assert.deepEqual(effectiveTeCharacter({ id: "y", name: "Scherbe", rarity: "STANDARD", teCharacter: null }), own);
    for (const cfg of Object.values(STANDARD_AVATARS)) assert.ok(sanitizeTeConfig(cfg));
  });
});
