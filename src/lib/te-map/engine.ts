// ============================================
// Spiel-Logik der Prototyp-Karte: Kachel-Bewegung, Kollision, Interaktion, Mini-Quest
// ============================================
// Rein (kein DOM, kein Zeichnen), damit testbar. Die Komponente ruft `step` pro Frame,
// `pressAction` bei Aktionstaste/Tippen und liest den Zustand zum Zeichnen.

import { STAMPS } from "./stamps";
import { type QuestStep, type TeMap } from "./village";

export type Dir = "down" | "left" | "right" | "up";
export const DELTA: Record<Dir, [number, number]> = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };

/** Dauer, um eine Kachel zu durchqueren (ms). */
export const TILE_MS = 170;

export interface Dialog { speaker: string; lines: string[]; index: number; onEnd?: "startQuest" | "completeQuest" }
export type GameEvent = "questStarted" | "gotJug" | "questComplete";

export interface Game {
  map: TeMap;
  solid: boolean[][];
  px: number;
  py: number;
  dir: Dir;
  move: { fromX: number; fromY: number; toX: number; toY: number; elapsed: number } | null;
  quest: QuestStep;
  chestOpen: boolean;
  dialog: Dialog | null;
  events: GameEvent[];
}

const SIGN_TEXT: Record<string, string> = {
  sign: "Willkommen in Krähbach! Einwohnerzahl: unklar. Postleitzahl: existiert nicht.",
  noticeBoard: "Aushang: Suche Helfer für einen verlorenen Krug. Melden bei der Ältesten. Bezahlung in Ruhm.",
};

export function buildSolid(map: TeMap): boolean[][] {
  const solid = Array.from({ length: map.rows }, () => Array<boolean>(map.cols).fill(false));
  const mark = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (solid[yy]?.[xx] !== undefined) solid[yy][xx] = true;
  };
  for (const [x, y, w, h] of map.blocked) mark(x, y, w, h);
  for (const b of map.buildings) mark(b.x, b.y, b.w, b.roofRows + 2);
  for (const s of map.stamps) {
    const def = STAMPS[s.id];
    const f = "solid" in def ? def.solid : undefined;
    if (f) mark(s.x + f[0], s.y + f[1], f[2], f[3]);
  }
  for (const n of map.npcs) mark(n.x, n.y, 1, 1);
  mark(map.chest.x, map.chest.y, 1, 1);
  return solid;
}

export function createGame(map: TeMap): Game {
  return {
    map, solid: buildSolid(map), px: map.spawn.x, py: map.spawn.y, dir: "up", move: null,
    quest: 0, chestOpen: false, dialog: null, events: [],
  };
}

export function isWalkable(game: Game, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= game.map.cols || y >= game.map.rows) return false;
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

function say(game: Game, speaker: string, lines: string[], onEnd?: Dialog["onEnd"]) {
  game.dialog = { speaker, lines, index: 0, onEnd };
}

/** Aktionstaste: Dialog weiterblättern, sonst mit dem Objekt vor der Figur interagieren. */
export function pressAction(game: Game): void {
  if (game.move) return;
  const d = game.dialog;
  if (d) {
    if (d.index < d.lines.length - 1) { d.index++; return; }
    game.dialog = null;
    if (d.onEnd === "startQuest") { game.quest = 1; game.events.push("questStarted"); }
    if (d.onEnd === "completeQuest") { game.quest = 3; game.events.push("questComplete"); }
    return;
  }

  const [fx, fy] = facingCell(game);
  const npc = game.map.npcs.find((n) => n.x === fx && n.y === fy);
  if (npc) {
    // Der NPC dreht sich zur Figur
    npc.dir = ({ down: "up", up: "down", left: "right", right: "left" } as const)[game.dir];
    return talk(game, npc.id, npc.name);
  }
  if (game.map.chest.x === fx && game.map.chest.y === fy) {
    if (game.quest === 1) {
      game.chestOpen = true;
      game.quest = 2;
      game.events.push("gotJug");
      return say(game, "Truhe", ["Du öffnest die Truhe … und findest einen alten Krug!", "Am besten bringst du ihn gleich zur Dorfältesten."]);
    }
    if (game.quest === 0) return say(game, "Truhe", ["Die Truhe ist fest verschlossen. Vielleicht weiß jemand im Dorf mehr."]);
    return say(game, "Truhe", [game.chestOpen ? "Die Truhe ist leer." : "Die Truhe rührt sich nicht."]);
  }
  for (const b of game.map.buildings) {
    if (fx === b.x + b.doorDx && fy === b.y + b.roofRows + 1) {
      return say(game, b.name, ["Die Tür ist verschlossen. (Innenräume gibt es im Prototyp noch nicht.)"]);
    }
  }
  for (const s of game.map.stamps) {
    const text = SIGN_TEXT[s.id];
    if (!text) continue;
    const def = STAMPS[s.id];
    if (fx >= s.x && fx < s.x + def.w && fy >= s.y && fy < s.y + def.h) return say(game, "Schild", [text]);
  }
}

function talk(game: Game, id: string, name: string) {
  if (id === "elder") {
    switch (game.quest) {
      case 0:
        return say(game, name, [
          "Ach, ein neues Gesicht! Gut, dass du da bist.",
          "Mein Lieblingskrug ist verschwunden. Ich glaube, er liegt in einer Truhe im Wald östlich des Dorfes.",
          "Würdest du ihn für mich holen?",
        ], "startQuest");
      case 1:
        return say(game, name, ["Hast du die Truhe im Osten schon gefunden? Folge dem Weg hinter dem Dorfplatz."]);
      case 2:
        return say(game, name, ["Mein Krug! Du hast ihn wirklich gefunden. Das Dorf steht in deiner Schuld."], "completeQuest");
      default:
        return say(game, name, ["Nochmals danke für den Krug. Der Tee schmeckt gleich viel besser."]);
    }
  }
  if (id === "merchant") {
    return say(game, name, [
      game.quest >= 2 ? "Ein Krug aus der Waldtruhe? Den hätte ich dir auch abgekauft. Aber gut gemacht!" : "Schwerter, Schilde, Socken. Alles vorrätig, nichts davon gut.",
    ]);
  }
  say(game, name, ["…"]);
}

export function drainEvents(game: Game): GameEvent[] {
  const e = game.events;
  game.events = [];
  return e;
}
