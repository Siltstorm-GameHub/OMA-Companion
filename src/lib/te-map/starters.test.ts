import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkPlayable, sanitizeCustomWorldDoc, validateForSubmit } from "./custom-world";
import { canPlaceBuilding, duplicateSelection, fillGround, moveBuilding, rectGround } from "./custom-world-edit";
import { starterDoc, STARTERS } from "./starters";
import { GROUND } from "./types";

describe("Startvorlagen", () => {
  for (const s of STARTERS) {
    it(`${s.id} ist spielbar und gültig`, () => {
      const d = starterDoc(s.id, s.theme);
      assert.deepEqual(checkPlayable(d), []);
      const v = sanitizeCustomWorldDoc(JSON.parse(JSON.stringify(d)));
      assert.ok(v.ok);
      if (v.ok) assert.deepEqual(v.warnings, []);
      assert.ok(validateForSubmit(d).ok);
    });
  }
});

describe("Editor-Operationen", () => {
  const d = starterDoc("dorf");
  it("Häuser überlappen nicht und lassen sich verschieben", () => {
    assert.equal(canPlaceBuilding(d, { ...d.buildings[0], x: d.buildings[1].x, y: d.buildings[1].y }, 0), false);
    assert.equal(moveBuilding(d, 0, 1, 1).buildings[0].x, 1);
    assert.equal(moveBuilding(d, 0, -3, 1), d);
  });
  it("Duplikate: Haus ohne Innenraum, Objekt versetzt", () => {
    const h = duplicateSelection(d, { type: "building", index: 0 });
    assert.ok(h && h.doc.buildings[h.index].interior === undefined);
    const s = duplicateSelection(d, { type: "stamp", index: 0 });
    assert.ok(s && s.doc.stamps.length === d.stamps.length + 1);
  });
  it("Eimer und Rechteck", () => {
    const f = fillGround(starterDoc("leer"), 3, 3, GROUND.sand);
    assert.ok(f.ground.every((r) => r === "4".repeat(r.length)) || f.ground[0][0] !== "0");
    const r = rectGround(starterDoc("leer"), 2, 2, 3, 3, GROUND.sand);
    assert.equal(r.ground[2].slice(2, 4), "44");
  });
});

describe("Objekte mit Interaktionstext", () => {
  it("werden zu ansprechbaren Schild-Akteuren und überstehen die Prüfung", async () => {
    const { docToWorld } = await import("./custom-world");
    const { setStampSay, placeStamp } = await import("./custom-world-edit");
    let d = placeStamp(starterDoc("leer"), "barrel", 10, 10);
    d = setStampSay(d, 0, "Ein altes Fass. Es riecht nach Met.");
    const w = docToWorld(d);
    const signs = w.map.actors.filter((a) => a.id.startsWith("obj0_"));
    assert.equal(signs.length, 1);
    assert.equal(signs[0].kind, "sign");
    assert.equal(signs[0].name, "Fass");
    assert.deepEqual(signs[0].talk[0].lines, ["Ein altes Fass. Es riecht nach Met."]);
    const s = sanitizeCustomWorldDoc(JSON.parse(JSON.stringify(d)));
    assert.ok(s.ok && s.doc.stamps[0].say === "Ein altes Fass. Es riecht nach Met.");
    assert.equal(setStampSay(d, 0, "").stamps[0].say, undefined);
    assert.deepEqual(checkPlayable(d), []);
  });
});
