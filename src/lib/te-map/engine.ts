// ============================================
// Spiel-Logik der begehbaren Welten: Kachel-Bewegung, Kollision, Interaktion, Quest-Schritte
// ============================================
// Rein (kein DOM, kein Zeichnen), damit testbar. Die Komponente ruft `step` pro Frame,
// `pressAction` bei Aktionstaste/Tippen und liest den Zustand zum Zeichnen. Fortschritte der Quests
// gibt der Engine nur als Ereignis weiter (`advance`); gespeichert wird auf dem Server.
//
// Mehrere Quests laufen gleichzeitig: `questSteps` hält den Schritt je Quest-Slug (0 = noch nicht
// angenommen, 1… = läuft, letzter = abgeschlossen). Ein Akteur kann für mehrere Quests gleichzeitig
// etwas zu sagen haben — die passenden Dialoge werden nacheinander gezeigt.

import { STAMPS, type StampDef } from "./stamps";
import { getMonster } from "@/lib/dnd/combat";
import { weatherMatches, type RollResult, type Weather } from "./rpg";
import { doorFront, doorTile, interiorSpawn, interiorToMap } from "./interior";
import { stepsOf, worldQuestsOf, type Actor, type Dir, type Talk, type TeMap, type WorldDef, type WorldQuest } from "./types";

export type { Dir };
export const DELTA: Record<Dir, [number, number]> = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };

/** Dauer, um eine Kachel zu durchqueren (ms). */
export const TILE_MS = 170;

export interface Dialog {
  speaker: string;
  lines: string[];
  index: number;
  /** Quest, die nach dem Dialog weiterrückt (nur wenn ihr Schritt noch `from` ist) */
  advance?: { quest: string; from: number };
  /** Quest-Angebot: nach der letzten Zeile entscheidet der Spieler (annehmen/ablehnen) */
  offer?: boolean;
  awaitingChoice?: boolean;
  /** Antworten am Ende des Dialogs (Entscheidungen/Proben) samt Bezug für die Auswertung */
  choices?: { text: string; check?: { ability: string; dc: number } }[];
  ref?: { actor: string; talk: number };
  awaitingChoices?: boolean;
  /** Antwort wurde gewählt, die Auswertung (Server) läuft noch */
  pending?: boolean;
  /** Wurf-Ergebnis, das über dem Text angezeigt wird */
  roll?: RollResult;
  /** Händler: nach dem Gespräch lässt sich handeln */
  merchant?: string;
  /** Monster-Figur: nach dem Text lässt sich kämpfen (Akteur + Monster-Art) */
  fight?: { actor: string; monster: string };
}
export type Goal = { kind: "talk"; actor: string } | { kind: "enter" } | { kind: "exit" };
export type GameEvent = { type: "advance"; quest: string; from: number; /** bei „Gebäude betreten“: Index des Gebäudes */ enter?: number } | { type: "complete"; quest: string };

/** Auswertung einer Antwort (vom Server bzw. im Testlauf lokal). */
export interface ChoiceResult {
  lines: string[];
  roll?: RollResult;
  flags?: string[];
  /** Neuer Quest-Stand (nur weiter, nie zurück) */
  questSteps?: Record<string, number>;
}

export interface Game {
  world: WorldDef;
  /** Aktuelle Karte: draußen die Welt, drinnen der Innenraum eines Gebäudes */
  map: TeMap;
  /** Index des Gebäudes, in dem die Figur gerade ist (null = draußen) */
  scene: number | null;
  /** Zählt bei jedem Betreten/Verlassen hoch (die Oberfläche blendet dann um und lädt die Karte neu) */
  sceneChanges: number;
  solid: boolean[][];
  px: number;
  py: number;
  dir: Dir;
  move: { fromX: number; fromY: number; toX: number; toY: number; elapsed: number; dur: number } | null;
  /** Geplanter Weg (Klick/Tippen zum Laufen): nächste Kacheln, ohne die aktuelle */
  path: [number, number][];
  /** Was nach dem Weg passiert: Akteur ansprechen, Gebäude betreten, Raum verlassen */
  goal: Goal | null;
  /** Lauftempo: 1 normal, > 1 sprinten */
  speed: number;
  /** Schritt je Quest-Slug (0 … objectives.length − 1; letzter = abgeschlossen) */
  questSteps: Record<string, number>;
  /** Erlebte Ereignisse des Charakters (schalten Dialoge frei/aus) */
  flags: Set<string>;
  /** Nacht? (schaltet Tag-/Nacht-Dialoge) */
  night: boolean;
  /** Aktuelles Wetter (schaltet Wetter-Dialoge) */
  weather: Weather;
  dialog: Dialog | null;
  /** Weitere Dialoge desselben Akteurs (andere Quests), die nach dem aktuellen folgen */
  queue: Dialog[];
  events: GameEvent[];
  /** Ausrichtung der NPCs (drehen sich beim Ansprechen zur Figur) */
  actorDir: Map<string, Dir>;
  /** Ausgeblendete Akteure (besiegte Monster): nicht ansprechbar, nicht im Weg */
  hidden: Set<string>;
}

