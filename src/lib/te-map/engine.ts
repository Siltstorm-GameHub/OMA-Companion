// ============================================
// Spiel-Logik der begehbaren Welten: Kachel-Bewegung, Kollision, Interaktion, Quest-Schritte
// ============================================
// Rein (kein DOM, kein Zeichnen), damit testbar. Die Komponente ruft `step` pro Frame,
// `pressAction` bei Aktionstaste/Tippen und liest den Zustand zum Zeichnen. Fortschritte der Quest
// gibt der Engine nur als Ereignis weiter (`advance`); gespeichert wird auf dem Server.

import { STAMPS, type StampDef } from "./stamps";
import type { Actor, Dir, Talk, WorldDef } from "./types";

export type { Dir };
export const DELTA: Record<Dir, [number, number]> = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };

/** Dauer, um eine Kachel zu durchqueren (ms). */
export const TILE_MS = 170;

export interface Dialog { speaker: string; lines: string[]; index: number; advanceFrom?: number }
export type GameEvent = { type: "advance"; from: number } | { type: "complete" };

export interface Game {
  world: WorldDef;
  solid: boolean[][];
  px: number;
  py: number;
  dir: Dir;
  move: { fromX: number; fromY: number; toX: number; toY: number; elapsed: number } | null;
  /** Aktueller Quest-Schritt (0 … objectives.length − 1; letzter = abgeschlossen) */
  questStep: number;
  dialog: Dialog | null;
  events: GameEvent[];
  /** Ausrichtung der NPCs (drehen sich beim Ansprechen zur Figur) */
  actorDir: Map<string, Dir>;
}

export function buildSolid(world: WorldDef): boolean[][] {
  const map = world.map;
  const solid = Array.from({ length: map.rows }, () => Array<boolean>(map.cols).fill(false));
  const mark = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (solid[yy]?.[xx] !== undefined) solid[yy][xx] = true;
  };
  for (const [x, y, w, h] of map.blocked) mark(x, y, w, h);
  for (const b of map.buildings) mark(b.x, b.y, b.w, b.roofRows + 2);
  for (const s of map.stamps) {
    const f = (STAMPS[s.id] as StampDef).solid;
    if (f) mark(s.x + f[0], s.y + f[1], f[2], f[3]);
  }
  for (const a of map.actors) if (a.kind !== "sign") mark(a.x, a.y, 1, 1);
  return solid;
}

export function questLength(world: WorldDef): number { return world.quest.objectives.length - 1; }

export function createGame(world: WorldDef, questStep = 0): Game {
  return {
    world, solid: buildSolid(world), px: world.map.spawn.x, py: world.map.spawn.y, dir: "down", move: null,
    questStep: Math.min(Math.max(0, questStep), questLength(world)), dialog: null, events: [],
    actorDir: new Map(world.map.actors.map((a) => [a.id, a.dir])),
  };
}

export function isWalkable(game: Game, x: number, y: number): boolean {
  const { cols, rows } = game.world.map;
  if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
  return !game.solid[y][x];
}

/** Ein Frame: laufende Bewegung fortsetzen bzw. (bei gehaltener Richtung) neue beginnen. */
export function step(game: Game, dtMs: number, held: Dir | null): void {
  if (game.move) {
    game.move.elapsed += dtMs;
    if (game.move.elapsed < TILE_MS) return;
    const overshoot = game.move.elapsed - TILE_MS;
    game.px = game.move.toX;
    game.py = game.move.toY;
    game.move = null;
    if (!held || game.dialog) return;
    // Übertrag in die nächste Kachel, damit das Laufen bei gehaltener Taste flüssig bleibt
    startMove(game, held, overshoot);
    return;
  }
  if (!held || game.dialog) return;
  startMove(game, held, 0);
}

function startMove(game: Game, dir: Dir, elapsed: number) {
  game.dir = dir;
  const [dx, dy] = DELTA[dir];
  const tx = game.px + dx;
  const ty = game.py + dy;
  if (!isWalkable(game, tx, ty)) return;
  game.move = { fromX: game.px, fromY: game.py, toX: tx, toY: ty, elapsed };
}

/** Kachel, auf die die Figur schaut (im Stand). */
export function facingCell(game: Game): [number, number] {
  const [dx, dy] = DELTA[game.dir];
  return [game.px + dx, game.py + dy];
}

/** Dialog des Akteurs für den aktuellen Quest-Schritt (sonst der "*"-Dialog, sonst ein Platzhalter). */
export function pickTalk(actor: Actor, questStep: number): Talk {
  return actor.talk.find((t) => t.step === questStep) ?? actor.talk.find((t) => t.step === "*") ?? { step: "*", lines: ["…"] };
}

/** Ist die Truhe schon geöffnet? (= ihr Quest-Schritt wurde bereits abgeschlossen) */
export function isChestOpen(actor: Actor, questStep: number): boolean {
  return actor.talk.some((t) => t.advance && typeof t.step === "number" && questStep > t.step);
}

/** Aktionstaste: Dialog weiterblättern, sonst mit dem Akteur vor der Figur reden/etwas öffnen. */
export function pressAction(game: Game): void {
  if (game.move) return;
  const d = game.dialog;
  if (d) {
    if (d.index < d.lines.length - 1) { d.index++; return; }
    game.dialog = null;
    // Nur weiterrücken, wenn der Schritt noch derselbe ist (doppeltes Auslösen verhindern)
    if (d.advanceFrom !== undefined && game.questStep === d.advanceFrom) {
      game.questStep++;
      game.events.push({ type: "advance", from: d.advanceFrom });
      if (game.questStep === questLength(game.world)) game.events.push({ type: "complete" });
    }
    return;
  }

  const [fx, fy] = facingCell(game);
  const actor = game.world.map.actors.find((a) => a.x === fx && a.y === fy);
  if (!actor) return;
  if (actor.kind === "npc") {
    // Der NPC dreht sich zur Figur
    game.actorDir.set(actor.id, ({ down: "up", up: "down", left: "right", right: "left" } as const)[game.dir]);
  }
  const talk = pickTalk(actor, game.questStep);
  game.dialog = {
    speaker: actor.name,
    lines: talk.lines,
    index: 0,
    advanceFrom: talk.advance && typeof talk.step === "number" ? talk.step : undefined,
  };
}

export function drainEvents(game: Game): GameEvent[] {
  const e = game.events;
  game.events = [];
  return e;
}

/** Vom Server bestätigter Stand: übernimmt den Schritt, wenn er weiter ist als der lokale. */
export function syncQuestStep(game: Game, serverStep: number): void {
  const capped = Math.min(serverStep, questLength(game.world));
  if (capped > game.questStep) game.questStep = capped;
}
