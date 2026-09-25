import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, attackAnimFor, defaultPixelConfig, resolveLayers, sanitizePixelConfig, type PixelCharacterConfig } from "./index";

const withLayers = (layers: Record<string, string>): PixelCharacterConfig => ({ v: 1, layers: { ...defaultPixelConfig().layers, ...layers } });

describe("attackAnimFor", () => {
  test("Bogen → Fernkampf, Stab/Orb → Magie, Waffe/Schild → Nahkampf", () => {
    assert.equal(attackAnimFor(withLayers({ bow: "Bow_Simple" })), "ranged");
    assert.equal(attackAnimFor(withLayers({ staff: "Staff_Apprentice" })), "magic");
    assert.equal(attackAnimFor(withLayers({ artifact: CATALOG.categories.find((c) => c.id === "artifact")!.items[0].id })), "magic");
    assert.equal(attackAnimFor(withLayers({ weapon: "1H_Sword_Steel" })), "melee");
  });

  test("ohne Waffe entscheidet die Kartenklasse (Support = Magie, sonst Nahkampf)", () => {
    assert.equal(attackAnimFor(defaultPixelConfig(), "SUPPORT"), "magic");
    assert.equal(attackAnimFor(defaultPixelConfig(), "TANK"), "melee");
    assert.equal(attackAnimFor(defaultPixelConfig()), "melee");
  });
});

describe("resolveLayers", () => {
  test("Teile ohne Sheet für die Animation fehlen in dieser Pose (Bogen im Nahkampf)", () => {
    const cfg = withLayers({ bow: "Bow_Simple" });
    assert.ok(resolveLayers(cfg, "idle").some((l) => l.src.includes("/bow/")));
    assert.ok(!resolveLayers(cfg, "melee").some((l) => l.src.includes("/bow/")));
    assert.ok(resolveLayers(cfg, "ranged").some((l) => l.src.includes("/bow/")));
  });

  test("Schwert-Effekt läuft nur im Nahkampf und nur mit Waffe mit", () => {
    const armed = resolveLayers(withLayers({ weapon: "1H_Sword_Steel" }), "melee");
    assert.ok(armed.some((l) => l.src.includes("/fx/")));
    assert.ok(!resolveLayers(withLayers({ weapon: "1H_Sword_Steel" }), "idle").some((l) => l.src.includes("/fx/")));
    assert.ok(!resolveLayers(defaultPixelConfig(), "melee").some((l) => l.src.includes("/fx/")));
  });

  test("Ebenen sind von hinten nach vorn sortiert (Umhang-Rückseite vor Körper, Vorderseite danach)", () => {
    const cape = CATALOG.categories.find((c) => c.id === "cape")!.items[0].id;
    const layers = resolveLayers(withLayers({ cape }), "idle");
    const zs = layers.map((l) => l.z);
    assert.deepEqual(zs, [...zs].sort((a, b) => a - b));
    assert.ok(layers[0].src.includes(`/cape/${cape}/b-`));
  });

  test("jede Animation aus dem Katalog hat Base-Sheet und eine Bildanzahl", () => {
    for (const anim of CATALOG.base.anims) assert.ok(CATALOG.frames[anim] >= 4);
  });
});

describe("sanitizePixelConfig", () => {
  test("wirft unbekannte Teile raus und verlangt einen Körper", () => {
    assert.equal(sanitizePixelConfig({ layers: { hair: "Hair_Brown_1" } }), null);
    const ok = sanitizePixelConfig({ layers: { body: "Body_Skin_2", hair: "gibtsnicht", bow: "Bow_Simple" } });
    assert.deepEqual(ok?.layers, { body: "Body_Skin_2", bow: "Bow_Simple" });
  });
});