/** Begehbarkeit einer Karte (gesperrte Rechtecke, Gebäude, feste Objekte, Akteure). */
export function solidOfMap(map: TeMap, hidden?: Set<string>): boolean[][] {
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
  for (const a of map.actors) if (a.kind !== "sign" && !hidden?.has(a.id)) mark(a.x, a.y, 1, 1);
  return solid;
}

export function buildSolid(world: WorldDef): boolean[][] { return solidOfMap(world.map); }

/** Anzahl der Schritte einer Quest (= Wert bei Abschluss). */
export function questLen(q: WorldQuest): number { return q.objectives.length - 1; }
/** Schrittzahl der ersten Quest der Welt. */
export function questLength(world: WorldDef): number { return questLen(world.quest); }

/** Quest, auf die sich ein Dialog bezieht (ohne Angabe: die erste der Welt). */
export const talkQuest = (world: WorldDef, t: Talk): string => t.quest ?? world.quest.slug;

export function createGame(world: WorldDef, questSteps: Record<string, number> = {}, flags: string[] = [], night = false, weather: Weather = "clear"): Game {
  const steps: Record<string, number> = {};
  for (const q of worldQuestsOf(world)) steps[q.slug] = Math.min(Math.max(0, questSteps[q.slug] ?? 0), questLen(q));
  return {
    world, map: world.map, scene: null, sceneChanges: 0, path: [], goal: null, speed: 1, solid: buildSolid(world), px: world.map.spawn.x, py: world.map.spawn.y, dir: "down", move: null,
    questSteps: steps, flags: new Set(flags), night, weather, dialog: null, queue: [], events: [],
    actorDir: new Map(world.map.actors.map((a) => [a.id, a.dir])), hidden: new Set(),
  };
}

/** Besiegte Monster ausblenden bzw. wieder einblenden (Begehbarkeit wird angepasst). */
export function setHidden(game: Game, ids: Iterable<string>): void {
  const next = new Set(ids);
  if (next.size === game.hidden.size && [...next].every((i) => game.hidden.has(i))) return;
  game.hidden = next;
  game.solid = solidOfMap(game.map, game.hidden);
}

export function isWalkable(game: Game, x: number, y: number): boolean {
  const { cols, rows } = game.map;
  if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
  return !game.solid[y][x];
}

/** Ein Frame: laufende Bewegung fortsetzen bzw. (bei gehaltener Richtung oder geplantem Weg) neue beginnen. */
export function step(game: Game, dtMs: number, held: Dir | null): void {
  // Eine gehaltene Richtung übernimmt die Steuerung und verwirft einen geplanten Weg
  if (held) { game.path = []; game.goal = null; }
  if (game.move) {
    game.move.elapsed += dtMs;
    if (game.move.elapsed < game.move.dur) return;
    const overshoot = game.move.elapsed - game.move.dur;
    game.px = game.move.toX;
    game.py = game.move.toY;
    game.move = null;
    if (game.dialog) return;
    // Übertrag in die nächste Kachel, damit das Laufen flüssig bleibt
    if (held) startMove(game, held, overshoot);
    else followPath(game, overshoot);
    return;
  }
  if (game.dialog) return;
  if (held) startMove(game, held, 0);
  else followPath(game, 0);
}

const dirTo = (dx: number, dy: number): Dir => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");

/** Figur zu einer Kachel drehen (für Ansprechen aus der Nähe, auch schräg). */
export function faceToward(game: Game, x: number, y: number): void {
  game.dir = dirTo(x - game.px, y - game.py);
}

