import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { groundQuarters, wallQuarters } from "./autotile";
import { TILE_MS, createGame, drainEvents, isChestOpen, isWalkable, pressAction, questLength, step, syncQuestStep, type Game } from "./engine";
import { WORLD_SLUGS, getWorld } from "./worlds";
import { LOCATION_HEXES } from "@/lib/dnd/hex/world";
import { sanitizeTeConfig } from "@/lib/te-character";

describe("Autotiles", () => {
  test("Boden: Fläche mitten im Gleichen → Füllung; freistehende Kachel → vier Außenecken", () => {
    assert.deepEqual(groundQuarters(() => true), [[0, 0], [1, 0], [0, 1], [1, 1]]);
    assert.deepEqual(groundQuarters(() => false), [[0, 2], [3, 2], [0, 5], [3, 5]]);
  });

  test("Boden: fehlende Diagonale ergibt Innenecken, fehlende Seite eine Kante", () => {
    const q = groundQuarters((dx, dy) => !(dx === -1 && dy === -1));
    assert.deepEqual([q[0], q[1]], [[2, 0], [1, 0]]);
    const top = groundQuarters((_dx, dy) => dy >= 0);
    assert.deepEqual([top[0], top[1]], [[1, 2], [2, 2]]);
  });

  test("Wand: Ecken und Mitte", () => {
    assert.deepEqual(wallQuarters(() => false), [[0, 0], [3, 0], [0, 3], [3, 3]]);
    assert.deepEqual(wallQuarters(() => true), [[1, 1], [2, 1], [1, 2], [2, 2]]);
  });
});

/** Alle von `start` aus begehbaren Kacheln (4er-Nachbarschaft). */
function reachable(g: Game): Set<string> {
  const seen = new Set<string>([`${g.px},${g.py}`]);
  const stack: [number, number][] = [[g.px, g.py]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (isWalkable(g, nx, ny) && !seen.has(`${nx},${ny}`)) { seen.add(`${nx},${ny}`); stack.push([nx, ny]); }
    }
  }
  return seen;
}

describe("Welten (eine je Location)", () => {
  test("es gibt zu jeder der 10 Locations eine Welt", () => {
    assert.equal(WORLD_SLUGS.length, 10);
    for (const slug of Object.keys(LOCATION_HEXES)) assert.ok(getWorld(slug), `Welt für ${slug}`);
  });

  for (const slug of WORLD_SLUGS) {
    describe(slug, () => {
      const world = getWorld(slug)!;
      const g = createGame(world);
      const reach = reachable(g);

      test("Spawn ist begehbar und hat Bewegungsfreiheit", () => {
        assert.ok(isWalkable(g, world.map.spawn.x, world.map.spawn.y));
        assert.ok(reach.size > 150, `nur ${reach.size} erreichbare Kacheln`);
      });

      test("jeder Akteur steht auf einer freien Kachel und ist von einer erreichbaren Nachbarkachel ansprechbar", () => {
        for (const a of world.map.actors) {
          const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `${a.x + dx},${a.y + dy}`);
          assert.ok(neighbours.some((n) => reach.has(n)), `${a.id} ist nicht erreichbar`);
        }
      });

      test("NPCs sind gültige Figuren, Akteure haben eindeutige IDs", () => {
        const ids = world.map.actors.map((a) => a.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const a of world.map.actors.filter((x) => x.kind === "npc")) assert.ok(sanitizeTeConfig(a.config), `${a.id} gültig`);
      });

      test("Quest: jeder Schritt hat genau einen Akteur, der ihn weiterschaltet", () => {
        const n = questLength(world);
        assert.equal(world.quest.objectives.length, n + 1);
        for (let s = 0; s < n; s++) {
          const advancing = world.map.actors.filter((a) => a.talk.some((t) => t.step === s && t.advance));
          assert.ok(advancing.length >= 1, `Schritt ${s} kann nicht abgeschlossen werden`);
        }
      });

      test("Häuser: Tür ist von außen erreichbar", () => {
        for (const b of world.map.buildings) {
          assert.ok(reach.has(`${b.x + b.doorDx},${b.y + b.roofRows + 2}`), `Vor der Tür von ${b.name}`);
        }
      });
    });
  }
});

/** Vor den Akteur treten und (im Test) direkt ansprechen. */
function talkTo(g: Game, actorId: string) {
  const a = g.world.map.actors.find((x) => x.id === actorId)!;
  const spots: [number, number, "up" | "down" | "left" | "right"][] = [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]];
  const spot = spots.find(([dx, dy]) => isWalkable(g, a.x + dx, a.y + dy))!;
  g.px = a.x + spot[0]; g.py = a.y + spot[1]; g.dir = spot[2];
  pressAction(g);
  while (g.dialog) pressAction(g);
}

describe("Bewegung", () => {
  test("eine Kachel dauert TILE_MS; gegen ein Hindernis bleibt die Figur stehen, dreht sich aber", () => {
    const world = getWorld("hafenstadt")!;
    const g = createGame(world);
    step(g, 0, "left");
    assert.ok(g.move);
    step(g, TILE_MS - 1, null);
    assert.equal(g.px, world.map.spawn.x);
    step(g, 1, null);
    assert.equal(g.px, world.map.spawn.x - 1);

    const wall = createGame(world);
    const b = world.map.buildings[0];
    wall.px = b.x + 1; wall.py = b.y + b.roofRows + 2;
    step(wall, 0, "up");
    assert.equal(wall.move, null);
    assert.equal(wall.dir, "up");
  });
});

describe("Quest-Ablauf (Hafenstadt)", () => {
  test("Auftrag → Truhe → Abgabe schließt ab; Truhe vorher verschlossen", () => {
    const world = getWorld("hafenstadt")!;
    const g = createGame(world);
    talkTo(g, "fracht");
    assert.equal(g.questStep, 0, "Truhe verschlossen");

    talkTo(g, "olga");
    assert.equal(g.questStep, 1);
    talkTo(g, "olga");
    assert.equal(g.questStep, 1, "Erinnerung schaltet nicht weiter");

    const chest = world.map.actors.find((a) => a.id === "fracht")!;
    assert.equal(isChestOpen(chest, g.questStep), false);
    talkTo(g, "fracht");
    assert.equal(g.questStep, 2);
    assert.equal(isChestOpen(chest, g.questStep), true);

    talkTo(g, "olga");
    assert.equal(g.questStep, 3);
    const events = drainEvents(g);
    assert.deepEqual(events.map((e) => e.type), ["advance", "advance", "advance", "complete"]);
  });

  test("Server-Stand wird nur nach vorn übernommen und gedeckelt", () => {
    const world = getWorld("waldpfad")!;
    const g = createGame(world, 1);
    syncQuestStep(g, 0);
    assert.equal(g.questStep, 1);
    syncQuestStep(g, 99);
    assert.equal(g.questStep, questLength(world));
  });
});
