// ============================================
// Vom Editor gebaute Welten: Dokument-Format, Prüfung, Umwandlung in eine spielbare WorldDef
// ============================================
// Rein (kein DOM, kein Prisma): der Editor, die API (Speichern/Einreichen) und der Server-Zugriff
// benutzen dieselben Funktionen. Nichts, was aus der Datenbank oder vom Client kommt, wird ungeprüft
// gespielt — `sanitizeCustomWorldDoc` baut das Dokument Feld für Feld neu auf und begrenzt alle Größen.

import { defaultTeConfig, sanitizeTeConfig } from "@/lib/te-character";
import { isItemKey } from "@/lib/dnd/items";
import { isAbility, isWeather } from "./rpg";
import { buildSolid, solidOfMap } from "./engine";
import { MapBuilder } from "./generate";
import { INSIDE_STAMP_IDS, STAMPS, type StampId } from "./stamps";
import { allActorsOf, INTERIOR_FLOORS, INTERIOR_LIMITS, INTERIOR_WALLS, interiorSpawn, interiorToMap } from "./interior";
import { stepsOf, worldQuestsOf } from "./types";
import { GROUND, type Actor, type Building, type Dir, type GroundType, type PlacedStamp, type Outcome, type Talk, type TalkChoice, type WorldDef, type WorldQuest } from "./types";

export const LIMITS = {
  minSide: 20,
  maxSide: 60,
  maxBuildings: 20,
  maxStamps: 500,
  maxWalls: 2000,
  maxActors: 16,
  maxNpcs: 10,
  maxTalks: 8,
  maxChoices: 4,
  maxFlags: 4,
  maxShop: 8,
  maxOutcomeXp: 50,
  maxOutcomeGold: 100,
  maxLines: 8,
  lineLen: 240,
  nameLen: 40,
  titleLen: 60,
  objectiveLen: 140,
  minSteps: 1,
  maxSteps: 8,
  maxQuests: 5,
  maxXp: 60,
  descLen: 200,
} as const;

export type BorderStyle = "none" | "trees" | "cave" | "rocks";

/** Schritt einer Quest im Editor: Gespräch in dieser Location oder Besuch einer anderen (Slug der Ziel-Location). */
export interface DocQuestStep { kind: "talk" | "visit"; text: string; location?: string }

export interface CustomWorldQuest {
  /** Kurze Kennung innerhalb der Location ("main" = die erste, deren Slug sich nie ändert) */
  id: string;
  title: string;
  steps: DocQuestStep[];
  /** Abschlusstext */
  done: string;
  xpReward: number;
}

/** Datenbank-Slug einer Quest der Location `slug`. "main" behält bei übernommenen festen Welten den alten Slug. */
export const docQuestSlug = (slug: string, id: string, mainSlug?: string): string => (id === "main" ? mainSlug ?? `welt-${slug}` : `welt-${slug}-${id}`);

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
  quests: CustomWorldQuest[];
}

export const FLAG_RE = /^[a-z0-9_-]{1,24}$/;

function sanitizeOutcome(v: unknown): Outcome {
  const o: Record<string, unknown> = isObj(v) ? v : {};
  const flags = (Array.isArray(o.flags) ? o.flags : []).filter((f): f is string => typeof f === "string" && FLAG_RE.test(f)).slice(0, LIMITS.maxFlags);
  const items = (Array.isArray(o.items) ? o.items : []).filter(isItemKey).slice(0, 2);
  const xp = int(o.xp, 0, LIMITS.maxOutcomeXp) ?? 0;
  const gold = int(o.gold, 0, LIMITS.maxOutcomeGold) ?? 0;
  return {
    lines: (Array.isArray(o.lines) ? o.lines : []).map((l) => text(l, LIMITS.lineLen)).filter(Boolean).slice(0, 4),
    ...(o.advance === true ? { advance: true } : {}),
    ...(flags.length ? { flags } : {}),
    ...(xp ? { xp } : {}),
    ...(gold ? { gold } : {}),
    ...(items.length ? { items } : {}),
  };
}

/** Antworten eines Dialogs: Text, optional Probe (Attribut + Schwierigkeitsgrad) und Ergebnisse. Belohnungen sind begrenzt
 *  und gelten je Charakter nur einmal pro Antwort (der Server merkt sich die Entscheidung). */