/** Nächsten Schritt des geplanten Wegs gehen; am Ziel die vorgemerkte Handlung ausführen. */
function followPath(game: Game, elapsed: number): void {
  const next = game.path[0];
  if (next) {
    const dx = next[0] - game.px;
    const dy = next[1] - game.py;
    // Der Weg passt nicht mehr (Hindernis, Ortswechsel): abbrechen
    if (Math.abs(dx) + Math.abs(dy) !== 1 || !isWalkable(game, next[0], next[1])) { game.path = []; game.goal = null; return; }
    game.path.shift();
    startMove(game, dirTo(dx, dy), elapsed);
    return;
  }
  const goal = game.goal;
  if (!goal) return;
  game.goal = null;
  if (goal.kind === "talk") {
    const a = game.map.actors.find((o) => o.id === goal.actor);
    if (a && Math.max(Math.abs(a.x - game.px), Math.abs(a.y - game.py)) <= 1) { faceToward(game, a.x, a.y); pressAction(game); }
  } else if (goal.kind === "enter") {
    game.dir = "up";
    startMove(game, "up", 0);
  } else {
    game.dir = "down";
    startMove(game, "down", 0);
  }
}

function startMove(game: Game, dir: Dir, elapsed: number) {
  game.dir = dir;
  const [dx, dy] = DELTA[dir];
  const tx = game.px + dx;
  const ty = game.py + dy;
  // Drinnen: die Tür-Kachel unten führt hinaus
  if (game.scene !== null) {
    const it = game.world.map.buildings[game.scene]?.interior;
    if (it && tx === it.exitX && ty === it.rows - 1) { leaveBuilding(game); return; }
  }
  if (!isWalkable(game, tx, ty)) {
    // Draußen: gegen die Tür eines Gebäudes mit Innenraum laufen = eintreten
    if (game.scene === null && dir === "up") {
      const bi = game.world.map.buildings.findIndex((b) => b.interior && doorTile(b).x === tx && doorTile(b).y === ty);
      if (bi >= 0) enterBuilding(game, bi);
    }
    return;
  }
  game.move = { fromX: game.px, fromY: game.py, toX: tx, toY: ty, elapsed, dur: TILE_MS / Math.max(0.25, game.speed) };
}

/** Gebäude betreten: Karte wechseln, vor die Innentür stellen. */
export function enterBuilding(game: Game, index: number): void {
  const b = game.world.map.buildings[index];
  if (!b?.interior) return;
  const map = interiorToMap(b.interior);
  game.scene = index;
  game.map = map;
  game.solid = solidOfMap(map, game.hidden);
  const sp = interiorSpawn(b.interior);
  game.px = sp.x; game.py = sp.y; game.dir = "up"; game.move = null;
  game.dialog = null; game.queue = [];
  for (const a of map.actors) if (!game.actorDir.has(a.id)) game.actorDir.set(a.id, a.dir);
  game.sceneChanges++;
  completeEnterSteps(game, index);
}

/** Quests, deren aktueller Schritt „Gebäude betreten“ genau dieses Gebäude ist, rücken weiter (nur Schritt ≥ 1, die Quest muss angenommen sein). */
function completeEnterSteps(game: Game, building: number): void {
  for (const q of worldQuestsOf(game.world)) {
    const cur = game.questSteps[q.slug] ?? 0;
    const st = stepsOf(q)[cur];
    if (cur < 1 || !st || st.kind !== "enter" || st.building !== building) continue;
    game.questSteps[q.slug] = cur + 1;
    game.events.push({ type: "advance", quest: q.slug, from: cur, enter: building });
    if (game.questSteps[q.slug] === questLen(q)) game.events.push({ type: "complete", quest: q.slug });
  }
}

/** Gebäude verlassen: zurück vor die Tür draußen. */
export function leaveBuilding(game: Game): void {
  if (game.scene === null) return;
  const b = game.world.map.buildings[game.scene];
  game.scene = null;
  game.map = game.world.map;
  game.solid = solidOfMap(game.world.map, game.hidden);
  if (b) { const f = doorFront(b); game.px = f.x; game.py = f.y; }
  game.dir = "down"; game.move = null;
  game.dialog = null; game.queue = [];
  game.sceneChanges++;
}

