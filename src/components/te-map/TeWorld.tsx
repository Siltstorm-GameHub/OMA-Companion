"use client";

// ============================================
// Begehbare Welt einer Location: Zeichnen, Eingabe, Dialog, Quest
// ============================================
// Logik liegt in lib/te-map/engine.ts, Karten in lib/te-map/worlds.ts. Hier: Kacheln laden, statische
// Ebene (Boden, Wege, Wände, Häuser) einmal vorzeichnen, pro Frame Figuren/Objekte nach Fußlinie
// sortiert darüberzeichnen, Kamera folgt der Figur. Die Zeichenfläche hat logische Größe (13×9
// Kacheln) und wird per CSS pixelscharf hochskaliert. Quest-Schritte werden dem Server gemeldet.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { drawTeFrame, layersFor, loadTeLayerSets, type TeLayerSets } from "@/components/te-character/TeCharacter";
import { TE_ANIMS, type TeCharacterConfig } from "@/lib/te-character";
import { groundQuarters, wallQuarters, type Quarters } from "@/lib/te-map/autotile";
import { activeQuestsOf, answerOffer, applyChoiceResult, chooseOption, createGame, drainEvents, isChestOpen, pressAction, step, syncQuestStep, TILE_MS, type ChoiceResult, type Dialog, type Dir, type Game } from "@/lib/te-map/engine";
import type { TrackerItem } from "@/lib/dnd/quest-log";
import type { WorldEventView } from "@/lib/dnd/world-events";
import { ABILITY_LABEL, berlinHour, darkness, isAbility, isNight, weatherFor, WEATHER_ICON, WEATHER_LABEL, type Biome, type Weather } from "@/lib/te-map/rpg";
import { STAMPS, type StampDef, type StampId, type TileSheet } from "@/lib/te-map/stamps";
import { allActorsOf, INTERIOR_FLOORS, INTERIOR_WALLS, wallTilesAt } from "@/lib/te-map/interior";
import { CAVE_WALL_TILES, THEMES } from "@/lib/te-map/themes";
import { worldQuestsOf, type Interior, type WorldDef } from "@/lib/te-map/types";

export const T = 16;
/** Sichtfenster in Kacheln (Standard); die Karte darf größer sein, die Kamera folgt der Figur. */
const DEFAULT_VIEW_W = 13;
const DEFAULT_VIEW_H = 9;

const SHEET_FILES = {
  a2: "/te/tiles/tileA2.png",
  a2caves: "/te/tiles/tileA2_caves.png",
  a3: "/te/tiles/tileA3.png",
  a5cave: "/te/tiles/tileA5_cave1.png",
  out: "/te/tiles/tileB_outside.png",
  town: "/te/tiles/tileB_town.png",
  cave: "/te/tiles/tileB_cave1.png",
  chests: "/te/tiles/chests.png",
  inside: "/te/tiles/tileB_inside.png",
  a5inside: "/te/tiles/tileA5_inside.png",
} as const;
type SheetKey = keyof typeof SHEET_FILES;
export type Sheets = Record<SheetKey, HTMLImageElement>;

let sheetsPromise: Promise<Sheets> | null = null;
/** Kachelbilder einmal laden und für alle Welten wiederverwenden. */
export function loadSheets(): Promise<Sheets> {
  sheetsPromise ??= Promise.all(
    Object.entries(SHEET_FILES).map(
      ([k, src]) =>
        new Promise<readonly [string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([k, img]);
          img.onerror = () => reject(new Error(`Bild fehlt: ${src}`));
          img.src = src;
        }),
    ),
  ).then((entries) => Object.fromEntries(entries) as Sheets).catch((e) => { sheetsPromise = null; throw e; });
  return sheetsPromise;
}

function drawQuarters(ctx: CanvasRenderingContext2D, img: HTMLImageElement, bx: number, by: number, q: Quarters, dx: number, dy: number) {
  for (let i = 0; i < 4; i++) {
    ctx.drawImage(img, bx + q[i][0] * 8, by + q[i][1] * 8, 8, 8, dx + (i % 2) * 8, dy + (i >> 1) * 8, 8, 8);
  }
}

/** Stempel an Pixelposition (x, y) — obere linke Ecke — zeichnen. */
export function drawStamp(ctx: CanvasRenderingContext2D, sheets: Sheets, id: StampId, x: number, y: number) {
  const s = STAMPS[id] as StampDef;
  if (s.parts) {
    for (const p of s.parts) ctx.drawImage(sheets[s.sheet as TileSheet], p.sx * T, p.sy * T, p.w * T, p.h * T, x + p.dx * T, y + p.dy * T, p.w * T, p.h * T);
    return;
  }
  ctx.drawImage(sheets[s.sheet as TileSheet], s.sx * T, s.sy * T, s.w * T, s.h * T, x, y, s.w * T, s.h * T);
}

