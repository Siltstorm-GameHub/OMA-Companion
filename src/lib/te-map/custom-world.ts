// ============================================
// Vom Editor gebaute Welten: Dokument-Format, Prüfung, Umwandlung in eine spielbare WorldDef
// ============================================
// Rein (kein DOM, kein Prisma): der Editor, die API (Speichern/Einreichen) und der Server-Zugriff
// benutzen dieselben Funktionen. Nichts, was aus der Datenbank oder vom Client kommt, wird ungeprüft
// gespielt — `sanitizeCustomWorldDoc` baut das Dokument Feld für Feld neu auf und begrenzt alle Größen.

import { defaultTeConfig, sanitizeTeConfig } from "@/lib/te-character";
import { buildSolid } from "./engine";
import { MapBuilder } from "./generate";
import { STAMPS, type StampId } from "./stamps";
import { GROUND, type Actor, type Building, type Dir, type GroundType, type PlacedStamp, type Talk, type WorldDef } from "./types";

export const LIMITS = {
  minSide: 20,
  maxSide: 60,
  maxBuildings: 20,
  maxStamps: 500,
  maxWalls: 2000,
  maxActors: 16,
  maxNpcs: 10,
  maxTalks: 8,
  maxLines: 8,
  lineLen: 240,
  nameLen: 40,
  titleLen: 60,
  objectiveLen: 140,
  minSteps: 1,
  maxSteps: 6,
  maxXp: 60,
  descLen: 200,
} as const;

export type BorderStyle = "none" | "trees" | "cave" | "rocks";

export interface CustomWorldQuest {
  title: string;
  /** Ein Text je Schritt plus Abschlusstext (objectives.length = Schritte + 1). */
  objectives: string[];
  xpReward: number;
}