/** Kachel, auf die die Figur schaut (im Stand). */
export function facingCell(game: Game): [number, number] {
  const [dx, dy] = DELTA[game.dir];
  return [game.px + dx, game.py + dy];
}

/** Kontext für Bedingungen von Dialogen (Ereignisse des Charakters, Tageszeit). */
export interface TalkContext { flags: ReadonlySet<string>; night: boolean; weather?: Weather }
const NO_CONTEXT: TalkContext = { flags: new Set(), night: false };

const talkAllowed = (t: Talk, ctx: TalkContext): boolean =>
  (!t.requires || t.requires.every((f) => ctx.flags.has(f))) &&
  (!t.forbids || !t.forbids.some((f) => ctx.flags.has(f))) &&
  (!t.time || (t.time === "night") === ctx.night) &&
  (!t.weather || weatherMatches(t.weather, ctx.weather ?? "clear"));

/** Wen man gerade ansprechen kann: den Akteur vor der Figur, sonst den nächsten in der Nachbarschaft (auch schräg). */
export function interactTarget(game: Game): Actor | null {
  if (game.move) return null;
  const [fx, fy] = facingCell(game);
  const ahead = game.map.actors.find((a) => a.x === fx && a.y === fy && !game.hidden.has(a.id));
  if (ahead) return ahead;
  let best: Actor | null = null;
  let bestD = Infinity;
  for (const a of game.map.actors) {
    if (game.hidden.has(a.id)) continue;
    const dx = Math.abs(a.x - game.px);
    const dy = Math.abs(a.y - game.py);
    if (Math.max(dx, dy) <= 1 && dx + dy < bestD) { best = a; bestD = dx + dy; }
  }
  return best;
}

/** Gebäude mit Innenraum, dessen Tür die Figur gerade ansteuert (nur draußen, Blick nach oben vor die Tür), sonst −1. */
export function doorAhead(game: Game): number {
  if (game.scene !== null || game.move || game.dir !== "up") return -1;
  return game.world.map.buildings.findIndex((b) => b.interior && doorFront(b).x === game.px && doorFront(b).y === game.py);
}

// ── Klick/Tippen zum Laufen: Wegsuche ──────────────────────

function bfs(game: Game, sx: number, sy: number, isTarget: (x: number, y: number) => boolean): [number, number][] | null {
  const { cols, rows } = game.map;
  const prev = new Map<number, number>();
  const key = (x: number, y: number) => y * cols + x;
  const queue: [number, number][] = [[sx, sy]];
  prev.set(key(sx, sy), -1);
  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y] = queue[qi];
    if (isTarget(x, y)) {
      const out: [number, number][] = [];
      let k = key(x, y);
      while (prev.get(k) !== -1) { out.push([k % cols, Math.floor(k / cols)]); k = prev.get(k)!; }
      return out.reverse();
    }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || prev.has(key(nx, ny)) || !isWalkable(game, nx, ny)) continue;
      prev.set(key(nx, ny), key(x, y));
      queue.push([nx, ny]);
    }
  }
  return null;
}

/** Zu einer angeklickten/angetippten Kachel laufen: freie Kachel = hingehen, Akteur = hingehen und ansprechen,
 *  Gebäude mit Innenraum = zur Tür und hinein, Tür im Innenraum = hinaus. Liefert, ob etwas geplant wurde. */
export function walkTo(game: Game, tx: number, ty: number): boolean {
  if (game.dialog) return false;
  const sx = game.move ? game.move.toX : game.px;
  const sy = game.move ? game.move.toY : game.py;
  const plan = (path: [number, number][] | null, goal: Goal | null): boolean => {
    if (!path) return false;
    game.path = path;
    game.goal = goal;
    return true;
  };

  const actor = game.map.actors.find((a) => a.x === tx && a.y === ty && !game.hidden.has(a.id));
  if (actor) {
    const near = (x: number, y: number) => Math.abs(x - actor.x) + Math.abs(y - actor.y) === 1;
    return plan(bfs(game, sx, sy, near), { kind: "talk", actor: actor.id });
  }
  if (game.scene === null) {
    const bi = game.world.map.buildings.findIndex((b) => b.interior && tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.roofRows + 2);
    if (bi >= 0) {
      const f = doorFront(game.world.map.buildings[bi]);
      return plan(bfs(game, sx, sy, (x, y) => x === f.x && y === f.y), { kind: "enter" });
    }
  } else {
    const it = game.world.map.buildings[game.scene]?.interior;
    if (it && tx === it.exitX && ty === it.rows - 1) {
      const sp = interiorSpawn(it);
      return plan(bfs(game, sx, sy, (x, y) => x === sp.x && y === sp.y), { kind: "exit" });
    }
  }
  if (!isWalkable(game, tx, ty)) return false;
  return plan(bfs(game, sx, sy, (x, y) => x === tx && y === ty), null);
}

