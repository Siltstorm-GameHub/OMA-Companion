import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkPlayable, defaultCustomWorldDoc, docToWorld, sanitizeCustomWorldDoc, validateForSubmit, worldToDoc, type CustomWorldDoc } from "./custom-world";
import { buildSolid, createGame } from "./engine";
import { getWorld, WORLD_SLUGS } from "./worlds";

const clone = (d: CustomWorldDoc): CustomWorldDoc => JSON.parse(JSON.stringify(d));

describe("Community-Welten (Editor-Dokument)", () => {
  test("die Standardwelt ist gültig und spielbar", () => {
    const v = validateForSubmit({ ...defaultCustomWorldDoc(), title: "Test" });
    assert.ok(v.ok, v.ok ? "" : v.errors.join("; "));
  });

  test("Höhlen-Standardwelt ist ebenfalls spielbar", () => {
    const v = validateForSubmit({ ...defaultCustomWorldDoc("cave"), title: "Höhle" });
    assert.ok(v.ok, v.ok ? "" : v.errors.join("; "));
  });

  test("Dokument → Welt: Größe, Startpunkt und Quest stimmen", () => {
    const w = docToWorld(defaultCustomWorldDoc(), "cw-x");
    assert.equal(w.map.cols, 30);
    assert.deepEqual(w.map.spawn, { x: 15, y: 15 });
    assert.equal(w.quest.slug, "welt-cw-x");
    const g = createGame(w);
    assert.equal(g.solid[15][15], false);
  });

  test("Unsinn wird entfernt statt übernommen (unbekannte Stempel, Koordinaten außerhalb, fremde Felder)", () => {
    const d = clone(defaultCustomWorldDoc()) as unknown as Record<string, unknown>;
    d.stamps = [{ id: "tree", x: 3, y: 3 }, { id: "__proto__", x: 1, y: 1 }, { id: "tree", x: 999, y: 3 }, { id: "tree", x: 1.5, y: 3 }];
    d.evil = "<script>";
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (s.ok) {
      assert.equal(s.doc.stamps.length, 1);
      assert.ok(!("evil" in s.doc));
    }
  });

  test("Größenlimits: zu kleine/große Karte wird abgelehnt", () => {
    assert.equal(sanitizeCustomWorldDoc({ ...defaultCustomWorldDoc(), cols: 5 }).ok, false);
    assert.equal(sanitizeCustomWorldDoc({ ...defaultCustomWorldDoc(), rows: 500 }).ok, false);
    assert.equal(sanitizeCustomWorldDoc(null).ok, false);
  });

  test("unerreichbarer NPC und unlösbarer Quest-Schritt werden beim Einreichen gemeldet", () => {
    // NPC in der Höhle mit Wandkacheln einmauern
    const cave = clone(defaultCustomWorldDoc("cave"));
    cave.title = "Höhle";
    const c = cave.actors[0];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cave.walls.push([c.x + dx, c.y + dy]);
    assert.ok(checkPlayable(cave).some((e) => e.includes("nicht erreichbar")));

    const noAdvance = clone(defaultCustomWorldDoc());
    noAdvance.title = "Test";
    noAdvance.actors[0].talk = [{ step: "*", lines: ["Hi"] }];
    assert.ok(checkPlayable(noAdvance).some((e) => e.includes("Quest-Schritt 1")));
  });

  test("Startpunkt auf einem Hindernis wird gemeldet", () => {
    const d = clone(defaultCustomWorldDoc("cave"));
    d.walls.push([d.spawn.x, d.spawn.y]);
    assert.ok(checkPlayable(d).some((e) => e.includes("Startpunkt")));
  });

  test("Entwurf darf unfertig sein, Einreichen nicht (leerer Schritt-Text)", () => {
    const d = clone(defaultCustomWorldDoc());
    d.title = "Test";
    d.quest.objectives = ["", "Abgeschlossen!"];
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok && s.warnings.length > 0);
    assert.equal(validateForSubmit(d).ok, false);
  });

  test("Tür eines Gebäudes muss erreichbar sein", () => {
    const d = clone(defaultCustomWorldDoc());
    d.title = "Test";
    d.buildings.push({ x: 4, y: 4, w: 5, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Haus" });
    assert.deepEqual(checkPlayable(d), []);
    // Ein Gebäude am unteren Rand: der Vorplatz der Tür liegt im gesperrten Rand
    d.buildings.push({ x: 20, y: 17, w: 5, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [], name: "Rand" });
    assert.ok(checkPlayable(d).some((e) => e.includes("Tür")));
  });

  test("alle 10 festen Welten lassen sich in den Editor übernehmen und bleiben gleich (Boden, Gebäude, Akteure, Sperrflächen)", () => {
    for (const slug of WORLD_SLUGS) {
      const orig = getWorld(slug)!;
      const doc = worldToDoc(orig);
      const s = sanitizeCustomWorldDoc(doc);
      assert.ok(s.ok, slug);
      if (!s.ok) continue;
      assert.deepEqual(s.warnings, [], `${slug}: nichts wurde verworfen`);
      const back = docToWorld(s.doc, slug, orig.quest.slug);
      assert.deepEqual(back.map.ground, orig.map.ground, `${slug}: Boden`);
      assert.deepEqual(back.map.buildings, orig.map.buildings, `${slug}: Gebäude`);
      assert.deepEqual(back.map.actors.map((a) => [a.id, a.x, a.y, a.kind, a.talk]), orig.map.actors.map((a) => [a.id, a.x, a.y, a.kind, a.talk]), `${slug}: Akteure`);
      assert.deepEqual(buildSolid(back), buildSolid(orig), `${slug}: begehbar/gesperrt`);
      assert.equal(back.quest.slug, orig.quest.slug, `${slug}: Quest-Slug`);
      assert.deepEqual(checkPlayable(s.doc), [], `${slug}: spielbar`);
    }
  });
});
