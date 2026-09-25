import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defaultCustomWorldDoc, docToWorld, sanitizeCustomWorldDoc, LIMITS } from "./custom-world";
import { placeActor, updateActor } from "./custom-world-edit";
import { createGame, isWalkable, pressAction, setHidden, interactTarget } from "./engine";
import { slainOf, RESPAWN_MS } from "../dnd/combat-server";

function docWithMonster() {
  const base = defaultCustomWorldDoc("outdoor");
  const r = placeActor(base, "monster", base.spawn.x + 2, base.spawn.y);
  assert.ok(r.id);
  return { doc: r.doc, id: r.id! };
}

describe("Monster-Figuren auf der Karte", () => {
  test("werden gesetzt, gespeichert und behalten Art und Text", () => {
    const { doc, id } = docWithMonster();
    const s = sanitizeCustomWorldDoc(updateActor(doc, id, { monster: "wolf", name: "Grauer Wolf" }));
    assert.ok(s.ok);
    if (!s.ok) return;
    const a = s.doc.actors.find((x) => x.id === id)!;
    assert.equal(a.kind, "monster");
    assert.equal(a.monster, "wolf");
    assert.ok(a.talk[0].lines[0].length > 0);
  });

  test("unbekannte Art wird entfernt, Anzahl begrenzt", () => {
    const { doc, id } = docWithMonster();
    const bad = sanitizeCustomWorldDoc(updateActor(doc, id, { monster: "gibtsnicht" }));
    assert.ok(bad.ok && !bad.doc.actors.some((a) => a.id === id));
    let d = defaultCustomWorldDoc("outdoor");
    for (let i = 0; i < LIMITS.maxMonsters + 2; i++) d = placeActor(d, "monster", 3 + i, 3).doc;
    assert.equal(d.actors.filter((a) => a.kind === "monster").length, LIMITS.maxMonsters);
  });

  test("Ansprechen zeigt einen Kampf-Dialog; besiegte Monster sind weg und begehbar", () => {
    const { doc, id } = docWithMonster();
    const s = sanitizeCustomWorldDoc(doc);
    assert.ok(s.ok);
    if (!s.ok) return;
    const world = docToWorld(s.doc);
    const g = createGame(world);
    const m = world.map.actors.find((a) => a.id === id)!;
    assert.equal(isWalkable(g, m.x, m.y), false);
    g.px = m.x - 1; g.py = m.y; g.dir = "right";
    assert.equal(interactTarget(g)?.id, id);
    pressAction(g);
    assert.equal(g.dialog?.fight?.actor, id);
    assert.equal(g.dialog?.fight?.monster, m.monster);

    g.dialog = null;
    setHidden(g, [id]);
    assert.equal(isWalkable(g, m.x, m.y), true);
    assert.notEqual(interactTarget(g)?.id, id);
    setHidden(g, []);
    assert.equal(isWalkable(g, m.x, m.y), false);
  });

  test("Besiegt-Markierung läuft nach 15 Minuten ab", () => {
    const now = 1_000_000_000_000;
    const flags = { dndFlags: [`slain:cw-abc:wolf1@${now - 60_000}`, `slain:cw-abc:wolf2@${now - RESPAWN_MS - 1}`, "irgendwas"] };
    assert.deepEqual(slainOf(flags, now), ["cw-abc:wolf1"]);
  });
});

import { WORLD_SLUGS, getWorld } from "./worlds";

describe("Monster in festen Locations", () => {
  test("jede feste Location hat Monster, erreichbar und nicht im Weg", () => {
    for (const slug of WORLD_SLUGS) {
      const w = getWorld(slug)!;
      const ms = w.map.actors.filter((a) => a.kind === "monster");
      assert.ok(ms.length >= 2, slug);
      assert.equal(new Set(w.map.actors.map((a) => a.id)).size, w.map.actors.length, slug);
      const g = createGame(w);
      // Alle anderen Akteure bleiben vom Start aus erreichbar (BFS über begehbare Kacheln)
      const seen = new Set<string>([`${w.map.spawn.x},${w.map.spawn.y}`]);
      const q: [number, number][] = [[w.map.spawn.x, w.map.spawn.y]];
      for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = q[i][0] + dx, y = q[i][1] + dy;
        if (isWalkable(g, x, y) && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); q.push([x, y]); }
      }
      for (const a of w.map.actors) assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${a.x + dx},${a.y + dy}`)), `${slug}/${a.id}`);
    }
  });
});
