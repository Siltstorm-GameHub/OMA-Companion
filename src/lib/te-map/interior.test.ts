import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkPlayable, defaultCustomWorldDoc, docToWorld, sanitizeCustomWorldDoc, type CustomWorldDoc } from "./custom-world";
import { allActors, interiorMoveActor, interiorSetStampSay, interiorPlaceActor, interiorRemoveAt, setInteriorFromTemplate, withUniqueActorIds } from "./custom-world-edit";
import { INTERIOR_TEMPLATES, doorFront, doorTile, interiorSpawn, interiorToMap } from "./interior";
import { createGame, enterBuilding, isWalkable, leaveBuilding, solidOfMap, step, TILE_MS } from "./engine";
import { getWorld } from "./worlds";

const withHouse = (templateId: string): CustomWorldDoc => {
  const d = JSON.parse(JSON.stringify(defaultCustomWorldDoc())) as CustomWorldDoc;
  d.title = "Haus-Test";
  d.buildings.push({ x: 4, y: 3, w: 6, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Haus" });
  return setInteriorFromTemplate(d, 0, templateId);
};

describe("Innenräume", () => {
  for (const t of INTERIOR_TEMPLATES) {
    test(`Vorlage „${t.label}“: gültig, nichts wird verworfen, Akteure von der Tür aus erreichbar`, () => {
      const d = withHouse(t.id);
      const s = sanitizeCustomWorldDoc(d);
      assert.ok(s.ok);
      if (!s.ok) return;
      assert.deepEqual(s.warnings, []);
      assert.deepEqual(s.doc.buildings[0].interior, d.buildings[0].interior, "Innenraum bleibt unverändert");
      assert.deepEqual(checkPlayable(s.doc), []);
      const it = s.doc.buildings[0].interior!;
      const solid = solidOfMap(interiorToMap(it));
      const sp = interiorSpawn(it);
      assert.equal(solid[sp.y][sp.x], false, "Eingang frei");
      assert.equal(solid[it.rows - 1][it.exitX], false, "Tür-Kachel begehbar");
    });
  }

  test("Vorlagen-Akteure bekommen weltweit eindeutige Kennungen", () => {
    const d = withHouse("taverne");
    d.buildings.push({ x: 15, y: 3, w: 6, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Haus 2" });
    const two = setInteriorFromTemplate(d, 1, "taverne");
    const ids = allActors(two).map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(withUniqueActorIds(two, [{ id: "wirt", kind: "npc", name: "x", x: 1, y: 2, dir: "down", talk: [] }])[0].id !== "wirt", true);
  });

  test("Eintreten durch die Tür und wieder Hinausgehen (Engine)", () => {
    const world = docToWorld(withHouse("wohnhaus"), "cw-x");
    const g = createGame(world);
    const b = world.map.buildings[0];
    const f = doorFront(b);
    g.px = f.x; g.py = f.y;
    assert.equal(doorTile(b).y, f.y - 1);
    step(g, 0, "up");
    assert.equal(g.scene, 0, "drinnen");
    assert.equal(g.sceneChanges, 1);
    const it = b.interior!;
    assert.deepEqual([g.px, g.py], [interiorSpawn(it).x, interiorSpawn(it).y]);
    assert.equal(g.map.theme, "inside");
    // Gegen die Wand laufen geht nicht, hinaus über die Tür unten
    step(g, 0, "down");
    step(g, TILE_MS, null);
    assert.equal(g.scene, null, "wieder draußen");
    assert.deepEqual([g.px, g.py], [f.x, f.y]);
    assert.equal(g.sceneChanges, 2);
  });

  test("Häuser ohne Innenraum bleiben zu; enterBuilding ignoriert sie", () => {
    const d = defaultCustomWorldDoc();
    d.buildings.push({ x: 4, y: 3, w: 6, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Haus" });
    const g = createGame(docToWorld(d));
    enterBuilding(g, 0);
    assert.equal(g.scene, null);
    leaveBuilding(g);
    assert.equal(g.sceneChanges, 0);
    assert.equal(isWalkable(g, 4, 3), false);
  });

  test("feste Welt Alt-Hafenstadt: Taverne und Lager sind begehbar", () => {
    const world = getWorld("hafenstadt")!;
    const withInterior = world.map.buildings.filter((b) => b.interior);
    assert.deepEqual(withInterior.map((b) => b.name).sort(), ["Lagerhaus", "Zum Halben Anker"]);
  });

  test("Unsinn im Innenraum wird bereinigt (Größe, Objekte außerhalb, Akteur vor der Tür, fremde Stempel)", () => {
    const d = withHouse("leer");
    const it = d.buildings[0].interior!;
    (it.stamps as unknown[]).push({ id: "tree", x: 1, y: 3 }, { id: "tableSquare", x: 99, y: 3 });
    it.actors.push({ id: "haenger", kind: "npc", name: "X", x: it.exitX, y: it.rows - 2, dir: "down", config: d.actors[0].config, talk: [{ step: "*", lines: ["hi"] }] });
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (!s.ok) return;
    assert.equal(s.doc.buildings[0].interior!.stamps.length, 0);
    assert.equal(s.doc.buildings[0].interior!.actors.length, 0);
    assert.ok(s.warnings.some((w) => w.includes("vor der Tür")));
    const bad = withHouse("leer");
    (bad.buildings[0].interior as unknown as { cols: number }).cols = 500;
    const s2 = sanitizeCustomWorldDoc(bad);
    assert.ok(s2.ok && s2.doc.buildings[0].interior === undefined && s2.warnings.length > 0);
  });

  test("Monster und Schilder im Innenraum: setzen, verschieben, entfernen, speichern", () => {
    let d = withHouse("leer");
    const m = interiorPlaceActor(d, 0, "monster", 3, 3);
    assert.ok(m.id);
    d = m.doc;
    const sg = interiorPlaceActor(d, 0, "sign", 4, 3);
    d = sg.doc;
    assert.ok(d.buildings[0].interior!.stamps.some((s) => s.id === "frameSmall" && s.x === 4 && s.y === 3));
    d = interiorMoveActor(d, 0, sg.id!, 5, 3);
    assert.ok(d.buildings[0].interior!.stamps.some((s) => s.id === "frameSmall" && s.x === 5));
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok, s.ok ? "" : s.errors.join("; "));
    if (!s.ok) return;
    assert.equal(s.warnings.length, 0, s.warnings.join("; "));
    const kinds = s.doc.buildings[0].interior!.actors.map((a) => a.kind).sort();
    assert.deepEqual(kinds, ["monster", "sign"]);
    d = interiorRemoveAt(d, 0, 5, 3);
    assert.ok(!d.buildings[0].interior!.stamps.some((st) => st.id === "frameSmall"));
  });

  test("Text an Möbeln im Innenraum: bleibt beim Speichern, wird zu ansprechbaren Schild-Akteuren", () => {
    let d = withHouse("leer");
    d = { ...d, buildings: d.buildings.map((b) => ({ ...b, interior: { ...b.interior!, stamps: [{ id: "barrelClosed", x: 3, y: 3 }] } })) };
    d = interiorSetStampSay(d, 0, 0, "Riecht nach Met.");
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (!s.ok) return;
    assert.equal(s.doc.buildings[0].interior!.stamps[0].say, "Riecht nach Met.");
    const w = docToWorld(s.doc, "test");
    const talkers = w.map.buildings[0].interior!.actors.filter((a) => a.kind === "sign" && a.talk[0].lines[0] === "Riecht nach Met.");
    assert.ok(talkers.length >= 1);
    d = interiorSetStampSay(d, 0, 0, "");
    assert.equal(d.buildings[0].interior!.stamps[0].say, undefined);
  });
});
