// ============================================
// Bearbeitungs-Operationen des Welten-Editors (rein, unveränderlich: jede Funktion liefert ein neues Dokument)
// ============================================

import { randomTeConfig } from "@/lib/te-character";
import { LIMITS, type CustomWorldDoc } from "./custom-world";
import { STAMPS, type StampDef, type StampId } from "./stamps";
import { allActorsOf, getTemplate, INTERIOR_LIMITS } from "./interior";
import type { Actor, Building, GroundType, Interior } from "./types";

export type ActorKind = Actor["kind"];

const inMap = (d: CustomWorldDoc, x: number, y: number) => x >= 0 && y >= 0 && x < d.cols && y < d.rows;

/** Boden mit quadratischem Pinsel (Kantenlänge `size`, um die Kachel zentriert) malen. */
export function paintGround(d: CustomWorldDoc, x: number, y: number, g: GroundType, size = 1): CustomWorldDoc {
  const half = Math.floor((size - 1) / 2);
  const ground = d.ground.slice();
  let changed = false;
  for (let yy = y - half; yy < y - half + size; yy++) {
    if (yy < 0 || yy >= d.rows) continue;
    let row = ground[yy];
    for (let xx = x - half; xx < x - half + size; xx++) {
      if (xx < 0 || xx >= d.cols || row[xx] === String(g)) continue;
      row = row.slice(0, xx) + g + row.slice(xx + 1);
      changed = true;
    }
    ground[yy] = row;
  }
  return changed ? { ...d, ground } : d;
}

/** Höhlenwand-Kachel setzen (`on`) oder entfernen. */
export function setWall(d: CustomWorldDoc, x: number, y: number, on: boolean): CustomWorldDoc {
  if (d.theme !== "cave" || !inMap(d, x, y)) return d;
  const has = d.walls.some(([wx, wy]) => wx === x && wy === y);
  if (on === has) return d;
  if (on && d.walls.length >= LIMITS.maxWalls) return d;
  return { ...d, walls: on ? [...d.walls, [x, y]] : d.walls.filter(([wx, wy]) => !(wx === x && wy === y)) };
}

export function placeStamp(d: CustomWorldDoc, id: StampId, x: number, y: number): CustomWorldDoc {
  if (!inMap(d, x, y) || d.stamps.length >= LIMITS.maxStamps) return d;
  if (d.stamps.some((s) => s.id === id && s.x === x && s.y === y)) return d;
  return { ...d, stamps: [...d.stamps, { id, x, y }] };
}

export function placeBuilding(d: CustomWorldDoc, b: Building): CustomWorldDoc {
  if (d.buildings.length >= LIMITS.maxBuildings) return d;
  if (b.x < 0 || b.y < 0 || b.x + b.w > d.cols || b.y + b.roofRows + 2 > d.rows) return d;
  return { ...d, buildings: [...d.buildings, b] };
}

export function nextActorId(d: CustomWorldDoc, kind: ActorKind): string {
  const base = kind === "npc" ? "npc" : kind === "merchant" ? "haendler" : kind === "chest" ? "kiste" : "schild";
  const used = new Set(allActorsOf({ actors: d.actors, buildings: d.buildings }).map((a) => a.id));
  for (let i = 1; i < 100; i++) if (!used.has(`${base}${i}`)) return `${base}${i}`;
  return `${base}${Date.now() % 100000}`;
}

/** Neuen NPC / neue Truhe / neues Schild setzen. Schilder bekommen gleich ihren festen Stempel dazu. */
export function placeActor(d: CustomWorldDoc, kind: ActorKind, x: number, y: number): { doc: CustomWorldDoc; id: string | null } {
  if (!inMap(d, x, y) || d.actors.length >= LIMITS.maxActors) return { doc: d, id: null };
  if ((kind === "npc" || kind === "merchant") && d.actors.filter((a) => a.kind === "npc" || a.kind === "merchant").length >= LIMITS.maxNpcs) return { doc: d, id: null };
  if (d.actors.some((a) => a.x === x && a.y === y)) return { doc: d, id: null };
  const id = nextActorId(d, kind);
  const actor: Actor =
    kind === "npc"
      ? { id, kind, name: "Neuer NPC", x, y, dir: "down", config: randomTeConfig(), talk: [{ step: "*", lines: ["Hallo!"] }] }
      : kind === "merchant"
        ? { id, kind, name: "Händler", x, y, dir: "down", config: randomTeConfig(), shop: [], talk: [{ step: "*", lines: ["Schau dich in Ruhe um!"] }] }
        : kind === "chest"
        ? { id, kind, name: "Truhe", x, y, dir: "down", talk: [{ step: "*", lines: ["Die Truhe ist leer."] }] }
        : { id, kind, name: "Schild", x, y, dir: "down", talk: [{ step: "*", lines: ["Ein Schild."] }] };
  let next: CustomWorldDoc = { ...d, actors: [...d.actors, actor] };
  if (kind === "sign") next = placeStamp(next, "sign", x, y);
  return { doc: next, id };
}