export interface CustomWorldDoc {
  v: 1;
  title: string;
  description: string;
  cols: number;
  rows: number;
  theme: "outdoor" | "cave";
  border: BorderStyle;
  /** Dicke des Rands in Kacheln (2–4) */
  borderSize: number;
  /** Eine Zeile je Kachelreihe, ein Zeichen (0–4 = GroundType) je Kachel. */
  ground: string[];
  /** Nur Höhle: Wandkacheln (gezeichnet als Wand, gesperrt). */
  walls: [number, number][];
  buildings: Building[];
  stamps: PlacedStamp[];
  actors: Actor[];
  spawn: { x: number; y: number };
  quest: CustomWorldQuest;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const DIRS: Dir[] = ["down", "left", "right", "up"];

export function defaultCustomWorldDoc(theme: "outdoor" | "cave" = "outdoor", cols = 30, rows = 24): CustomWorldDoc {
  return {
    v: 1,
    title: "Neue Location",
    description: "",
    cols, rows, theme,
    border: theme === "cave" ? "cave" : "trees",
    borderSize: 2,
    ground: Array.from({ length: rows }, () => "0".repeat(cols)),
    walls: [],
    buildings: [],
    stamps: [],
    actors: [
      {
        id: "npc1", kind: "npc", name: "Auftraggeber", x: Math.floor(cols / 2), y: Math.floor(rows / 2), dir: "down",
        config: defaultTeConfig(),
        talk: [
          { step: 0, lines: ["Hallo! Kannst du mir helfen?"], advance: true },
          { step: "*", lines: ["Danke für deine Hilfe!"] },
        ],
      },
    ],
    spawn: { x: Math.floor(cols / 2), y: Math.floor(rows / 2) + 3 },
    quest: { title: "Erste Aufgabe", objectives: ["Sprich mit dem Auftraggeber.", "Abgeschlossen!"], xpReward: 20 },
  };
}

/** Baut das Dokument aus unbekannter Eingabe neu auf. Ungültige Teile werden entfernt und als `warnings`
 *  gemeldet (Entwürfe dürfen unfertig gespeichert werden; zum Einreichen muss `warnings` leer sein). Nur eine
 *  unbrauchbare Grundstruktur ist ein harter Fehler. */
export function sanitizeCustomWorldDoc(input: unknown): { ok: true; doc: CustomWorldDoc; warnings: string[] } | { ok: false; errors: string[] } {
  const warnings: string[] = [];
  const fail = (m: string) => { warnings.push(m); };
  if (!isObj(input)) return { ok: false, errors: ["Ungültiges Dokument."] };

  const cols = int(input.cols, LIMITS.minSide, LIMITS.maxSide);
  const rows = int(input.rows, LIMITS.minSide, LIMITS.maxSide);
  if (cols === null || rows === null) return { ok: false, errors: [`Die Karte muss ${LIMITS.minSide}–${LIMITS.maxSide} Kacheln breit und hoch sein.`] };
  const theme = input.theme === "cave" ? "cave" : "outdoor";
  let border: BorderStyle = input.border === "trees" || input.border === "cave" || input.border === "rocks" ? input.border : "none";
  // Rand und Thema müssen zusammenpassen (Höhlenwand nur in der Höhle, Bäume nur draußen)
  if ((border === "cave" && theme !== "cave") || (border === "trees" && theme === "cave")) border = theme === "cave" ? "cave" : "trees";

  const borderSize = int(input.borderSize, 2, 4) ?? 2;

  const groundIn = Array.isArray(input.ground) ? input.ground : [];
  const ground: string[] = [];
  for (let y = 0; y < rows; y++) {
    const row = typeof groundIn[y] === "string" ? (groundIn[y] as string) : "";
    let out = "";
    for (let x = 0; x < cols; x++) {
      const c = row[x];
      out += c !== undefined && c >= "0" && c <= "4" ? c : "0";
    }
    ground.push(out);
  }

  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;

  const walls: [number, number][] = [];
  if (theme === "cave" && Array.isArray(input.walls)) {
    const seen = new Set<string>();
    for (const w of input.walls.slice(0, LIMITS.maxWalls)) {
      if (!Array.isArray(w) || !Number.isInteger(w[0]) || !Number.isInteger(w[1]) || !inMap(w[0], w[1])) continue;
      const k = `${w[0]},${w[1]}`;
      if (!seen.has(k)) { seen.add(k); walls.push([w[0], w[1]]); }
    }
  }

  const buildings: Building[] = [];
  for (const b of (Array.isArray(input.buildings) ? input.buildings : []).slice(0, LIMITS.maxBuildings)) {
    if (!isObj(b)) continue;
    const w = int(b.w, 3, 12);
    const roofRows = int(b.roofRows, 2, 4);
    const x = int(b.x, 0, cols - 1);
    const y = int(b.y, 0, rows - 1);
    const roof = isObj(b.roof) ? { k: int(b.roof.k, 0, 7), r: b.roof.r === 2 ? 2 : 0 } : null;
    const wall = isObj(b.wall) ? { k: int(b.wall.k, 0, 7), r: b.wall.r === 3 ? 3 : 1 } : null;
    if (w === null || roofRows === null || x === null || y === null || !roof || roof.k === null || !wall || wall.k === null) { fail("Ein Gebäude ist ungültig und wurde entfernt."); continue; }
    if (x + w > cols || y + roofRows + 2 > rows) { fail(`Das Gebäude „${text(b.name, LIMITS.nameLen) || "?"}“ ragt aus der Karte.`); continue; }
    const doorDx = int(b.doorDx, 0, w - 1) ?? Math.floor(w / 2);
    const windowDx = (Array.isArray(b.windowDx) ? b.windowDx : []).filter((d): d is number => Number.isInteger(d) && d >= 0 && d < w && d !== doorDx).slice(0, 4);
    const sign = typeof b.sign === "string" && ["shopSword", "shopInn", "shopMug"].includes(b.sign) ? (b.sign as StampId) : undefined;
    buildings.push({ x, y, w, roofRows, roof: { k: roof.k, r: roof.r }, wall: { k: wall.k, r: wall.r }, doorDx, windowDx, ...(sign ? { sign } : {}), name: text(b.name, LIMITS.nameLen) });
  }

  const stamps: PlacedStamp[] = [];
  for (const s of (Array.isArray(input.stamps) ? input.stamps : []).slice(0, LIMITS.maxStamps)) {
    if (!isObj(s) || typeof s.id !== "string" || !Object.prototype.hasOwnProperty.call(STAMPS, s.id)) continue;
    if (!Number.isInteger(s.x) || !Number.isInteger(s.y)) continue;
    const x = s.x as number;
    const y = s.y as number;
    if (!inMap(x, y)) continue;
    stamps.push({ id: s.id as StampId, x, y });
  }

  // Quest
  const q = isObj(input.quest) ? input.quest : {};
  const objectivesIn = Array.isArray(q.objectives) ? q.objectives.map((o) => text(o, LIMITS.objectiveLen)) : [];
  if (objectivesIn.length < LIMITS.minSteps + 1 || objectivesIn.length > LIMITS.maxSteps + 1) fail(`Die Quest braucht ${LIMITS.minSteps}–${LIMITS.maxSteps} Schritte.`);
  const objectives = objectivesIn.slice(0, LIMITS.maxSteps + 1);
  while (objectives.length < LIMITS.minSteps + 1) objectives.push("");
  const steps = objectives.length - 1;
  objectives[steps] = objectives[steps] || "Abgeschlossen!";
  for (let i = 0; i < steps; i++) if (!objectives[i]) fail(`Quest-Schritt ${i + 1} hat keinen Text.`);
  const quest: CustomWorldQuest = {
    title: text(q.title, LIMITS.titleLen),
    objectives,
    xpReward: int(q.xpReward, 0, LIMITS.maxXp) ?? 0,
  };
  if (!quest.title) fail("Die Quest braucht einen Titel.");

  // Akteure
  const actors: Actor[] = [];
  const ids = new Set<string>();
  let npcs = 0;
  for (const a of (Array.isArray(input.actors) ? input.actors : []).slice(0, LIMITS.maxActors)) {
    if (!isObj(a)) continue;
    const kind = a.kind === "chest" || a.kind === "sign" ? a.kind : "npc";
    const id = typeof a.id === "string" && /^[a-z0-9_-]{1,24}$/.test(a.id) ? a.id : "";
    const x = int(a.x, 0, cols - 1);
    const y = int(a.y, 0, rows - 1);
    if (!id || ids.has(id) || x === null || y === null) { fail("Ein Akteur ist ungültig und wurde entfernt."); continue; }
    if (kind === "npc" && ++npcs > LIMITS.maxNpcs) { fail(`Höchstens ${LIMITS.maxNpcs} NPCs pro Location.`); continue; }
    ids.add(id);
    const talk: Talk[] = [];
    for (const t of (Array.isArray(a.talk) ? a.talk : []).slice(0, LIMITS.maxTalks)) {
      if (!isObj(t)) continue;
      const step = t.step === "*" ? "*" : int(t.step, 0, steps - 1);
      const lines = (Array.isArray(t.lines) ? t.lines : []).map((l) => text(l, LIMITS.lineLen)).filter(Boolean).slice(0, LIMITS.maxLines);
      if (step === null || !lines.length) continue;
      talk.push({ step, lines, ...(t.advance === true && step !== "*" ? { advance: true } : {}) });
    }
    if (!talk.length) talk.push({ step: "*", lines: ["…"] });
    const actor: Actor = {
      id, kind, name: text(a.name, LIMITS.nameLen) || (kind === "npc" ? "NPC" : kind === "chest" ? "Truhe" : "Schild"),
      x, y, dir: DIRS.includes(a.dir as Dir) ? (a.dir as Dir) : "down", talk,
    };
    if (kind === "npc") {
      const cfg = sanitizeTeConfig(a.config);
      if (!cfg) { fail(`Das Aussehen von „${actor.name}“ ist ungültig.`); continue; }
      actor.config = cfg;
    }
    actors.push(actor);
  }

  const spawn = isObj(input.spawn) ? { x: int(input.spawn.x, 0, cols - 1), y: int(input.spawn.y, 0, rows - 1) } : { x: null, y: null };
  if (spawn.x === null || spawn.y === null) fail("Der Startpunkt fehlt.");

  return {
    ok: true,
    warnings,
    doc: {
      v: 1,
      title: text(input.title, LIMITS.titleLen),
      description: text(input.description, LIMITS.descLen),
      cols, rows, theme, border, borderSize, ground, walls, buildings, stamps, actors,
      spawn: { x: spawn.x!, y: spawn.y! },
      quest,
    },
  };
}

/** Dokument → spielbare Welt (dieselbe Datenform wie die festen Welten). */
/** `questSlug` nur für übernommene feste Welten, deren Quest-Slug nicht dem Schema "welt-<slug>" folgt. */
export function docToWorld(doc: CustomWorldDoc, slug = "vorschau", questSlug?: string): WorldDef {
  const m = new MapBuilder(doc.cols, doc.rows, doc.theme, 1);
  for (let y = 0; y < doc.rows; y++) {
    for (let x = 0; x < doc.cols; x++) {
      const g = Number(doc.ground[y][x]) as GroundType;
      if (g !== GROUND.base) m.fill(g, x, y, 1, 1);
    }
  }
  if (doc.border !== "none") m.border(doc.border, doc.borderSize);
  for (const [x, y] of doc.walls) m.wall(x, y);
  for (const b of doc.buildings) m.building(b);
  for (const s of doc.stamps) m.place(s.id, s.x, s.y);
  for (const a of doc.actors) m.addActor(a);
  return {
    slug,
    title: doc.title,
    map: m.build(doc.spawn, 6),
    quest: { slug: questSlug ?? `welt-${slug}`, title: doc.quest.title, objectives: doc.quest.objectives, xpReward: doc.quest.xpReward },
  };
}

/** Spielbarkeit prüfen: Startpunkt frei, alle Akteure und Türen erreichbar, jeder Quest-Schritt auslösbar. */
export function checkPlayable(doc: CustomWorldDoc): string[] {
  const errors: string[] = [];
  const world = docToWorld(doc);
  const solid = buildSolid(world);
  const { cols, rows } = doc;
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && !solid[y][x];

  if (!free(doc.spawn.x, doc.spawn.y)) {
    errors.push("Der Startpunkt liegt auf einem Hindernis.");
    return errors;
  }
  const reach = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const queue: [number, number][] = [[doc.spawn.x, doc.spawn.y]];
  reach[doc.spawn.y][doc.spawn.x] = true;
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (free(nx, ny) && !reach[ny][nx]) { reach[ny][nx] = true; queue.push([nx, ny]); }
    }
  }
  const touchable = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => free(x + dx, y + dy) && reach[y + dy][x + dx]);

  for (const a of doc.actors) {
    if (!touchable(a.x, a.y)) errors.push(`„${a.name}“ ist vom Startpunkt aus nicht erreichbar.`);
  }
  for (const b of doc.buildings) {
    const dx = b.x + b.doorDx;
    const dy = b.y + b.roofRows + 2;
    if (!(free(dx, dy) && reach[dy][dx])) errors.push(`Vor der Tür von „${b.name || "Gebäude"}“ ist kein erreichbarer Platz.`);
  }
  const steps = doc.quest.objectives.length - 1;
  for (let s = 0; s < steps; s++) {
    if (!doc.actors.some((a) => a.talk.some((t) => t.step === s && t.advance))) {
      errors.push(`Quest-Schritt ${s + 1} lässt sich nicht abschließen: Ein Akteur braucht dafür einen Dialog mit „Schritt ${s + 1}“ und „Quest rückt weiter“.`);
    }
  }
  return errors;
}

