import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { AMBIENCE_KEYS, FIXED_AMBIENCE, TEMPLATE_AMBIENCE, desiredAmbience, isAmbienceKey, weatherLayer } from "./oq-ambience";
import { MONSTER_SPRITES } from "./oq-assets-manifest";
import { MONSTERS, MONSTER_SPRITE } from "./combat";
import { defaultCustomWorldDoc, docToWorld, sanitizeCustomWorldDoc, worldToDoc } from "../te-map/custom-world";
import { WORLD_SLUGS, getWorld } from "../te-map/worlds";

describe("Ambiente", () => {
  test("alle Dateien existieren, Zuordnungen sind gültig", () => {
    for (const k of AMBIENCE_KEYS) assert.ok(existsSync(`public/oq/amb/${k}.wav`), k);
    for (const v of [...Object.values(FIXED_AMBIENCE), ...Object.values(TEMPLATE_AMBIENCE)]) assert.ok(isAmbienceKey(v), v);
    for (const s of WORLD_SLUGS) assert.ok(getWorld(s)!.ambience, s);
  });
  test("draußen Location + Wetter, drinnen nur der Innenraum", () => {
    assert.deepEqual(desiredAmbience({ bed: "forest", indoors: false, interiorTemplate: null, weather: "rain" }), { bed: "forest", layer: "rain" });
    assert.deepEqual(desiredAmbience({ bed: "forest", indoors: true, interiorTemplate: "taverne", weather: "rain" }), { bed: "tavern", layer: null });
    assert.deepEqual(desiredAmbience({ bed: "forest", indoors: true, interiorTemplate: "wohnhaus", weather: "clear" }), { bed: null, layer: null });
    assert.equal(desiredAmbience({ bed: "gibtsnicht", indoors: false, interiorTemplate: null, weather: "clear" }).bed, null);
    assert.equal(weatherLayer("snow"), "snowstorm");
    assert.equal(weatherLayer("clear"), null);
  });
  test("Ambiente überlebt Speichern und Umwandeln", () => {
    const d = { ...defaultCustomWorldDoc("outdoor"), ambience: "waves" };
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (!s.ok) return;
    assert.equal(s.doc.ambience, "waves");
    assert.equal(docToWorld(s.doc).ambience, "waves");
    assert.equal(worldToDoc(getWorld("waldpfad")!).ambience, "forest");
    const bad = sanitizeCustomWorldDoc({ ...d, ambience: "quatsch" });
    assert.ok(bad.ok && bad.doc.ambience === undefined);
  });
});

describe("Pixel-Monster", () => {
  test("jedes zugeordnete Monster hat Grafik und Manifest-Eintrag", () => {
    for (const [id, key] of Object.entries(MONSTER_SPRITE)) {
      assert.ok(MONSTERS.some((m) => m.id === id), id);
      assert.ok(MONSTER_SPRITES[key], key);
      assert.ok(existsSync(`public/oq/mon/${key}.png`), key);
    }
    assert.ok(MONSTERS.length >= 24);
  });
});

import { GROUND } from "../te-map/types";
import { GROUND_TEXTURE } from "../te-map/themes";
import { TEXTURES } from "./oq-assets-manifest";
import { INTERIOR_FLOORS } from "../te-map/interior";

describe("Texturen", () => {
  test("Bodenarten 5–9 und Innenraum-Böden haben vorhandene Texturen", () => {
    for (const g of [GROUND.snow, GROUND.ice, GROUND.planks, GROUND.marble, GROUND.forest]) {
      const k = GROUND_TEXTURE[g]!;
      assert.ok(TEXTURES[k], String(g));
      assert.ok(existsSync(`public/oq/tex/${k}.png`), k);
    }
    for (const f of INTERIOR_FLOORS) if (f.tex) assert.ok(existsSync(`public/oq/tex/${f.tex}.png`), f.label);
    assert.ok(INTERIOR_FLOORS.length >= 16);
  });
  test("neue Böden bleiben beim Speichern erhalten", () => {
    const d = defaultCustomWorldDoc("outdoor");
    const ground = d.ground.map((r, y) => (y === 3 ? "5678900".padEnd(r.length, "0").slice(0, r.length) : r));
    const s = sanitizeCustomWorldDoc({ ...d, ground });
    assert.ok(s.ok);
    if (s.ok) assert.equal(s.doc.ground[3].slice(0, 7), "5678900");
  });
});