function sanitizeChoices(v: unknown): TalkChoice[] {
  if (!Array.isArray(v)) return [];
  const out: TalkChoice[] = [];
  for (const c of v.slice(0, LIMITS.maxChoices)) {
    if (!isObj(c)) continue;
    const t = text(c.text, 80);
    if (!t) continue;
    const check = isObj(c.check) && isAbility(c.check.ability) ? { ability: c.check.ability, dc: int(c.check.dc, 5, 25) ?? 12, ...(c.check.retry === true ? { retry: true } : {}) } : undefined;
    out.push({ text: t, ...(check ? { check } : {}), success: sanitizeOutcome(c.success), ...(check ? { fail: sanitizeOutcome(c.fail) } : {}) });
  }
  return out;
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
    quests: [{ id: "main", title: "Erste Aufgabe", steps: [{ kind: "talk", text: "Sprich mit dem Auftraggeber." }], done: "Abgeschlossen!", xpReward: 20 }],
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
  const rawBuildings: Record<string, unknown>[] = [];
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
    rawBuildings.push(b);
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

  // Quests (mehrere pro Location); alte Dokumente hatten genau eine unter `quest` mit `objectives`
  const rawQuests: unknown[] = Array.isArray(input.quests)
    ? input.quests
    : isObj(input.quest)
      ? [{
          id: "main", title: input.quest.title, xpReward: input.quest.xpReward,
          steps: (Array.isArray(input.quest.objectives) ? input.quest.objectives.slice(0, -1) : []).map((t: unknown) => ({ kind: "talk", text: t })),
          done: Array.isArray(input.quest.objectives) ? input.quest.objectives[input.quest.objectives.length - 1] : "",
        }]
      : [];
  if (rawQuests.length > LIMITS.maxQuests) fail(`Höchstens ${LIMITS.maxQuests} Quests pro Location.`);
  const quests: CustomWorldQuest[] = [];
  const questIds = new Set<string>();
  for (const [qi, rq] of rawQuests.slice(0, LIMITS.maxQuests).entries()) {
    if (!isObj(rq)) continue;
    let qid = typeof rq.id === "string" && /^[a-z0-9]{1,12}$/.test(rq.id) ? rq.id : "";
    if (!qid || questIds.has(qid)) qid = qi === 0 && !questIds.has("main") ? "main" : `q${qi + 1}`;
    while (questIds.has(qid)) qid += "x";
    questIds.add(qid);
    const stepsIn = Array.isArray(rq.steps) ? rq.steps : [];
    if (stepsIn.length < LIMITS.minSteps || stepsIn.length > LIMITS.maxSteps) fail(`Eine Quest braucht ${LIMITS.minSteps}–${LIMITS.maxSteps} Schritte.`);
    const qsteps: DocQuestStep[] = [];
    for (const [si, st] of stepsIn.slice(0, LIMITS.maxSteps).entries()) {
      const o: Record<string, unknown> = isObj(st) ? st : { text: st };
      const kind = o.kind === "visit" ? "visit" : "talk";
      const location = typeof o.location === "string" && /^[a-z0-9_-]{1,40}$/.test(o.location) ? o.location : undefined;
      if (kind === "visit" && !location) fail(`Quest „${text(rq.title, LIMITS.titleLen) || qid}“, Schritt ${si + 1}: Wähle die Location, die besucht werden soll.`);
      if (kind === "visit" && si === 0) fail("Der erste Quest-Schritt muss ein Gespräch sein (dort nimmt man die Quest an).");
      const t = text(o.text, LIMITS.objectiveLen);
      if (!t) fail(`Quest „${text(rq.title, LIMITS.titleLen) || qid}“, Schritt ${si + 1} hat keinen Text.`);
      qsteps.push({ kind, text: t, ...(kind === "visit" && location ? { location } : {}) });
    }
    while (qsteps.length < LIMITS.minSteps) qsteps.push({ kind: "talk", text: "" });
    const quest: CustomWorldQuest = {
      id: qid, title: text(rq.title, LIMITS.titleLen), steps: qsteps,
      done: text(rq.done, LIMITS.objectiveLen) || "Abgeschlossen!", xpReward: int(rq.xpReward, 0, LIMITS.maxXp) ?? 0,
    };
    if (!quest.title) fail("Jede Quest braucht einen Titel.");
    quests.push(quest);
  }
  if (!quests.length) fail("Die Location braucht mindestens eine Quest.");
  const stepsOfQuest = new Map(quests.map((q) => [q.id, q.steps]));
  const firstQuestId = quests[0]?.id ?? "main";

  // Akteure (draußen und in Innenräumen): Kennungen sind welt-weit eindeutig
  const ids = new Set<string>();
  let npcs = 0;
  const readActor = (a: unknown, area: { minX: number; minY: number; maxX: number; maxY: number }, allowSign: boolean): Actor | null => {
    if (!isObj(a)) return null;
    const kind = (a.kind === "chest" || (a.kind === "sign" && allowSign) || a.kind === "merchant") ? a.kind : "npc";
    const id = typeof a.id === "string" && /^[a-z0-9_-]{1,24}$/.test(a.id) ? a.id : "";
    const x = int(a.x, area.minX, area.maxX);
    const y = int(a.y, area.minY, area.maxY);
    if (!id || ids.has(id) || x === null || y === null) { fail("Ein Akteur ist ungültig und wurde entfernt."); return null; }
    if ((kind === "npc" || kind === "merchant") && ++npcs > LIMITS.maxNpcs) { fail(`Höchstens ${LIMITS.maxNpcs} NPCs pro Location.`); return null; }
    ids.add(id);
    const talk: Talk[] = [];
    for (const t of (Array.isArray(a.talk) ? a.talk : []).slice(0, LIMITS.maxTalks)) {
      if (!isObj(t)) continue;
      const qid = typeof t.quest === "string" && stepsOfQuest.has(t.quest) ? t.quest : firstQuestId;
      const qs = stepsOfQuest.get(qid) ?? [];
      // Dialoge gelten nur für Gesprächs-Schritte (Besuche zählt der Server)
      const step = t.step === "*" ? "*" : int(t.step, 0, qs.length - 1);
      if (typeof step === "number" && qs[step]?.kind === "visit") continue;
      const lines = (Array.isArray(t.lines) ? t.lines : []).map((l) => text(l, LIMITS.lineLen)).filter(Boolean).slice(0, LIMITS.maxLines);
      if (step === null || !lines.length) continue;
      const choices = sanitizeChoices(t.choices);
      const flagList = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((f): f is string => typeof f === "string" && FLAG_RE.test(f)))].slice(0, LIMITS.maxFlags) : []);
      const requires = flagList(t.requires);
      const forbids = flagList(t.forbids);
      talk.push({
        step, lines,
        ...(t.advance === true && step !== "*" && !choices.length ? { advance: true } : {}),
        ...(step !== "*" && qid !== firstQuestId ? { quest: qid } : {}),
        ...(choices.length ? { choices } : {}),
        ...(requires.length ? { requires } : {}),
        ...(forbids.length ? { forbids } : {}),
        ...(t.time === "day" || t.time === "night" ? { time: t.time } : {}),
        ...(isWeather(t.weather) ? { weather: t.weather } : {}),
      });
    }
    if (!talk.length) talk.push({ step: "*", lines: ["…"] });
    const actor: Actor = {
      id, kind, name: text(a.name, LIMITS.nameLen) || (kind === "npc" ? "NPC" : kind === "merchant" ? "Händler" : kind === "chest" ? "Truhe" : "Schild"),
      x, y, dir: DIRS.includes(a.dir as Dir) ? (a.dir as Dir) : "down", talk,
    };
    if (kind === "merchant") actor.shop = (Array.isArray(a.shop) ? a.shop : []).filter(isItemKey).filter((k, i, all) => all.indexOf(k) === i).slice(0, LIMITS.maxShop);
    if (kind === "npc" || kind === "merchant") {
      const cfg = sanitizeTeConfig(a.config);
      if (!cfg) { fail(`Das Aussehen von „${actor.name}“ ist ungültig.`); return null; }
      actor.config = cfg;
    }
    return actor;
  };

  const actors: Actor[] = [];
  for (const a of (Array.isArray(input.actors) ? input.actors : []).slice(0, LIMITS.maxActors)) {
    const actor = readActor(a, { minX: 0, minY: 0, maxX: cols - 1, maxY: rows - 1 }, true);
    if (actor) actors.push(actor);
  }

  // Innenräume der Gebäude
  const insideIds = new Set<string>(INSIDE_STAMP_IDS);
  buildings.forEach((building, bi) => {
    const raw = rawBuildings[bi].interior;
    if (!isObj(raw)) return;
    const icols = int(raw.cols, INTERIOR_LIMITS.minCols, INTERIOR_LIMITS.maxCols);
    const irows = int(raw.rows, INTERIOR_LIMITS.minRows, INTERIOR_LIMITS.maxRows);
    if (icols === null || irows === null) { fail(`Der Innenraum von „${building.name || "Gebäude"}“ hat eine ungültige Größe und wurde entfernt.`); return; }
    const exitX = int(raw.exitX, 1, icols - 2) ?? Math.floor(icols / 2);
    const istamps: PlacedStamp[] = [];
    for (const st of (Array.isArray(raw.stamps) ? raw.stamps : []).slice(0, INTERIOR_LIMITS.maxStamps)) {
      if (!isObj(st) || typeof st.id !== "string" || !insideIds.has(st.id)) continue;
      const sx = int(st.x, 0, icols - 1);
      const sy = int(st.y, 0, irows - 1);
      if (sx !== null && sy !== null) istamps.push({ id: st.id as StampId, x: sx, y: sy });
    }
    const iactors: Actor[] = [];
    for (const a of (Array.isArray(raw.actors) ? raw.actors : []).slice(0, INTERIOR_LIMITS.maxActors)) {
      const actor = readActor(a, { minX: 1, minY: 2, maxX: icols - 2, maxY: irows - 2 }, false);
      if (!actor) continue;
      if (actor.x === exitX && actor.y === irows - 2) { fail(`Ein Akteur in „${building.name || "Gebäude"}“ steht direkt vor der Tür und wurde entfernt.`); ids.delete(actor.id); continue; }
      iactors.push(actor);
    }
    building.interior = {
      template: typeof raw.template === "string" && /^[a-z]{1,20}$/.test(raw.template) ? raw.template : "leer",
      cols: icols, rows: irows, floor: int(raw.floor, 0, INTERIOR_FLOORS.length - 1) ?? 0, wall: int(raw.wall, 0, INTERIOR_WALLS.length - 1) ?? 0,
      stamps: istamps, actors: iactors, exitX,
    };
  });

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
      quests,
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
  const slugOf = (id: string) => docQuestSlug(slug, id, questSlug);
  const mapTalks = (a: Actor): Actor => ({ ...a, talk: a.talk.map((t) => (t.quest ? { ...t, quest: slugOf(t.quest) } : { ...t })) });
  for (const b of doc.buildings) m.building(b.interior ? { ...b, interior: { ...b.interior, actors: b.interior.actors.map(mapTalks) } } : b);
  for (const s of doc.stamps) m.place(s.id, s.x, s.y);
  for (const a of doc.actors) m.addActor(mapTalks(a));
  const worldQuests: WorldQuest[] = doc.quests.map((q) => ({
    slug: slugOf(q.id), title: q.title, xpReward: q.xpReward,
    objectives: [...q.steps.map((st) => st.text), q.done],
    steps: q.steps.map((st) => ({ kind: st.kind, text: st.text, ...(st.location ? { location: st.location } : {}) })),
  }));
  return { slug, title: doc.title, map: m.build(doc.spawn, 6), quest: worldQuests[0], extraQuests: worldQuests.slice(1) };
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
  // Innenräume: alle Akteure von der Tür aus erreichbar
  for (const b of doc.buildings) {
    const it = b.interior;
    if (!it) continue;
    const isolid = solidOfMap(interiorToMap(it));
    const sp = interiorSpawn(it);
    const seen = Array.from({ length: it.rows }, () => Array<boolean>(it.cols).fill(false));
    const stack: [number, number][] = [[sp.x, sp.y]];
    if (isolid[sp.y]?.[sp.x]) { errors.push(`Der Eingang von „${b.name || "Gebäude"}“ ist von innen blockiert.`); continue; }
    seen[sp.y][sp.x] = true;
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < it.cols && ny < it.rows && !isolid[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; stack.push([nx, ny]); }
      }
    }
    for (const a of it.actors) {
      const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[a.y + dy]?.[a.x + dx]);
      if (!ok) errors.push(`„${a.name}“ in „${b.name || "Gebäude"}“ ist von der Tür aus nicht erreichbar.`);
    }
  }
  const firstId = doc.quests[0]?.id;
  for (const q of doc.quests) {
    for (const [i, st] of q.steps.entries()) {
      if (st.kind === "visit") continue;
      const ok = allActorsOf({ actors: doc.actors, buildings: doc.buildings }).some((a) => a.talk.some((t) => t.step === i && (t.quest ?? firstId) === q.id && (t.advance || t.choices?.some((c) => c.success.advance))));
      if (!ok) errors.push(`Quest „${q.title}“, Schritt ${i + 1} lässt sich nicht abschließen: Ein Akteur braucht dafür einen Dialog für diese Quest und „Schritt ${i + 1}“ mit „Quest rückt weiter“.`);
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

  const idOfSlug = new Map(worldQuestsOf(world).map((q, i) => [q.slug, i === 0 ? "main" : `q${i + 1}`]));

  return {
    v: 1,
    title: world.title,
    description,
    cols: m.cols, rows: m.rows, theme: m.theme === "cave" ? "cave" : "outdoor", border, borderSize,
    ground: m.ground.map((row) => row.join("")),
    // Außer dem Rand gibt es in den festen Welten keine Wand-/Sperrflächen
    walls: [],
    buildings: JSON.parse(JSON.stringify(m.buildings)),
    stamps,
    actors: (JSON.parse(JSON.stringify(m.actors)) as Actor[]).map((a) => ({ ...a, talk: a.talk.map((t) => { const { quest, ...rest } = t; const id = quest ? idOfSlug.get(quest) : undefined; return id && id !== "main" ? { ...rest, quest: id } : rest; }) })),
    spawn: { ...m.spawn },
    quests: worldQuestsOf(world).map((q, i) => ({
      id: i === 0 ? "main" : `q${i + 1}`,
      title: q.title,
      steps: stepsOf(q).map((st) => ({ kind: st.kind, text: st.text, ...(st.location ? { location: st.location } : {}) })),
      done: q.objectives[q.objectives.length - 1],
      xpReward: q.xpReward,
    })),
  };
}
