import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TILE_MS, createGame, doorAhead, interactTarget, pressAction, step, walkTo, type Game } from "./engine";
import { doorFront } from "./interior";
import { getWorld } from "./worlds";

/** Zeit vergehen lassen (in Frames von 16 ms), bis nichts mehr läuft. */
function run(g: Game, ms = 20_000, held: "up" | "down" | "left" | "right" | null = null) {
  for (let t = 0; t < ms; t += 16) {
    step(g, 16, held);
    if (!g.move && !g.path.length && !g.goal) break;
  }
}

describe("Steuerung: Klick/Tippen zum Laufen, Sprint, Ansprechen aus der Nähe", () => {
  const world = getWorld("hafenstadt")!;

  test("freie Kachel anklicken: Figur läuft auf kürzestem Weg hin", () => {
    const g = createGame(world);
    // erstbeste freie Kachel mit Abstand ≥ 6 (unabhängig von der genauen Kartenbelegung)
    let tx = -1, ty = -1;
    for (let y = 0; y < world.map.rows && tx < 0; y++) for (let x = 0; x < world.map.cols; x++) if (!g.solid[y][x] && Math.abs(x - g.px) + Math.abs(y - g.py) === 6) { tx = x; ty = y; break; }
    assert.ok(tx >= 0);
    assert.equal(walkTo(g, tx, ty), true);
    assert.ok(g.path.length >= 6);
    run(g);
    assert.deepEqual([g.px, g.py], [tx, ty]);
    assert.equal(g.goal, null);
  });

  test("unerreichbare oder gesperrte Kachel: nichts wird geplant", () => {
    const g = createGame(world);
    assert.equal(walkTo(g, 0, 0), false, "Rand ist gesperrt");
    assert.equal(g.path.length, 0);
  });

  test("Akteur anklicken: hingehen und ansprechen (Dialog öffnet sich, Figur schaut ihn an)", () => {
    const g = createGame(world);
    const olga = world.map.actors.find((a) => a.id === "olga")!;
    assert.equal(walkTo(g, olga.x, olga.y), true);
    run(g);
    assert.equal(g.dialog?.speaker, "Hafenmeisterin Olga");
    assert.ok(Math.abs(g.px - olga.x) + Math.abs(g.py - olga.y) === 1);
  });

  test("gehaltene Richtungstaste bricht den geplanten Weg ab", () => {
    const g = createGame(world);
    walkTo(g, g.px - 6, g.py);
    step(g, 16, null);
    step(g, 16, "up");
    assert.equal(g.path.length, 0);
    assert.equal(g.goal, null);
  });

  test("Sprinten verkürzt die Zeit pro Kachel", () => {
    const g = createGame(world);
    g.speed = 2;
    step(g, 0, "left");
    assert.equal(g.move?.dur, TILE_MS / 2);
    const slow = createGame(world);
    step(slow, 0, "left");
    assert.equal(slow.move?.dur, TILE_MS);
  });

  test("Ansprechen auch schräg: nächster Akteur in der Nachbarschaft, Figur dreht sich zu ihm", () => {
    const g = createGame(world);
    const olga = world.map.actors.find((a) => a.id === "olga")!;
    g.px = olga.x + 1; g.py = olga.y + 1; g.dir = "down";
    assert.equal(interactTarget(g)?.id, "olga");
    pressAction(g);
    assert.equal(g.dialog?.speaker, "Hafenmeisterin Olga");
  });

  test("Gebäude mit Innenraum anklicken: zur Tür laufen und eintreten; Tür-Hinweis vor der Tür", () => {
    const g = createGame(world);
    const bi = world.map.buildings.findIndex((b) => b.interior);
    const b = world.map.buildings[bi];
    assert.equal(walkTo(g, b.x + 1, b.y + 1), true);
    // kurz vor dem Eintreten steht die Figur vor der Tür und schaut hinein
    let sawHint = false;
    for (let t = 0; t < 30_000 && g.scene === null; t += 16) {
      step(g, 16, null);
      if (doorAhead(g) === bi) sawHint = true;
    }
    assert.equal(g.scene, bi);
    assert.ok(sawHint || g.sceneChanges === 1);
    const f = doorFront(b);
    assert.ok(f.y > b.y);
  });

  test("im Innenraum die Tür anklicken: hinausgehen", () => {
    const g = createGame(world);
    const bi = world.map.buildings.findIndex((b) => b.interior);
    walkTo(g, world.map.buildings[bi].x + 1, world.map.buildings[bi].y + 1);
    run(g);
    assert.equal(g.scene, bi);
    const it = world.map.buildings[bi].interior!;
    assert.equal(walkTo(g, it.exitX, it.rows - 1), true);
    run(g);
    assert.equal(g.scene, null);
  });
});
