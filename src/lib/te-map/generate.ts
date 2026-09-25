// ============================================
// Karten-Baukasten: Boden malen, Wege ziehen, Häuser/Objekte/Akteure setzen, Dekoration streuen
// ============================================
// Reine Daten-Erzeugung (kein DOM). Jede Welt (worlds.ts) benutzt einen Builder mit festem Seed, damit
// die Karten bei jedem Aufruf gleich aussehen. `keepClear` schützt Wege und die Umgebung der Akteure
// vor zufälliger Dekoration, damit alles erreichbar bleibt.

import { STAMPS, type StampDef, type StampId } from "./stamps";
import { GROUND, type Actor, type Building, type Dir, type GroundType, type PlacedStamp, type Talk, type TeMap } from "./types";
import { randomTeConfig, type TeCharacterConfig } from "@/lib/te-character";

/** Kleiner, deterministischer Zufallsgenerator (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Aussehen eines NPCs aus einem Seed — immer gültig, weil aus dem Katalog gewürfelt. */
export function npcLook(seed: number): TeCharacterConfig {
  const c = randomTeConfig(makeRng(seed));
  // NPCs sollen erkennbar sein: immer Haar, Oberteil und Hose
  return c;
}

type Rect = [number, number, number, number];

export class MapBuilder {
  readonly cols: number;
  readonly rows: number;
  private theme: TeMap["theme"];
  private ground: GroundType[][];
  private stamps: PlacedStamp[] = [];
  private buildings: Building[] = [];
  private actors: Actor[] = [];
  private blocked: Rect[] = [];
  private wallRects: Rect[] = [];
  private clear: boolean[][];
  private solidCells: boolean[][];
  private rand: () => number;

  constructor(cols: number, rows: number, theme: TeMap["theme"], seed: number) {
    this.cols = cols;
    this.rows = rows;
    this.theme = theme;
    this.rand = makeRng(seed);
    this.ground = Array.from({ length: rows }, () => Array<GroundType>(cols).fill(GROUND.base));
    this.clear = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
    this.solidCells = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  }