/** Alle Dialoge des Akteurs, die jetzt gelten: je laufender/anstehender Quest der passende Schritt; nur wenn
 *  keiner passt, ein "*"-Dialog (sonst ein Platzhalter). Bedingungen (Ereignisse, Tageszeit) gelten für alle;
 *  abgeschlossene Quests melden sich nicht mehr. */
export function pickTalks(actor: Actor, questSteps: Record<string, number>, world: WorldDef, ctx: TalkContext = NO_CONTEXT): Talk[] {
  const allowed = actor.talk.filter((t) => talkAllowed(t, ctx));
  const matches = allowed.filter((t) => typeof t.step === "number" && questSteps[talkQuest(world, t)] === t.step);
  // Abgabe/Fortschritt vor Erinnerung vor Angebot: wer etwas abschließen kann, hört das zuerst
  matches.sort((a, b) => Number(!!b.advance && (b.step as number) > 0) - Number(!!a.advance && (a.step as number) > 0));
  if (matches.length) return matches;
  // Mehrere "*"-Dialoge mit verschiedenen Bedingungen: der erste passende (spezifischere stehen im Editor weiter oben)
  return [allowed.find((t) => t.step === "*") ?? { step: "*", lines: ["…"] }];
}

/** Erster passender Dialog (für Tests/Anzeige). */
export function pickTalk(actor: Actor, questSteps: Record<string, number>, world: WorldDef, ctx: TalkContext = NO_CONTEXT): Talk {
  return pickTalks(actor, questSteps, world, ctx)[0];
}

/** Ist die Truhe schon geöffnet? (= ihr Quest-Schritt wurde bereits abgeschlossen) */
export function isChestOpen(actor: Actor, questSteps: Record<string, number>, world: WorldDef): boolean {
  return actor.talk.some((t) => t.advance && typeof t.step === "number" && (questSteps[talkQuest(world, t)] ?? 0) > t.step);
}

const toDialog = (game: Game, actor: Actor, t: Talk): Dialog => {
  const hasChoices = !!t.choices?.length;
  return {
    speaker: actor.name,
    lines: t.lines,
    index: 0,
    // Mit Antworten rückt die Quest nur über deren Ergebnis weiter
    advance: !hasChoices && t.advance && typeof t.step === "number" ? { quest: talkQuest(game.world, t), from: t.step } : undefined,
    offer: !hasChoices && !!t.advance && t.step === 0,
    ...(actor.kind === "merchant" ? { merchant: actor.id } : {}),
    ...(hasChoices ? { choices: t.choices!.map((c) => ({ text: c.text, ...(c.check ? { check: { ability: c.check.ability, dc: c.check.dc } } : {}) })), ref: { actor: actor.id, talk: actor.talk.indexOf(t) } } : {}),
  };
};

function applyAdvance(game: Game, adv: Dialog["advance"]) {
  if (!adv) return;
  // Nur weiterrücken, wenn der Schritt noch derselbe ist (doppeltes Auslösen verhindern)
  if (game.questSteps[adv.quest] !== adv.from) return;
  game.questSteps[adv.quest] = adv.from + 1;
  game.events.push({ type: "advance", quest: adv.quest, from: adv.from });
  const q = worldQuestsOf(game.world).find((o) => o.slug === adv.quest);
  if (q && game.questSteps[adv.quest] === questLen(q)) game.events.push({ type: "complete", quest: adv.quest });
}

function closeDialog(game: Game, accepted: boolean) {
  const d = game.dialog;
  game.dialog = null;
  if (d && (accepted || !d.offer)) applyAdvance(game, d.advance);
  game.dialog = game.queue.shift() ?? null;
}

