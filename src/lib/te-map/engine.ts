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
import { weatherMatches, type RollResult, type Weather } from "./rpg";
import { doorFront, doorTile, interiorSpawn, interiorToMap } from "./interior";
import { worldQuestsOf, type Actor, type Dir, type Talk, type TeMap, type WorldDef, type WorldQuest } from "./types";

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
}
export type GameEvent = { type: "advance"; quest: string; from: number } | { type: "complete"; quest: string };

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
  move: { fromX: number; fromY: number; toX: number; toY: number; elapsed: number } | null;
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
}

/** Begehbarkeit einer Karte (gesperrte Rechtecke, Gebäude, feste Objekte, Akteure). */
export function solidOfMap(map: TeMap): boolean[][] {
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
    world, map: world.map, scene: null, sceneChanges: 0, solid: buildSolid(world), px: world.map.spawn.x, py: world.map.spawn.y, dir: "down", move: null,
    questSteps: steps, flags: new Set(flags), night, weather, dialog: null, queue: [], events: [],
    actorDir: new Map(world.map.actors.map((a) => [a.id, a.dir])),
  };
}

export function isWalkable(game: Game, x: number, y: number): boolean {
  const { cols, rows } = game.map;
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
  game.move = { fromX: game.px, fromY: game.py, toX: tx, toY: ty, elapsed };
}

/** Gebäude betreten: Karte wechseln, vor die Innentür stellen. */
export function enterBuilding(game: Game, index: number): void {
  const b = game.world.map.buildings[index];
  if (!b?.interior) return;
  const map = interiorToMap(b.interior);
  game.scene = index;
  game.map = map;
  game.solid = solidOfMap(map);
  const sp = interiorSpawn(b.interior);
  game.px = sp.x; game.py = sp.y; game.dir = "up"; game.move = null;
  game.dialog = null; game.queue = [];
  for (const a of map.actors) if (!game.actorDir.has(a.id)) game.actorDir.set(a.id, a.dir);
  game.sceneChanges++;
}

/** Gebäude verlassen: zurück vor die Tür draußen. */
export function leaveBuilding(game: Game): void {
  if (game.scene === null) return;
  const b = game.world.map.buildings[game.scene];
  game.scene = null;
  game.map = game.world.map;
  game.solid = solidOfMap(game.world.map);
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

  const [fx, fy] = facingCell(game);
  const actor = game.map.actors.find((a) => a.x === fx && a.y === fy);
  if (!actor) return;
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