  random() { return this.rand(); }
  private inMap(x: number, y: number) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
  private mark(grid: boolean[][], [x, y, w, h]: Rect, value = true) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.inMap(xx, yy)) grid[yy][xx] = value;
  }

  // ── Boden ──
  fill(type: GroundType, x: number, y: number, w: number, h: number) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.inMap(xx, yy)) this.ground[yy][xx] = type;
  }

  /** Weg entlang von Stützpunkten (erst waagerecht, dann senkrecht) mit Breite `width`; bleibt frei von Dekoration. */
  road(points: [number, number][], width: number, type: GroundType = GROUND.dirt) {
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      const x = Math.min(x0, x1);
      const y = Math.min(y0, y1);
      const w = Math.abs(x1 - x0) + width;
      const h = Math.abs(y1 - y0) + width;
      this.fill(type, x, y, w, h);
      this.mark(this.clear, [x - 1, y - 1, w + 2, h + 2]);
    };
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      seg(x0, y0, x1, y0);
      seg(x1, y0, x1, y1);
    }
  }

  keepClear(x: number, y: number, w: number, h: number) { this.mark(this.clear, [x, y, w, h]); }

  // ── Objekte ──
  place(id: StampId, x: number, y: number) {
    this.stamps.push({ id, x, y });
    const f = (STAMPS[id] as StampDef).solid;
    if (f) this.mark(this.solidCells, [x + f[0], y + f[1], f[2], f[3]]);
  }

  /** Streut `count` Stempel in `region`, ohne Wege/Akteurs-Umgebung/andere feste Objekte zu berühren. */
  scatter(ids: StampId | StampId[], count: number, region: Rect, opts: { spacing?: number } = {}) {
    const list = Array.isArray(ids) ? ids : [ids];
    const spacing = opts.spacing ?? 0;
    let placed = 0;
    for (let tries = 0; tries < count * 40 && placed < count; tries++) {
      const id = list[Math.floor(this.rand() * list.length)];
      const def = STAMPS[id] as StampDef;
      const f = def.solid ?? ([0, 0, def.w, def.h] as const);
      const x = region[0] + Math.floor(this.rand() * Math.max(1, region[2] - def.w + 1));
      const y = region[1] + Math.floor(this.rand() * Math.max(1, region[3] - def.h + 1));
      const fx = x + f[0] - spacing;
      const fy = y + f[1] - spacing;
      let ok = true;
      for (let yy = fy; yy < y + f[1] + f[3] + spacing && ok; yy++) {
        for (let xx = fx; xx < x + f[0] + f[2] + spacing; xx++) {
          if (!this.inMap(xx, yy) || this.clear[yy][xx] || this.solidCells[yy][xx]) { ok = false; break; }
        }
      }
      if (!ok) continue;
      this.place(id, x, y);
      placed++;
    }
  }

  building(b: Building) {
    this.buildings.push(b);
    this.mark(this.solidCells, [b.x, b.y, b.w, b.roofRows + 2]);
    // Vor der Tür und daneben frei halten
    this.keepClear(b.x + b.doorDx - 1, b.y + b.roofRows + 2, 3, 3);
  }

  // ── Akteure ──
  private actor(a: Actor) {
    this.actors.push(a);
    this.mark(this.clear, [a.x - 1, a.y - 1, 3, 3]);
    this.mark(this.solidCells, [a.x, a.y, 1, 1]);
  }
  npc(id: string, name: string, x: number, y: number, dir: Dir, seed: number, talk: Talk[]) {
    this.actor({ id, kind: "npc", name, x, y, dir, config: npcLook(seed), talk });
  }
  /** Fertigen Akteur übernehmen (Editor-Welten: Aussehen kommt aus der Konfiguration, nicht aus einem Seed). */
  addActor(a: Actor) {
    if (a.kind === "sign") this.actors.push(a);
    else this.actor(a);
  }
  chest(id: string, name: string, x: number, y: number, talk: Talk[]) {
    this.actor({ id, kind: "chest", name, x, y, dir: "down", talk });
  }
  /** Schild: liegt auf einem vorhandenen (soliden) Stempel und wird nur angesprochen. */
  sign(id: string, name: string, x: number, y: number, lines: string[]) {
    this.actors.push({ id, kind: "sign", name, x, y, dir: "down", talk: [{ step: "*", lines }] });
  }

  // ── Ränder ──
  /** Gesperrter Rand mit Bäumen davor (Wald/Dorf), Felswand (Höhle) oder Felsbrocken (Pass/Küste). */
  border(style: "trees" | "cave" | "rocks", thickness = 2) {
    const t = thickness;
    const rects: Rect[] = [
      [0, 0, this.cols, t], [0, this.rows - t, this.cols, t], [0, 0, t, this.rows], [this.cols - t, 0, t, this.rows],
    ];
    for (const r of rects) { this.blocked.push(r); this.mark(this.solidCells, r); }
    if (style === "cave") { this.wallRects.push(...rects); return; }
    if (style === "trees") {
      const tree: StampId = "tree";
      for (let x = -2; x < this.cols; x += 3) { this.stamps.push({ id: tree, x, y: -3 }); this.stamps.push({ id: tree, x, y: this.rows - 3 }); }
      for (let y = 2; y < this.rows - 3; y += 5) { this.stamps.push({ id: tree, x: -2, y }); this.stamps.push({ id: tree, x: this.cols - 1, y }); }
      return;
    }
    // rocks: Brocken entlang des Randes (nur Optik, die Sperre liegt schon im Rand)
    for (let x = 0; x < this.cols - 1; x += 2) {
      this.stamps.push({ id: this.rand() < 0.5 ? "rockBig" : "rockGrey", x, y: 0 });
      this.stamps.push({ id: this.rand() < 0.5 ? "rockBig" : "rockGrey", x, y: this.rows - 2 });
    }
    for (let y = 2; y < this.rows - 2; y += 2) {
      this.stamps.push({ id: "rockBig", x: 0, y });
      this.stamps.push({ id: "rockGrey", x: this.cols - 2, y });
    }
  }

  /** Höhlenwand-Kachel (gezeichnet als Wand und gesperrt). */
  wall(x: number, y: number) {
    if (!this.inMap(x, y)) return;
    this.wallRects.push([x, y, 1, 1]);
    this.blocked.push([x, y, 1, 1]);
    this.mark(this.solidCells, [x, y, 1, 1]);
  }

  block(x: number, y: number, w: number, h: number) { this.blocked.push([x, y, w, h]); this.mark(this.solidCells, [x, y, w, h]); }

  /** Fertig: Zuschauer-Plätze auf freien Wegzellen in gleichmäßigem Abstand. */
  build(spawn: { x: number; y: number }, crowdCount = 6): TeMap {
    const crowd: { x: number; y: number }[] = [];
    const cells: { x: number; y: number }[] = [];
    for (let y = 2; y < this.rows - 2; y++) {
      for (let x = 2; x < this.cols - 2; x++) {
        if (!this.solidCells[y][x] && this.ground[y][x] !== GROUND.base && Math.abs(x - spawn.x) + Math.abs(y - spawn.y) > 3) cells.push({ x, y });
      }
    }
    for (let i = 0; i < crowdCount && cells.length; i++) {
      const c = cells.splice(Math.floor(this.rand() * cells.length), 1)[0];
      if (!crowd.some((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) < 4)) crowd.push(c);
    }
    return {
      cols: this.cols, rows: this.rows, theme: this.theme, ground: this.ground,
      buildings: this.buildings, stamps: this.stamps, actors: this.actors,
      blocked: this.blocked, wallRects: this.wallRects, spawn, crowd,
    };
  }
}