/** Aktionstaste: Dialog weiterblättern, sonst mit dem Akteur vor der Figur reden/etwas öffnen. */
export function pressAction(game: Game): void {
  if (game.move) return;
  const d = game.dialog;
  if (d) {
    if (d.awaitingChoice || d.awaitingChoices || d.pending) return;
    if (d.index < d.lines.length - 1) { d.index++; return; }
    if (d.choices?.length) { d.awaitingChoices = true; return; }
    if (d.offer && d.advance) { d.awaitingChoice = true; return; }
    closeDialog(game, true);
    return;
  }

  const actor = interactTarget(game);
  if (!actor) return;
  faceToward(game, actor.x, actor.y);
  const monster = actor.kind === "monster" && actor.monster ? getMonster(actor.monster) : undefined;
  if (monster) {
    game.dialog = { speaker: actor.name, lines: [`${monster.emoji} ${actor.name} — Stufe ${monster.level}, ${monster.hp} LP. ${monster.blurb}`], index: 0, fight: { actor: actor.id, monster: monster.id } };
    game.queue = [];
    return;
  }
  if (actor.kind === "npc" || actor.kind === "merchant") {
    // Der NPC dreht sich zur Figur
    game.actorDir.set(actor.id, ({ down: "up", up: "down", left: "right", right: "left" } as const)[game.dir]);
  }
  const [first, ...rest] = pickTalks(actor, game.questSteps, game.world, { flags: game.flags, night: game.night, weather: game.weather }).map((t) => toDialog(game, actor, t));
  game.dialog = first;
  game.queue = rest;
}

/** Antwort auf ein Quest-Angebot: annehmen (Quest startet) oder ablehnen (später erneut ansprechbar). */
export function answerOffer(game: Game, accept: boolean): void {
  if (!game.dialog?.awaitingChoice) return;
  closeDialog(game, accept);
}

/** Antwort gewählt: der Dialog wartet auf die Auswertung. Liefert, was ausgewertet werden soll (oder null). */
export function chooseOption(game: Game, index: number): { actor: string; talk: number; choice: number } | null {
  const d = game.dialog;
  if (!d?.awaitingChoices || !d.ref || !d.choices?.[index]) return null;
  d.awaitingChoices = false;
  d.pending = true;
  return { actor: d.ref.actor, talk: d.ref.talk, choice: index };
}

/** Auswertung übernehmen: Ereignisse/Quest-Stand merken und das Ergebnis (mit Wurf) als nächsten Dialog zeigen.
 *  Bei `null` (Fehler) wird die Wahl zurückgenommen. */
export function applyChoiceResult(game: Game, res: ChoiceResult | null): void {
  const d = game.dialog;
  if (!d?.pending) return;
  if (!res) { d.pending = false; d.awaitingChoices = true; return; }
  for (const f of res.flags ?? []) game.flags.add(f);
  for (const [q, st] of Object.entries(res.questSteps ?? {})) syncQuestStep(game, q, st);
  game.dialog = { speaker: d.speaker, lines: res.lines.length ? res.lines : ["…"], index: 0, roll: res.roll };
}

export function drainEvents(game: Game): GameEvent[] {
  const e = game.events;
  game.events = [];
  return e;
}

/** Vom Server bestätigter Stand: übernimmt den Schritt, wenn er weiter ist als der lokale. */
export function syncQuestStep(game: Game, quest: string, serverStep: number): void {
  const q = worldQuestsOf(game.world).find((o) => o.slug === quest);
  if (!q) return;
  const capped = Math.min(serverStep, questLen(q));
  if (capped > (game.questSteps[quest] ?? 0)) game.questSteps[quest] = capped;
}

/** Laufende Quests dieser Welt (angenommen, nicht abgeschlossen) mit ihrem aktuellen Ziel. */
export function activeQuestsOf(world: WorldDef, questSteps: Record<string, number>): { slug: string; title: string; objective: string; step: number; steps: number }[] {
  return worldQuestsOf(world).flatMap((q) => {
    const s = questSteps[q.slug] ?? 0;
    return s >= 1 && s < questLen(q) ? [{ slug: q.slug, title: q.title, objective: q.objectives[s], step: s, steps: questLen(q) }] : [];
  });
}