/** Boden, Wege, Wände und Häuser einmal in eine große Zeichenfläche vorzeichnen. */
export function bakeStatic(sheets: Sheets, world: WorldDef): HTMLCanvasElement {
  const m = world.map;
  const theme = THEMES[m.theme === "cave" ? "cave" : "outdoor"];
  const groundImg = sheets[theme.sheet];
  const c = document.createElement("canvas");
  c.width = m.cols * T;
  c.height = m.rows * T;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) ctx.drawImage(groundImg, theme.base[0], theme.base[1], T, T, x * T, y * T, T, T);

  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      const type = m.ground[y][x];
      const block = theme.blocks[type];
      if (!block) continue;
      // Außerhalb der Karte zählt als gleiche Fläche, damit Wege bis zum Rand durchlaufen.
      const same = (dx: number, dy: number) => (m.ground[y + dy]?.[x + dx] ?? type) === type;
      drawQuarters(ctx, groundImg, block[0], block[1], groundQuarters(same), x * T, y * T);
    }
  }

  // Höhlenwände
  for (const [rx, ry, rw, rh] of m.wallRects) {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const [tx, ty] = CAVE_WALL_TILES[(x * 7 + y * 13) % CAVE_WALL_TILES.length];
        ctx.drawImage(sheets.a5cave, tx * T, ty * T, T, T, x * T, y * T, T, T);
      }
    }
  }

  for (const b of m.buildings) {
    const rows = b.roofRows + 2;
    for (let j = 0; j < rows; j++) {
      const isRoof = j < b.roofRows;
      const blk = isRoof ? b.roof : b.wall;
      const rowStart = isRoof ? 0 : b.roofRows;
      const rowCount = isRoof ? b.roofRows : 2;
      for (let i = 0; i < b.w; i++) {
        const same = (dx: number, dy: number) => i + dx >= 0 && i + dx < b.w && j - rowStart + dy >= 0 && j - rowStart + dy < rowCount;
        drawQuarters(ctx, sheets.a3, blk.k * 32, blk.r * 32, wallQuarters(same), (b.x + i) * T, (b.y + j) * T);
      }
    }
    for (const dx of b.windowDx) drawStamp(ctx, sheets, "window", (b.x + dx) * T, (b.y + b.roofRows) * T);
    drawStamp(ctx, sheets, "door", (b.x + b.doorDx) * T, (b.y + b.roofRows + 1) * T);
    if (b.sign) drawStamp(ctx, sheets, b.sign, (b.x + b.doorDx) * T, (b.y + b.roofRows) * T);
  }
  return c;
}

/** Live anwesender Spieler (Position in Kacheln, vom Server) */
export interface LiveOther { id: string; name: string; x: number; y: number; dir: string; character: TeCharacterConfig; avatarUrl: string | null; emote?: string | null; scene?: number }
export interface ChatMessage { id: string; cardId: string; name: string; text: string; createdAt: string }
/** Antwort des Live-Abgleichs: anwesende Spieler, neue Chat-Nachrichten, neue Spielleiter-Ereignisse */
export interface LiveData { others: LiveOther[]; chat: ChatMessage[]; events: WorldEventView[] }

export const EMOTE_ICONS: Record<string, string> = { wave: "👋", laugh: "😂", cheer: "🎉", think: "🤔", heart: "❤️", sad: "😢" };

interface LiveEntry { name: string; tx: number; ty: number; cx: number; cy: number; dir: TeDirLite; key: string; sets?: TeLayerSets; emote?: { icon: string; until: number }; scene: number }
type TeDirLite = "down" | "left" | "right" | "up";

/** Innenraum vorzeichnen: Boden, Wand oben (2 Reihen, mit Fenstern), Seitenpfosten, untere Wand mit Tür. */
export function bakeInterior(sheets: Sheets, it: Interior): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = it.cols * T;
  c.height = it.rows * T;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const a5 = (tx: number, ty: number, x: number, y: number) => ctx.drawImage(sheets.a5inside, tx * T, ty * T, T, T, x * T, y * T, T, T);
  const floor = INTERIOR_FLOORS[Math.min(Math.max(0, it.floor), INTERIOR_FLOORS.length - 1)].tile;
  const wall = INTERIOR_WALLS[Math.min(Math.max(0, it.wall), INTERIOR_WALLS.length - 1)];
  ctx.fillStyle = "#120c08";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let y = 2; y < it.rows; y++) for (let x = 0; x < it.cols; x++) a5(floor[0], floor[1], x, y);
  for (let x = 0; x < it.cols; x++) {
    const t = wallTilesAt(it.wall, x, it.cols);
    a5(t.top[0], t.top[1], x, 0);
    a5(t.bottom[0], t.bottom[1], x, 1);
  }
  for (let y = 2; y < it.rows; y++) { a5(wall.bottom[0], wall.bottom[1], 0, y); a5(wall.bottom[0], wall.bottom[1], it.cols - 1, y); }
  for (let x = 1; x < it.cols - 1; x++) if (x !== it.exitX) a5(wall.bottom[0], wall.bottom[1], x, it.rows - 1);
  a5(wall.bottom[0], wall.bottom[1], 0, it.rows - 1);
  a5(wall.bottom[0], wall.bottom[1], it.cols - 1, it.rows - 1);
  // Tür und Fußmatte
  a5(floor[0], floor[1], it.exitX, it.rows - 1);
  drawStamp(ctx, sheets, "door", it.exitX * T, (it.rows - 1) * T);
  return c;
}

/** Wetter-Effekte auf der Zeichenfläche (Partikel in logischen Pixeln; rein optisch). */
interface WeatherFx { kind: Weather; drops: { x: number; y: number; v: number; d: number }[]; flash: number; nextFlash: number }