export function updateActor(d: CustomWorldDoc, id: string, patch: Partial<Actor>): CustomWorldDoc {
  return { ...d, actors: d.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
}

export function moveActor(d: CustomWorldDoc, id: string, x: number, y: number): CustomWorldDoc {
  const a = d.actors.find((o) => o.id === id);
  if (!a || !inMap(d, x, y) || (a.x === x && a.y === y) || d.actors.some((o) => o.id !== id && o.x === x && o.y === y)) return d;
  // Schild und sein Stempel gehören zusammen
  const stamps = a.kind === "sign" ? d.stamps.map((s) => (s.id === "sign" && s.x === a.x && s.y === a.y ? { ...s, x, y } : s)) : d.stamps;
  return { ...d, stamps, actors: d.actors.map((o) => (o.id === id ? { ...o, x, y } : o)) };
}

export function setSpawn(d: CustomWorldDoc, x: number, y: number): CustomWorldDoc {
  return inMap(d, x, y) ? { ...d, spawn: { x, y } } : d;
}

const stampCovers = (s: { id: StampId; x: number; y: number }, x: number, y: number) => {
  const def = STAMPS[s.id] as StampDef;
  return x >= s.x && x < s.x + def.w && y >= s.y && y < s.y + def.h;
};
const buildingCovers = (b: Building, x: number, y: number) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.roofRows + 2;

/** Was liegt auf dieser Kachel? (Akteur vor Gebäude vor Objekt vor Wand) */
export function hitTest(d: CustomWorldDoc, x: number, y: number):
  | { type: "actor"; id: string }
  | { type: "building"; index: number }
  | { type: "stamp"; index: number }
  | { type: "wall" }
  | null {
  const a = d.actors.find((o) => o.x === x && o.y === y);
  if (a) return { type: "actor", id: a.id };
  const bi = d.buildings.findIndex((b) => buildingCovers(b, x, y));
  if (bi >= 0) return { type: "building", index: bi };
  for (let i = d.stamps.length - 1; i >= 0; i--) if (stampCovers(d.stamps[i], x, y)) return { type: "stamp", index: i };
  if (d.walls.some(([wx, wy]) => wx === x && wy === y)) return { type: "wall" };
  return null;
}

/** Radierer: entfernt das oberste Ding auf der Kachel. */
export function removeAt(d: CustomWorldDoc, x: number, y: number): CustomWorldDoc {
  const hit = hitTest(d, x, y);
  if (!hit) return d;
  if (hit.type === "actor") {
    const a = d.actors.find((o) => o.id === hit.id)!;
    return {
      ...d,
      actors: d.actors.filter((o) => o.id !== hit.id),
      stamps: a.kind === "sign" ? d.stamps.filter((s) => !(s.id === "sign" && s.x === a.x && s.y === a.y)) : d.stamps,
    };
  }
  if (hit.type === "building") return { ...d, buildings: d.buildings.filter((_, i) => i !== hit.index) };
  if (hit.type === "stamp") return { ...d, stamps: d.stamps.filter((_, i) => i !== hit.index) };
  return setWall(d, x, y, false);
}

/** Kartengröße ändern: Boden wird beschnitten/aufgefüllt, Dinge außerhalb entfallen, der Start bleibt im Bild. */
export function resizeDoc(d: CustomWorldDoc, cols: number, rows: number): CustomWorldDoc {
  cols = Math.min(LIMITS.maxSide, Math.max(LIMITS.minSide, Math.round(cols)));
  rows = Math.min(LIMITS.maxSide, Math.max(LIMITS.minSide, Math.round(rows)));
  const ground = Array.from({ length: rows }, (_, y) => (d.ground[y] ?? "").slice(0, cols).padEnd(cols, "0"));
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
  return {
    ...d, cols, rows, ground,
    walls: d.walls.filter(([x, y]) => inside(x, y)),
    buildings: d.buildings.filter((b) => b.x + b.w <= cols && b.y + b.roofRows + 2 <= rows),
    stamps: d.stamps.filter((s) => inside(s.x, s.y)),
    actors: d.actors.filter((a) => inside(a.x, a.y)),
    spawn: { x: Math.min(d.spawn.x, cols - 1), y: Math.min(d.spawn.y, rows - 1) },
  };
}

/** Thema wechseln: Rand passend setzen; Höhlenwände entfallen beim Wechsel nach draußen. */
export function setTheme(d: CustomWorldDoc, theme: "outdoor" | "cave"): CustomWorldDoc {
  if (d.theme === theme) return d;
  return { ...d, theme, border: theme === "cave" ? "cave" : "trees", walls: theme === "cave" ? d.walls : [] };
}


// ── Innenräume ──────────────────────────────────────────────

/** Alle Akteure der Welt: draußen und in den Innenräumen (Reihenfolge: draußen zuerst). */
export const allActors = (d: CustomWorldDoc): Actor[] => allActorsOf({ actors: d.actors, buildings: d.buildings });

/** Wo ein Akteur steht: draußen oder in welchem Gebäude (Index). */
export function locateActor(d: CustomWorldDoc, id: string): { building: number | null } | null {
  if (d.actors.some((a) => a.id === id)) return { building: null };
  const bi = d.buildings.findIndex((b) => b.interior?.actors.some((a) => a.id === id));
  return bi >= 0 ? { building: bi } : null;
}

/** Akteur ändern, egal ob draußen oder in einem Innenraum. */
export function updateAnyActor(d: CustomWorldDoc, id: string, patch: Partial<Actor>): CustomWorldDoc {
  const loc = locateActor(d, id);
  if (!loc) return d;
  if (loc.building === null) return updateActor(d, id, patch);
  return updateInterior(d, loc.building, (it) => ({ ...it, actors: it.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
}

/** Auf alle Akteure (draußen + drinnen) dieselbe Umwandlung anwenden (z. B. beim Löschen von Quest-Schritten). */
export function mapAllActors(d: CustomWorldDoc, fn: (a: Actor) => Actor): CustomWorldDoc {
  return {
    ...d,
    actors: d.actors.map(fn),
    buildings: d.buildings.map((b) => (b.interior ? { ...b, interior: { ...b.interior, actors: b.interior.actors.map(fn) } } : b)),
  };
}

export function updateInterior(d: CustomWorldDoc, bi: number, fn: (it: Interior) => Interior): CustomWorldDoc {
  const b = d.buildings[bi];
  if (!b?.interior) return d;
  return { ...d, buildings: d.buildings.map((x, i) => (i === bi ? { ...x, interior: fn(x.interior!) } : x)) };
}

/** Kennungen der Akteure so umbenennen, dass sie in der ganzen Welt eindeutig sind (Vorlagen bringen feste Namen mit). */
export function withUniqueActorIds(d: CustomWorldDoc, actors: Actor[]): Actor[] {
  const used = new Set(allActors(d).map((a) => a.id));
  return actors.map((a) => {
    let id = a.id;
    for (let n = 2; used.has(id); n++) id = `${a.id.replace(/[0-9]+$/, "")}${n}`.slice(0, 24);
    used.add(id);
    return { ...a, id };
  });
}

/** Innenraum aus einer Vorlage anlegen (ersetzt einen vorhandenen). */
export function setInteriorFromTemplate(d: CustomWorldDoc, bi: number, templateId: string): CustomWorldDoc {
  const t = getTemplate(templateId);
  const b = d.buildings[bi];
  if (!t || !b) return d;
  // Akteure des alten Innenraums zählen nicht mehr mit, wenn neue Namen vergeben werden
  const without: CustomWorldDoc = { ...d, buildings: d.buildings.map((x, i) => (i === bi ? { ...x, interior: undefined } : x)) };
  const it = t.build();
  const freshActors = withUniqueActorIds(without, it.actors).map((a) => (a.kind === "npc" || a.kind === "merchant") && !a.config ? { ...a, config: randomTeConfig() } : a);
  return { ...without, buildings: without.buildings.map((x, i) => (i === bi ? { ...x, interior: { ...it, actors: freshActors } } : x)) };
}

export function removeInterior(d: CustomWorldDoc, bi: number): CustomWorldDoc {
  return { ...d, buildings: d.buildings.map((x, i) => {
    if (i !== bi || !x.interior) return x;
    const { interior: _drop, ...rest } = x;
    void _drop;
    return rest;
  }) };
}

const interiorInside = (it: Interior, x: number, y: number) => x >= 1 && y >= 2 && x <= it.cols - 2 && y <= it.rows - 2;

export function interiorPlaceStamp(d: CustomWorldDoc, bi: number, id: StampId, x: number, y: number): CustomWorldDoc {
  return updateInterior(d, bi, (it) => (x < 0 || y < 0 || x >= it.cols || y >= it.rows || it.stamps.length >= INTERIOR_LIMITS.maxStamps || it.stamps.some((s) => s.id === id && s.x === x && s.y === y) ? it : { ...it, stamps: [...it.stamps, { id, x, y }] }));
}

export function interiorPlaceActor(d: CustomWorldDoc, bi: number, kind: "npc" | "merchant" | "chest", x: number, y: number): { doc: CustomWorldDoc; id: string | null } {
  const it = d.buildings[bi]?.interior;
  if (!it || !interiorInside(it, x, y) || (x === it.exitX && y === it.rows - 2) || it.actors.length >= INTERIOR_LIMITS.maxActors) return { doc: d, id: null };
  if (it.actors.some((a) => a.x === x && a.y === y)) return { doc: d, id: null };
  if ((kind === "npc" || kind === "merchant") && allActors(d).filter((a) => a.kind === "npc" || a.kind === "merchant").length >= LIMITS.maxNpcs) return { doc: d, id: null };
  const id = nextActorId(d, kind);
  const actor: Actor =
    kind === "npc" ? { id, kind, name: "Neuer NPC", x, y, dir: "down", config: randomTeConfig(), talk: [{ step: "*", lines: ["Hallo!"] }] }
    : kind === "merchant" ? { id, kind, name: "Händler", x, y, dir: "down", config: randomTeConfig(), shop: [], talk: [{ step: "*", lines: ["Schau dich in Ruhe um!"] }] }
    : { id, kind, name: "Truhe", x, y, dir: "down", talk: [{ step: "*", lines: ["Die Truhe ist leer."] }] };
  return { doc: updateInterior(d, bi, (i) => ({ ...i, actors: [...i.actors, actor] })), id };
}

export function interiorMoveActor(d: CustomWorldDoc, bi: number, id: string, x: number, y: number): CustomWorldDoc {
  const it = d.buildings[bi]?.interior;
  if (!it || !interiorInside(it, x, y) || (x === it.exitX && y === it.rows - 2) || it.actors.some((a) => a.id !== id && a.x === x && a.y === y)) return d;
  return updateInterior(d, bi, (i) => ({ ...i, actors: i.actors.map((a) => (a.id === id ? { ...a, x, y } : a)) }));
}

/** Radierer im Innenraum: Akteur, sonst oberstes Objekt auf der Kachel. */
export function interiorRemoveAt(d: CustomWorldDoc, bi: number, x: number, y: number): CustomWorldDoc {
  return updateInterior(d, bi, (it) => {
    const a = it.actors.find((o) => o.x === x && o.y === y);
    if (a) return { ...it, actors: it.actors.filter((o) => o !== a) };
    for (let i = it.stamps.length - 1; i >= 0; i--) {
      const st = it.stamps[i];
      const def = STAMPS[st.id] as StampDef;
      if (x >= st.x && x < st.x + def.w && y >= st.y && y < st.y + def.h) return { ...it, stamps: it.stamps.filter((_, k) => k !== i) };
    }
    return it;
  });
}

/** Größe des Innenraums ändern: Dinge außerhalb entfallen, die Tür bleibt im Bild. */
export function resizeInterior(d: CustomWorldDoc, bi: number, cols: number, rows: number): CustomWorldDoc {
  cols = Math.min(INTERIOR_LIMITS.maxCols, Math.max(INTERIOR_LIMITS.minCols, Math.round(cols)));
  rows = Math.min(INTERIOR_LIMITS.maxRows, Math.max(INTERIOR_LIMITS.minRows, Math.round(rows)));
  return updateInterior(d, bi, (it) => {
    const exitX = Math.min(it.exitX, cols - 2);
    const next: Interior = { ...it, cols, rows, exitX };
    return {
      ...next,
      stamps: it.stamps.filter((s) => s.x < cols && s.y < rows),
      actors: it.actors.filter((a) => interiorInside(next, a.x, a.y) && !(a.x === exitX && a.y === rows - 2)),
    };
  });
}
