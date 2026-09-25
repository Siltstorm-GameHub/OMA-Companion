import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { groundQuarters, wallQuarters } from "./autotile";
import { TILE_MS, createGame, drainEvents, facingCell, isWalkable, pressAction, step, type Game } from "./engine";
import { VILLAGE } from "./village";
import { sanitizeTeConfig } from "@/lib/te-character";

describe("Autotiles", () => {
  test("Boden: Fläche mitten im Gleichen → Füllung; freistehende Kachel → vier Außenecken", () => {
    assert.deepEqual(groundQuarters(() => true), [[0, 0], [1, 0], [0, 1], [1, 1]]);
    assert.deepEqual(groundQuarters(() => false), [[0, 2], [3, 2], [0, 5], [3, 5]]);
  });

  test("Boden: fehlende Diagonale ergibt Innenecken", () => {
    const q = groundQuarters((dx, dy) => !(dx === -1 && dy === -1));
    assert.deepEqual(q[0], [2, 0]);
    assert.deepEqual(q[1], [1, 0]);
  });

  test("Boden: obere Kante (nur oben fehlt)", () => {
    const q = groundQuarters((_dx, dy) => dy >= 0);
    assert.deepEqual([q[0], q[1]], [[1, 2], [2, 2]]);
  });

  test("Wand: Ecken und Mitte", () => {
    assert.deepEqual(wallQuarters(() => false), [[0, 0], [3, 0], [0, 3], [3, 3]]);
    assert.deepEqual(wallQuarters(() => true), [[1, 1], [2, 1], [1, 2], [2, 2]]);
  });
});

function walkTo(g: Game, dir: "up" | "down" | "left" | "right", tiles: number) {
  for (let i = 0; i < tiles; i++) {
    step(g, 0, dir);
    step(g, TILE_MS, null);
  }
}

describe("Bewegung & Kollision", () => {
  test("Start ist begehbar, Kartenrand und Häuser sind es nicht", () => {
    const g = createGame(VILLAGE);
    assert.ok(isWalkable(g, VILLAGE.spawn.x, VILLAGE.spawn.y));
    assert.ok(!isWalkable(g, -1, 5));
    const b = VILLAGE.buildings[0];
    assert.ok(!isWalkable(g, b.x + 1, b.y + 1));
  });

  test("eine Kachel dauert TILE_MS; gegen ein Hindernis bleibt die Figur stehen, dreht sich aber", () => {
    const g = createGame(VILLAGE);
    step(g, 0, "left");
    assert.ok(g.move);
    step(g, TILE_MS - 1, null);
    assert.equal(g.px, VILLAGE.spawn.x);
    step(g, 1, null);
    assert.equal(g.px, VILLAGE.spawn.x - 1);

    const wall = createGame(VILLAGE);
    wall.px = 5; wall.py = 8; // direkt unter der Fassade des Ältestenhauses (Tür-Zeile ist Zeile 7)
    step(wall, 0, "up");
    assert.equal(wall.move, null);
    assert.equal(wall.dir, "up");
  });
});

describe("Mini-Quest", () => {
  test("Ältesten ansprechen startet die Quest; Truhe erst danach; Rückgabe schließt sie ab", () => {
    const g = createGame(VILLAGE);
    const elder = VILLAGE.npcs.find((n) => n.id === "elder")!;
    g.px = elder.x + 1; g.py = elder.y; g.dir = "left";
    assert.deepEqual(facingCell(g), [elder.x, elder.y]);

    // Truhe vor der Quest verschlossen
    const chestG = createGame(VILLAGE);
    chestG.px = VILLAGE.chest.x; chestG.py = VILLAGE.chest.y - 1; chestG.dir = "down";
    pressAction(chestG);
    assert.equal(chestG.quest, 0);
    assert.equal(chestG.chestOpen, false);

    // Gespräch → Quest 1
    pressAction(g);
    assert.ok(g.dialog);
    while (g.dialog) pressAction(g);
    assert.equal(g.quest, 1);
    assert.deepEqual(drainEvents(g), ["questStarted"]);

    // Truhe öffnen → Quest 2
    g.px = VILLAGE.chest.x; g.py = VILLAGE.chest.y - 1; g.dir = "down";
    pressAction(g);
    assert.equal(g.quest, 2);
    assert.equal(g.chestOpen, true);
    while (g.dialog) pressAction(g);

    // Rückgabe → Quest 3
    g.px = elder.x + 1; g.py = elder.y; g.dir = "left";
    pressAction(g);
    while (g.dialog) pressAction(g);
    assert.equal(g.quest, 3);
    assert.ok(drainEvents(g).includes("questComplete"));
  });

  test("Truhe und Tür liegen so, dass man vor ihnen stehen kann", () => {
    const g = createGame(VILLAGE);
    assert.ok(isWalkable(g, VILLAGE.chest.x, VILLAGE.chest.y - 1), "Kachel nördlich der Truhe");
    for (const b of VILLAGE.buildings) assert.ok(isWalkable(g, b.x + b.doorDx, b.y + b.roofRows + 2), `Vor der Tür: ${b.name}`);
  });
});

describe("Figuren der Karte", () => {
  test("NPC-Konfigurationen gibt es im Katalog", () => {
    for (const n of VILLAGE.npcs) assert.ok(sanitizeTeConfig(n.config), `${n.id} ist gültig`);
  });
});