function makeFx(kind: Weather, w: number, h: number): WeatherFx {
  const count = kind === "storm" ? 150 : kind === "rain" ? 90 : kind === "snow" ? 70 : 0;
  return {
    kind, flash: 0, nextFlash: 4000 + Math.random() * 5000,
    drops: Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, v: kind === "snow" ? 14 + Math.random() * 12 : 110 + Math.random() * 70, d: Math.random() * 6 - 3 })),
  };
}

function drawWeather(ctx: CanvasRenderingContext2D, fx: WeatherFx, w: number, h: number, dt: number, clockMs: number) {
  const s = dt / 1000;
  if (fx.kind === "cloudy") { ctx.fillStyle = "rgba(70, 80, 100, 0.14)"; ctx.fillRect(0, 0, w, h); return; }
  if (fx.kind === "fog") {
    ctx.fillStyle = "rgba(200, 210, 220, 0.26)";
    ctx.fillRect(0, 0, w, h);
    // Treibende Schwaden
    for (let i = 0; i < 5; i++) {
      const x = ((clockMs / 60 + i * 97) % (w + 120)) - 60;
      const y = (i * 41) % h;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 60);
      g.addColorStop(0, "rgba(230,235,240,0.22)");
      g.addColorStop(1, "rgba(230,235,240,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, y - 60, 120, 120);
    }
    return;
  }
  if (fx.kind === "clear") return;

  if (fx.kind === "rain" || fx.kind === "storm") {
    ctx.fillStyle = fx.kind === "storm" ? "rgba(30, 40, 70, 0.22)" : "rgba(50, 65, 90, 0.12)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(190, 210, 255, 0.55)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const d of fx.drops) {
      d.y += d.v * s; d.x += (fx.kind === "storm" ? 40 : 14) * s;
      if (d.y > h) { d.y = -6; d.x = Math.random() * w; }
      if (d.x > w) d.x -= w;
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - (fx.kind === "storm" ? 2.4 : 1), d.y - 5);
    }
    ctx.stroke();
    if (fx.kind === "storm") {
      fx.nextFlash -= dt;
      if (fx.nextFlash <= 0) { fx.flash = 1; fx.nextFlash = 5000 + Math.random() * 7000; }
      if (fx.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${(fx.flash * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, w, h); fx.flash = Math.max(0, fx.flash - s * 3.5); }
    }
    return;
  }
  // Schnee
  ctx.fillStyle = "rgba(220, 230, 245, 0.10)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const d of fx.drops) {
    d.y += d.v * s; d.x += (Math.sin(clockMs / 700 + d.d) * 6 + d.d) * s;
    if (d.y > h) { d.y = -2; d.x = Math.random() * w; }
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }
}

/** Sprechblase über einer Figur (Text umgebrochen, auf der Zeichenfläche gehalten). */
function drawBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, canvasW: number) {
  ctx.font = "5px sans-serif";
  const maxW = 84;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  const w = Math.min(maxW, Math.max(...shown.map((l) => ctx.measureText(l).width))) + 6;
  const h = shown.length * 6 + 4;
  const bx = Math.min(canvasW - w - 1, Math.max(1, x - w / 2));
  const by = Math.max(1, y - h);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = "#111";
  ctx.textAlign = "start";
  shown.forEach((l, i) => ctx.fillText(l, bx + 3, by + 7 + i * 6));
}

function drawEmote(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number) {
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(icon, x, y);
  ctx.textAlign = "start";
}

export interface OtherPlayer { id: string; name: string; character: TeCharacterConfig | null }

interface Props {
  world: WorldDef;
  character: TeCharacterConfig;
  /** Gespeicherter Schritt je Quest-Slug dieser Welt (0 = noch nicht angenommen) */
  initialSteps: Record<string, number>;
  /** Verfolgte Quests (auch von anderen Locations) fürs HUD */
  tracker: TrackerItem[];
  others: OtherPlayer[];
  /** Live-Abgleich: meldet die eigene Kachel + Blickrichtung und liefert alle gerade anwesenden anderen (oder null bei Fehler). */
  livePresence?: (me: { x: number; y: number; dir: string; scene: number; emote?: string; chatSince?: string; eventsSince?: string }) => Promise<LiveData | null>;
  /** Neue Chat-Nachrichten/Ereignisse aus dem Live-Abgleich (für Verlauf und Anzeigen außerhalb der Zeichenfläche) */
  onLiveData?: (d: { chat: ChatMessage[]; events: WorldEventView[] }) => void;
  /** Eigene Karten-Id (für die eigene Sprechblase) */
  myCardId?: string;
  /** Klimazone der Location (bestimmt das Wetter); ohne Angabe gemäßigt */
  biome?: Biome;
  /** Zuletzt gewähltes eigenes Emote (n zählt hoch, damit dasselbe Emote erneut auslöst) */
  emote?: { id: string; n: number } | null;
  /** Erlebte Ereignisse des Charakters (schalten Dialoge frei/aus) */
  flags?: string[];
  /** Wertet eine Antwort aus (Server würfelt); null bei Fehler */
  onChoose?: (req: { actor: string; talk: number; choice: number }) => Promise<(ChoiceResult & { tracker?: TrackerItem[] }) | null>;
  /** Händler-Gespräch beendet: Handelsfenster öffnen */
  onTrade?: (actorId: string) => void;
  /** Meldet einen abgeschlossenen Quest-Schritt; liefert den gespeicherten Stand (oder null bei Fehler). */
  onAdvance: (quest: string, from: number) => Promise<{ step: number; completed: boolean; tracker?: TrackerItem[] } | null>;
  /** Sichtfenster in Kacheln (nur für Übersichten/Tests ändern). */
  viewCols?: number;
  viewRows?: number;
}