/** Vollständige Prüfung fürs Einreichen. */
export function validateForSubmit(input: unknown): { ok: true; doc: CustomWorldDoc } | { ok: false; errors: string[] } {
  const s = sanitizeCustomWorldDoc(input);
  if (!s.ok) return s;
  const errors: string[] = [...s.warnings];
  if (!s.doc.title) errors.push("Die Location braucht einen Namen.");
  if (!s.doc.actors.some((a) => a.kind === "npc")) errors.push("Mindestens ein NPC wird gebraucht (Auftraggeber).");
  errors.push(...checkPlayable(s.doc));
  return errors.length ? { ok: false, errors } : { ok: true, doc: s.doc };
}

/** Fest eingebaute Welt → Editor-Dokument (damit Admins auch die vordefinierten Locations bearbeiten können).
 *  Der Rand wird als Stil + Dicke übernommen, seine Bäume/Felsen werden nicht doppelt als Objekte gespeichert. */
export function worldToDoc(world: WorldDef, description = ""): CustomWorldDoc {
  const m = world.map;
  const edge = m.blocked.find((r) => r[0] === 0 && r[1] === 0 && r[2] === m.cols);
  const borderSize = edge ? Math.min(4, Math.max(2, edge[3])) : 2;
  const border: BorderStyle = !edge ? "none" : m.theme === "cave" ? "cave" : m.stamps.some((s) => s.id === "tree" && s.y === -3) ? "trees" : "rocks";

  let stamps = m.stamps.map((s) => ({ ...s }));
  if (border === "trees" || border === "rocks") {
    // Vom Rand-Generator erzeugte Objekte je genau einmal entfernen (gleiche Positionen)
    const gen = new MapBuilder(m.cols, m.rows, m.theme, 0);
    gen.border(border, borderSize);
    for (const g of gen.build(m.spawn, 0).stamps) {
      const i = stamps.findIndex((s) => s.x === g.x && s.y === g.y && (border === "trees" ? s.id === "tree" : s.id === "rockBig" || s.id === "rockGrey"));
      if (i >= 0) stamps.splice(i, 1);
    }
  }
  stamps = stamps.filter((s) => s.x >= 0 && s.y >= 0 && s.x < m.cols && s.y < m.rows);

  return {
    v: 1,
    title: world.title,
    description,
    cols: m.cols, rows: m.rows, theme: m.theme, border, borderSize,
    ground: m.ground.map((row) => row.join("")),
    // Außer dem Rand gibt es in den festen Welten keine Wand-/Sperrflächen
    walls: [],
    buildings: JSON.parse(JSON.stringify(m.buildings)),
    stamps,
    actors: JSON.parse(JSON.stringify(m.actors)),
    spawn: { ...m.spawn },
    quest: { title: world.quest.title, objectives: [...world.quest.objectives], xpReward: world.quest.xpReward },
  };
}