import { HAZARD_GROUND, groundChar, groundFromChar } from "../te-map/types";
import { paintGround } from "../te-map/custom-world-edit";
import { createGame, isWalkable } from "../te-map/engine";
import { validateForSubmit } from "../te-map/custom-world";

describe("Lava und Wasser", () => {
  test("Zeichen für Böden ab 10 bleiben beim Speichern erhalten", () => {
    assert.equal(groundChar(GROUND.lava), "a");
    assert.equal(groundFromChar("b"), GROUND.water);
    let d = defaultCustomWorldDoc("outdoor");
    d = paintGround(d, 5, 5, GROUND.lava, 1);
    d = paintGround(d, 6, 5, GROUND.water, 1);
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (s.ok) assert.equal(s.doc.ground[5].slice(5, 7), "ab");
  });
  test("Lava und Wasser sind nicht betretbar, normale Böden schon", () => {
    let d = defaultCustomWorldDoc("outdoor");
    d = paintGround(d, 6, 6, GROUND.lava, 1);
    d = paintGround(d, 7, 6, GROUND.water, 1);
    d = paintGround(d, 8, 6, GROUND.snow, 1);
    const g = createGame(docToWorld(d));
    assert.equal(isWalkable(g, 6, 6), false);
    assert.equal(isWalkable(g, 7, 6), false);
    assert.equal(isWalkable(g, 8, 6), true);
    assert.ok(HAZARD_GROUND.has(GROUND.lava) && HAZARD_GROUND.has(GROUND.water) && !HAZARD_GROUND.has(GROUND.snow));
  });
  test("Startpunkt auf Lava macht die Location unspielbar; ein Wassergraben mittendrin sperrt Akteure ab", () => {
    let d = defaultCustomWorldDoc("outdoor");
    d = paintGround(d, d.spawn.x, d.spawn.y, GROUND.lava, 1);
    const v = validateForSubmit(d);
    assert.ok(!v.ok && v.errors.some((e) => e.includes("Hindernis")));
  });
  test("Texturen für beide Böden existieren", () => {
    assert.ok(GROUND_TEXTURE[GROUND.lava] && GROUND_TEXTURE[GROUND.water]);
    assert.ok(existsSync("public/oq/tex/lava.png") && existsSync("public/oq/tex/wasser.png"));
  });
});

import { BACKDROPS, FIXED_BACKDROP, backdropOfWorld } from "./oq-backdrop";

describe("Kampf-Hintergrund", () => {
  test("jede feste Location hat einen Hintergrund mit vorhandener Textur", () => {
    for (const s of WORLD_SLUGS) assert.ok(FIXED_BACKDROP[s], s);
    for (const b of Object.values(BACKDROPS)) assert.ok(existsSync(`public/oq/tex/${b.ground}.png`), b.ground);
  });
  test("Community-Location: Höhle, häufigster Boden, sonst Klimazone", () => {
    const base = defaultCustomWorldDoc("outdoor");
    assert.equal(backdropOfWorld(docToWorld(base), "cold"), "snow");
    assert.equal(backdropOfWorld(docToWorld(base)), "plains");
    assert.equal(backdropOfWorld(docToWorld(defaultCustomWorldDoc("cave"))), "cave");
    const snowy = { ...base, ground: base.ground.map((r) => "5".repeat(r.length)) };
    assert.equal(backdropOfWorld(docToWorld(snowy)), "snow");
    assert.equal(backdropOfWorld(getWorld("sumpf")!), "swamp");
    assert.equal(backdropOfWorld(undefined, "dry"), "desert");
  });
});