export default function TeWorld({ world, character, initialSteps, tracker: initialTracker, others, livePresence, onLiveData, myCardId, biome, emote, flags: initialFlags = [], onChoose, onTrade, onAdvance, viewCols = DEFAULT_VIEW_W, viewRows = DEFAULT_VIEW_H }: Props) {
  const VIEW_W = Math.min(viewCols, world.map.cols);
  const VIEW_H = Math.min(viewRows, world.map.rows);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const heldRef = useRef<Dir[]>([]);
  /** Kurzer Tastendruck, der zwischen zwei Frames beginnt und endet, soll trotzdem einen Schritt auslösen. */
  const tapRef = useRef<Dir | null>(null);
  const [ui, setUi] = useState<{ dialog: Dialog | null; tracker: TrackerItem[] }>({ dialog: null, tracker: initialTracker });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scene, setScene] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  // Spielzustand einmal je Welt anlegen (Ref, wird pro Frame gezeichnet)
  const climate: Biome = world.map.theme === "cave" ? "cave" : biome ?? "temperate";
  const [weather, setWeather] = useState<Weather>(() => weatherFor(world.slug, climate));
  const weatherRef = useRef<Weather>(weather);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  // Wetter und Tageszeit einmal pro Minute nachziehen (auch für die Dialog-Bedingungen der Engine)
  useEffect(() => {
    const update = () => {
      const w = weatherFor(world.slug, climate);
      setWeather(w);
      const g = gameRef.current;
      if (g) { g.weather = w; g.night = isNight(berlinHour()); }
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [world.slug, climate]);

  useEffect(() => {
    gameRef.current = createGame(world, initialSteps, initialFlags, isNight(berlinHour()), weatherFor(world.slug, climate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const playerKey = JSON.stringify(character);
  const spritesRef = useRef<{ player: TeLayerSets | undefined; npcs: Map<string, TeLayerSets>; others: Map<string, TeLayerSets> }>({
    player: undefined, npcs: new Map(), others: new Map(),
  });
  useEffect(() => {
    let cancelled = false;
    loadTeLayerSets(character).then((sets) => { if (!cancelled) spritesRef.current.player = sets; });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerKey]);
  const othersKey = JSON.stringify(others.map((o) => [o.id, o.character]));
  useEffect(() => {
    let cancelled = false;
    Promise.all(others.filter((o) => o.character).map(async (o) => [o.id, await loadTeLayerSets(o.character!)] as const)).then((entries) => {
      if (!cancelled) spritesRef.current.others = new Map(entries);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [othersKey]);

  /** HUD-Liste nach einem Schritt: Quests dieser Welt aus dem lokalen Stand, Quests anderer Locations vom Server. */
  const localTracker = useCallback((g: Game, prev: TrackerItem[]): TrackerItem[] => {
    const here = new Set(worldQuestsOf(world).map((q) => q.slug));
    const mine = activeQuestsOf(world, g.questSteps).map((q) => ({
      slug: q.slug, title: q.title, objective: q.objective, where: world.title, whereSlug: world.slug, progress: `${q.step}/${q.steps}`,
    }));
    return [...mine, ...prev.filter((t) => !here.has(t.slug))];
  }, [world]);

  /** Ereignisse der Engine verarbeiten (Hinweise, Server-Meldung, HUD). */
  const handleEvents = useCallback((g: Game) => {
    for (const e of drainEvents(g)) {
      const q = worldQuestsOf(world).find((o) => o.slug === e.quest);
      if (!q) continue;
      if (e.type === "advance") {
        const from = e.from;
        toast(from === 0 ? "Quest angenommen: " + q.title : "Quest-Fortschritt: " + q.title, { description: q.objectives[from + 1] });
        onAdvance(e.quest, from).then((res) => {
          const cur = gameRef.current;
          if (!res || !cur) return;
          syncQuestStep(cur, e.quest, res.step);
          setUi((u) => ({ ...u, tracker: res.tracker ?? localTracker(cur, u.tracker) }));
        });
      }
      if (e.type === "complete") toast.success("Quest abgeschlossen: " + q.title, { description: `+${q.xpReward} XP` });
    }
    setUi((u) => ({ dialog: g.dialog ? { ...g.dialog } : null, tracker: localTracker(g, u.tracker) }));
  }, [world, onAdvance, localTracker]);

  const action = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    pressAction(g);
    handleEvents(g);
  }, [handleEvents]);

  const choose = useCallback(async (index: number) => {
    const g = gameRef.current;
    if (!g) return;
    const req = chooseOption(g, index);
    setUi((u) => ({ ...u, dialog: g.dialog ? { ...g.dialog } : null }));
    if (!req) return;
    // Ohne Server (Testlauf im Editor) bleibt die Auswertung aus: die Wahl wird zurückgenommen
    const res = onChoose ? await onChoose(req) : null;
    if (!res) toast.error("Die Antwort konnte nicht ausgewertet werden.");
    applyChoiceResult(g, res);
    setUi((u) => ({ dialog: g.dialog ? { ...g.dialog } : null, tracker: res?.tracker ?? localTracker(g, u.tracker) }));
  }, [onChoose, localTracker]);

  const answer = useCallback((accept: boolean) => {
    const g = gameRef.current;
    if (!g) return;
    answerOffer(g, accept);
    handleEvents(g);
  }, [handleEvents]);

  // Eingabe (Tastatur)
  useEffect(() => {
    const keyDir: Record<string, Dir> = {
      ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
    };
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName);
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const d = keyDir[e.key];
      if (d) {
        e.preventDefault();
        heldRef.current = [...heldRef.current.filter((x) => x !== d), d];
        tapRef.current = d;
      } else if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E") {
        if (e.repeat) return;
        e.preventDefault();
        action();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = keyDir[e.key];
      if (d) heldRef.current = heldRef.current.filter((x) => x !== d);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [action]);

  // Live-Spieler: alle ~0,6 s eigene Kachel melden und die Anwesenden abholen; die Figuren gleiten in der Zeichenschleife
  const liveRef = useRef<Map<string, LiveEntry>>(new Map());
  const fxRef = useRef<WeatherFx | null>(null);
  const livePresenceRef = useRef(livePresence);
  useEffect(() => { livePresenceRef.current = livePresence; });
  const hasLive = !!livePresence;
  const onLiveDataRef = useRef(onLiveData);
  useEffect(() => { onLiveDataRef.current = onLiveData; });
  // Sprechblasen (Karten-Id → Text) und eigenes Emote
  const bubblesRef = useRef<Map<string, { text: string; until: number }>>(new Map());
  const myEmoteRef = useRef<{ icon: string; until: number; send?: string } | null>(null);
  const cursorRef = useRef<{ chat?: string; events?: string }>({});
  const myCardIdRef = useRef(myCardId);
  useEffect(() => { myCardIdRef.current = myCardId; });
  useEffect(() => {
    if (!emote) return;
    myEmoteRef.current = { icon: EMOTE_ICONS[emote.id] ?? "💬", until: Date.now() + 4000, send: emote.id };
  }, [emote]);
  useEffect(() => {
    if (!hasLive) return;
    let cancelled = false;
    let busy = false;
    const tick = async () => {
      const g = gameRef.current;
      const fn = livePresenceRef.current;
      if (!g || !fn || busy || document.hidden) return;
      busy = true;
      try {
        // Bei laufender Bewegung die Zielkachel melden, damit andere schon dorthin gleiten
        const send = myEmoteRef.current?.send;
        if (myEmoteRef.current) myEmoteRef.current.send = undefined;
        const data = await fn({ scene: g.scene ?? -1, chatSince: cursorRef.current.chat, eventsSince: cursorRef.current.events, x: g.move ? g.move.toX : g.px, y: g.move ? g.move.toY : g.py, dir: g.dir, ...(send ? { emote: send } : {}) });
        if (cancelled || !data) return;
        const list = data.others;
        for (const m of data.chat) {
          bubblesRef.current.set(m.cardId, { text: m.text, until: Date.now() + 6500 });
          cursorRef.current.chat = m.createdAt;
        }
        for (const ev of data.events) cursorRef.current.events = cursorRef.current.events && cursorRef.current.events > ev.expiresAt ? cursorRef.current.events : new Date().toISOString();
        if (data.chat.length || data.events.length) onLiveDataRef.current?.({ chat: data.chat, events: data.events });
        const next = new Map<string, LiveEntry>();
        for (const o of list) {
          const key = JSON.stringify(o.character);
          const prev = liveRef.current.get(o.id);
          const emoteIcon = o.emote ? EMOTE_ICONS[o.emote] : undefined;
          const entry: LiveEntry = prev
            ? { ...prev, name: o.name, tx: o.x, ty: o.y, dir: o.dir as TeDirLite, key, scene: o.scene ?? -1, emote: emoteIcon ? (prev.emote?.icon === emoteIcon && prev.emote.until > Date.now() ? prev.emote : { icon: emoteIcon, until: Date.now() + 3500 }) : undefined }
            : { name: o.name, tx: o.x, ty: o.y, cx: o.x, cy: o.y, dir: o.dir as TeDirLite, key, scene: o.scene ?? -1, ...(emoteIcon ? { emote: { icon: emoteIcon, until: Date.now() + 3500 } } : {}) };
          if (!prev || prev.key !== key) {
            entry.sets = prev?.key === key ? prev.sets : undefined;
            loadTeLayerSets(o.character).then((sets) => { const e = liveRef.current.get(o.id); if (e && e.key === key) e.sets = sets; });
          }
          next.set(o.id, entry);
        }
        liveRef.current = next;
      } finally {
        busy = false;
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 600);
    return () => { cancelled = true; clearInterval(timer); liveRef.current = new Map(); };
  }, [hasLive, world]);

  // Laden + Zeichenschleife
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let cancelled = false;
    let last = performance.now();
    let clock = 0;

    (async () => {
      let sheets: Sheets;
      try {
        sheets = await loadSheets();
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Kacheln konnten nicht geladen werden.");
        return;
      }
      const npcImgs = await Promise.all(allActorsOf(world.map).filter((a) => (a.kind === "npc" || a.kind === "merchant") && a.config).map(async (a) => [a.id, await loadTeLayerSets(a.config!)] as const));
      if (cancelled) return;
      spritesRef.current.npcs = new Map(npcImgs);
      const bakedOutdoor = bakeStatic(sheets, world);
      const bakedInside = new Map<number, HTMLCanvasElement>();
      let seenScene = 0;
      let fade = 0;
      setReady(true);
      ctx.imageSmoothingEnabled = false;

      const frame = (now: number) => {
        if (cancelled) return;
        const g = gameRef.current;
        if (!g) { raf = requestAnimationFrame(frame); return; }
        const dt = Math.min(64, now - last);
        last = now;
        clock += dt;
        const held = heldRef.current.at(-1) ?? tapRef.current;
        tapRef.current = null;
        step(g, dt, held);

        // Position der Figur (interpoliert) und Kamera
        let fx = g.px;
        let fy = g.py;
        if (g.move) {
          const p = Math.min(1, g.move.elapsed / TILE_MS);
          fx = g.move.fromX + (g.move.toX - g.move.fromX) * p;
          fy = g.move.fromY + (g.move.toY - g.move.fromY) * p;
        }
        const map = g.map;
        if (g.sceneChanges !== seenScene) { seenScene = g.sceneChanges; fade = 1; setScene(g.scene); }
        let baked = bakedOutdoor;
        if (g.scene !== null) {
          let b = bakedInside.get(g.scene);
          if (!b) { const it = world.map.buildings[g.scene]?.interior; if (it) { b = bakeInterior(sheets, it); bakedInside.set(g.scene, b); } }
          if (b) baked = b;
        }
        const vw = VIEW_W * T;
        const vh = VIEW_H * T;
        // Kleine Karten (Innenräume) mittig zeigen, große folgen der Figur
        const camX = map.cols * T <= vw ? -Math.round((vw - map.cols * T) / 2) : Math.round(Math.min(Math.max(fx * T + T / 2 - vw / 2, 0), map.cols * T - vw));
        const camY = map.rows * T <= vh ? -Math.round((vh - map.rows * T) / 2) : Math.round(Math.min(Math.max(fy * T + T / 2 - vh / 2, 0), map.rows * T - vh));

        ctx.fillStyle = g.scene !== null ? "#120c08" : "#0b1524";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        {
          const sx = Math.max(camX, 0), sy = Math.max(camY, 0), dx0 = Math.max(-camX, 0), dy0 = Math.max(-camY, 0);
          const sw = Math.min(vw - dx0, baked.width - sx), sh = Math.min(vh - dy0, baked.height - sy);
          if (sw > 0 && sh > 0) ctx.drawImage(baked, sx, sy, sw, sh, dx0, dy0, sw, sh);
        }

        // Sortierte Sprites (Fußlinie = Unterkante)
        type Sprite = { base: number; draw: () => void };
        const sprites: Sprite[] = [];
        for (const s of map.stamps) {
          const d = STAMPS[s.id] as StampDef;
          if (s.x * T + d.w * T < camX || s.x * T > camX + VIEW_W * T || s.y * T + d.h * T < camY || s.y * T > camY + VIEW_H * T) continue;
          sprites.push({ base: (s.y + d.h) * T, draw: () => drawStamp(ctx, sheets, s.id, s.x * T - camX, s.y * T - camY) });
        }
        for (const a of map.actors) {
          if (a.kind === "chest") {
            const open = isChestOpen(a, g.questSteps, world);
            sprites.push({ base: (a.y + 1) * T, draw: () => ctx.drawImage(sheets.chests, 16, open ? 112 : 16, 16, 16, a.x * T - camX, a.y * T - camY, 16, 16) });
          } else if (a.kind === "npc" || a.kind === "merchant") {
            const sets = spritesRef.current.npcs.get(a.id);
            const dir = g.actorDir.get(a.id) ?? a.dir;
            sprites.push({ base: (a.y + 1) * T, draw: () => drawTeFrame(ctx, layersFor(sets, dir), 1, dir, a.x * T - camX + T / 2 - 24, a.y * T - camY - 16, 1) });
          }
        }
        others.forEach((o, i) => {
          const spot = map.crowd[i];
          const sets = spritesRef.current.others.get(o.id);
          // Wer live da ist, wird nicht zusätzlich als stehende Figur gezeichnet
          if (!spot || !sets || liveRef.current.has(o.id)) return;
          sprites.push({ base: (spot.y + 1) * T, draw: () => drawTeFrame(ctx, sets.front, 1, "down", spot.x * T - camX + T / 2 - 24, spot.y * T - camY - 16, 1) });
        });
        const walkFrames = TE_ANIMS.walk.frames;
        for (const e of liveRef.current.values()) {
          if (!e.sets || e.scene !== (g.scene ?? -1)) continue;
          const dx = e.tx - e.cx;
          const dy = e.ty - e.cy;
          const dist = Math.hypot(dx, dy);
          // Weich zur gemeldeten Kachel gleiten; große Sprünge (Verbindungsabbruch) direkt setzen
          if (dist > 8) { e.cx = e.tx; e.cy = e.ty; } else { const k = Math.min(1, dt / 160); e.cx += dx * k; e.cy += dy * k; }
          const moving = dist > 0.12;
          const dir: TeDirLite = moving ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up")) : e.dir;
          const frameIdx = moving ? walkFrames[Math.floor((clock / 1000) * TE_ANIMS.walk.fps) % walkFrames.length] : 1;
          const sets = e.sets;
          sprites.push({
            base: e.cy * T + T,
            draw: () => {
              const sx = e.cx * T - camX + T / 2;
              const sy = e.cy * T - camY;
              drawTeFrame(ctx, layersFor(sets, dir), frameIdx, dir, sx - 24, sy - 16, 1);
              ctx.font = "bold 5px sans-serif";
              ctx.textAlign = "center";
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = "rgba(0,0,0,0.85)";
              ctx.strokeText(e.name, sx, sy - 6);
              ctx.fillStyle = "#fde68a";
              ctx.fillText(e.name, sx, sy - 6);
              ctx.textAlign = "start";
              if (e.emote && e.emote.until > Date.now()) drawEmote(ctx, e.emote.icon, sx, sy - 12);
            },
          });
        }
        const pf = g.move ? walkFrames[Math.floor((clock / 1000) * TE_ANIMS.walk.fps) % walkFrames.length] : 1;
        sprites.push({
          base: fy * T + T,
          draw: () => drawTeFrame(ctx, layersFor(spritesRef.current.player, g.dir), pf, g.dir, fx * T - camX + T / 2 - 24, fy * T - camY - 16, 1),
        });
        sprites.sort((a, b) => a.base - b.base);
        for (const s of sprites) s.draw();

        // Sprechblasen (über allen Figuren)
        const nowMs = Date.now();
        for (const [id, b] of bubblesRef.current) {
          if (b.until < nowMs) { bubblesRef.current.delete(id); continue; }
          const mine = id === myCardIdRef.current;
          const e = liveRef.current.get(id);
          if (e && e.scene !== (g.scene ?? -1)) continue;
          const bx = mine ? fx * T + T / 2 - camX : e ? e.cx * T + T / 2 - camX : null;
          const by = mine ? fy * T - camY - 18 : e ? e.cy * T - camY - 20 : null;
          if (bx !== null && by !== null) drawBubble(ctx, b.text, bx, by, canvas.width);
        }
        if (myEmoteRef.current && myEmoteRef.current.until > nowMs) drawEmote(ctx, myEmoteRef.current.icon, fx * T + T / 2 - camX, fy * T - camY - 14);

        // Wetter (nur draußen)
        if (map.theme === "outdoor") {
          if (!fxRef.current || fxRef.current.kind !== weatherRef.current) fxRef.current = makeFx(weatherRef.current, canvas.width, canvas.height);
          drawWeather(ctx, fxRef.current, canvas.width, canvas.height, dt, clock);
        }

        // Tageszeit: draußen dunkelt die Welt abends/nachts ab (Höhlen bleiben, wie sie sind)
        if (map.theme === "outdoor") {
          const dark = darkness(berlinHour());
          if (dark > 0.02) { ctx.fillStyle = `rgba(12, 20, 60, ${(dark * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        }

        if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade.toFixed(3)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); fade = Math.max(0, fade - dt / 260); }

        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); };
    // others wird pro Frame über die Closure gelesen; die Sprites laden separat (othersKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, othersKey, VIEW_W, VIEW_H]);

  const dialog = ui.dialog;
  const hold = (d: Dir | null) => (e: React.PointerEvent) => {
    e.preventDefault();
    heldRef.current = d ? [d] : [];
    if (d) tapRef.current = d;
  };

  return (
    <div className="space-y-2 max-w-[960px] mx-auto">
      <div className="relative rounded-2xl overflow-hidden moba-panel bg-[#0b1524]" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={VIEW_W * T}
          height={VIEW_H * T}
          className="block w-full h-auto"
          style={{ imageRendering: "pixelated", aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          role="img"
          aria-label={world.title}
        />

        {/* Verfolgte Quests */}
        {ui.tracker.length > 0 && (
          <div className="absolute top-2 left-2 max-w-[60%] space-y-1 pointer-events-none">
            {ui.tracker.slice(0, 3).map((t) => (
              <div key={t.slug} className="rounded-lg bg-black/65 px-2.5 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">{t.title} <span className="text-gray-400 font-normal normal-case tracking-normal">{t.progress}</span></p>
                <p className="text-[11px] text-white leading-snug">{t.objective}{t.where && t.whereSlug !== world.slug ? <span className="text-sky-300"> — {t.where}</span> : null}</p>
              </div>
            ))}
            {ui.tracker.length > 3 && <p className="text-[10px] text-gray-400 px-1">+{ui.tracker.length - 3} weitere im Quest-Log</p>}
          </div>
        )}

        {world.map.theme === "outdoor" && scene === null && (
          <span className="absolute top-10 right-2 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white pointer-events-none" title="Wetter am Ort">
            {WEATHER_ICON[weather]} {WEATHER_LABEL[weather]}
          </span>
        )}
        <Link
          href="/oma-quest"
          className="absolute top-2 right-2 rounded-lg bg-black/65 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black/80 transition-colors"
        >
          Zur Weltkarte
        </Link>

        {!ready && !loadError && <p className="absolute inset-0 grid place-items-center text-xs text-gray-400">Lade {world.title} …</p>}
        {loadError && <p className="absolute inset-0 grid place-items-center text-xs text-red-400 px-4 text-center">{loadError}</p>}

        {/* Dialog */}
        {dialog && (
          dialog.awaitingChoice ? (
            <div className="absolute inset-x-2 bottom-2 rounded-xl border border-amber-300/40 bg-[#0b1220]/95 p-3">
              <p className="text-[11px] font-bold text-amber-300 mb-0.5">{dialog.speaker}</p>
              <p className="text-sm text-white leading-snug">Nimmst du die Quest an?</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => answer(true)} className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2">Annehmen</button>
                <button type="button" onClick={() => answer(false)} className="flex-1 rounded-lg border border-white/20 text-gray-200 text-xs font-semibold py-2 hover:border-white/40">Später</button>
              </div>
            </div>
          ) : dialog.awaitingChoices || (dialog.pending && dialog.choices) ? (
            <div className="absolute inset-x-2 bottom-2 rounded-xl border border-sky-300/40 bg-[#0b1220]/95 p-3">
              <p className="text-[11px] font-bold text-amber-300 mb-1">{dialog.speaker}</p>
              <div className="space-y-1.5">
                {dialog.choices?.map((c, i) => (
                  <button key={i} type="button" disabled={!!dialog.pending} onClick={() => void choose(i)} className="w-full rounded-lg border border-white/15 hover:border-sky-300/60 disabled:opacity-50 px-3 py-2 text-left text-xs text-white">
                    {c.text}
                    {c.check && isAbility(c.check.ability) && <span className="ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">🎲 {ABILITY_LABEL[c.check.ability]} SG {c.check.dc}</span>}
                  </button>
                ))}
              </div>
              {dialog.pending && <p className="mt-1.5 text-[10px] text-gray-400">Der Würfel rollt …</p>}
            </div>
          ) : (
            <div className="absolute inset-x-2 bottom-2 rounded-xl border border-white/20 bg-[#0b1220]/95 p-3 text-left">
              <button type="button" onClick={action} className="block w-full text-left">
                <p className="text-[11px] font-bold text-amber-300 mb-0.5">{dialog.speaker}</p>
                {dialog.roll && (
                  <p className={`mb-1 rounded-md px-2 py-1 text-[11px] font-bold ${dialog.roll.success ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
                    🎲 {dialog.roll.roll}{dialog.roll.modifier ? ` ${dialog.roll.modifier > 0 ? "+" : "−"} ${Math.abs(dialog.roll.modifier)}` : ""} = {dialog.roll.total} gegen SG {dialog.roll.dc} ({ABILITY_LABEL[dialog.roll.ability]}) — {dialog.roll.crit ? "Natürliche 20!" : dialog.roll.fumble ? "Natürliche 1!" : dialog.roll.success ? "Gelungen" : "Misslungen"}
                  </p>
                )}
                <p className="text-sm text-white leading-snug">{dialog.lines[dialog.index]}</p>
                <p className="text-[10px] text-gray-500 mt-1.5 text-right">
                  {dialog.index < dialog.lines.length - 1 ? "Weiter ▶" : dialog.choices?.length || dialog.offer ? "Weiter ▶" : "Schließen ▶"}
                </p>
              </button>
              {dialog.merchant && dialog.index >= dialog.lines.length - 1 && onTrade && (
                <button type="button" onClick={() => { const g = gameRef.current; if (g) { const id = dialog.merchant!; pressAction(g); handleEvents(g); onTrade(id); } }} className="mt-2 w-full rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold py-2">🛒 Handeln</button>
              )}
            </div>
          )
        )}
      </div>

      {/* Steuerung: Tasten am Rechner, Kreuz + Aktionstaste am Handy */}
      <div className="flex items-center justify-between gap-4 sm:justify-center">
        <div className="grid grid-cols-3 gap-1 w-[132px] select-none" aria-label="Steuerkreuz">
          {([
            [null, "up", null],
            ["left", null, "right"],
            [null, "down", null],
          ] as (Dir | null)[][]).flat().map((d, i) =>
            d ? (
              <button
                key={i}
                type="button"
                aria-label={{ up: "Hoch", down: "Runter", left: "Links", right: "Rechts" }[d]}
                onPointerDown={hold(d)}
                onPointerUp={hold(null)}
                onPointerLeave={hold(null)}
                onPointerCancel={hold(null)}
                className="h-10 rounded-lg bg-black/40 border border-white/10 text-white text-lg active:bg-violet-600/60"
              >
                {{ up: "↑", down: "↓", left: "←", right: "→" }[d]}
              </button>
            ) : <span key={i} />,
          )}
        </div>
        <button
          type="button"
          onClick={action}
          className="h-14 w-14 rounded-full bg-violet-600 text-white font-black text-lg shadow-lg active:bg-violet-500"
          aria-label="Aktion"
        >
          A
        </button>
        <p className="hidden sm:block text-[11px] text-gray-500 max-w-[200px]">
          Pfeiltasten oder WASD zum Laufen, Leertaste/E zum Ansprechen und Öffnen.
        </p>
      </div>
    </div>
  );
}
