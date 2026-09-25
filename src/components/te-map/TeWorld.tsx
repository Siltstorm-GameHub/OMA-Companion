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
import { drawTeFrame, layersFor, loadTeLayerSets, type TeLayerSets } from "@/components/te-character/TeCharacter";
import { TE_ANIMS, type TeCharacterConfig } from "@/lib/te-character";
import { groundQuarters, wallQuarters, type Quarters } from "@/lib/te-map/autotile";
import { activeQuestsOf, answerOffer, applyChoiceResult, chooseOption, createGame, doorAhead, drainEvents, interactTarget, isChestOpen, pressAction, step, syncQuestStep, walkTo, type ChoiceResult, type Dialog, type Dir, type Game } from "@/lib/te-map/engine";
import type { TrackerItem } from "@/lib/dnd/quest-log";
import { DiceOverlay } from "@/components/te-map/play/Dice";
import { GameFeed, type FeedItem, type Notify } from "@/components/te-map/play/GameFeed";
import type { WorldEventView } from "@/lib/dnd/world-events";
import { ABILITY_LABEL, berlinHour, darkness, isAbility, isNight, weatherFor, WEATHER_ICON, WEATHER_LABEL, type Biome, type RollResult, type Weather } from "@/lib/te-map/rpg";
import { STAMPS, type StampDef, type StampId, type TileSheet } from "@/lib/te-map/stamps";
import { allActorsOf, doorFront, INTERIOR_FLOORS, INTERIOR_WALLS, wallTilesAt } from "@/lib/te-map/interior";
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
  fires: "/te/tiles/fires.png",
  lights: "/te/tiles/lights.png",
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
export function drawStamp(ctx: CanvasRenderingContext2D, sheets: Sheets, id: StampId, x: number, y: number, tMs = 0) {
  const s = STAMPS[id] as StampDef;
  if (s.anim) {
    const f = Math.floor((tMs / 1000) * s.anim.fps) % 4;
    ctx.drawImage(sheets[s.sheet as TileSheet], s.anim.gx * 48 + 16, s.anim.gy * 128 + f * 32, 16, 32, x, y, 16, 32);
    return;
  }
  if (s.parts) {
    for (const p of s.parts) ctx.drawImage(sheets[s.sheet as TileSheet], p.sx * T, p.sy * T, p.w * T, p.h * T, x + p.dx * T, y + p.dy * T, p.w * T, p.h * T);
    return;
  }
  ctx.drawImage(sheets[s.sheet as TileSheet], s.sx * T, s.sy * T, s.w * T, s.h * T, x, y, s.w * T, s.h * T);
  for (const o of s.overlays ?? []) {
    const f = Math.floor((tMs / 1000) * o.fps) % 4;
    ctx.drawImage(sheets[o.sheet], o.gx * 48 + 16, o.gy * 128 + f * 32, 16, 32, x + o.dx, y + o.dy, 16, 32);
  }
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
export interface ChatMessage { id: string; cardId: string; name: string; text: string; createdAt: string; reports?: number }
/** Antwort des Live-Abgleichs: anwesende Spieler, neue Chat-Nachrichten, neue Spielleiter-Ereignisse */
export interface LiveData { others: LiveOther[]; chat: ChatMessage[]; hiddenChat?: string[]; events: WorldEventView[] }

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

/** Beschriftung über einer Figur: Name, Sprechblase, Emote. Wird als HTML über die Zeichenfläche gelegt (scharfe, gut lesbare Schrift) —
 *  auf der Zeichenfläche selbst wäre sie bei 16-px-Kacheln winzig und würde mit hochskaliert. */
interface LabelItem { key: string; x: number; y: number; name?: string; bubble?: string; emote?: string; hint?: string }

function makeLabelEl(): HTMLDivElement {
  const root = document.createElement("div");
  root.style.cssText = "position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;will-change:left,top;";
  const emote = document.createElement("span");
  emote.dataset.role = "emote";
  emote.style.cssText = "font-size:24px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6));";
  const bubble = document.createElement("div");
  bubble.dataset.role = "bubble";
  bubble.style.cssText = "position:relative;max-width:240px;padding:5px 10px;border-radius:10px;border:2px solid #16110a;background:#fffdf5;color:#15110a;font:600 14px/1.3 system-ui,sans-serif;text-align:center;box-shadow:0 3px 0 rgba(0,0,0,.45);overflow-wrap:anywhere;";
  const tail = document.createElement("div");
  tail.style.cssText = "position:absolute;left:50%;bottom:-8px;width:0;height:0;margin-left:-6px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #16110a;";
  const tailIn = document.createElement("div");
  tailIn.style.cssText = "position:absolute;left:50%;bottom:-4px;width:0;height:0;margin-left:-4px;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #fffdf5;";
  bubble.append(tail, tailIn);
  const bubbleText = document.createElement("span");
  bubbleText.dataset.role = "bubble-text";
  bubble.prepend(bubbleText);
  const name = document.createElement("span");
  name.dataset.role = "name";
  name.style.cssText = "font:800 12px/1 system-ui,sans-serif;color:#fde68a;white-space:nowrap;letter-spacing:.02em;text-shadow:0 0 3px #000,0 0 3px #000,0 1px 2px #000;";
  const hint = document.createElement("span");
  hint.dataset.role = "hint";
  hint.style.cssText = "font:800 12px/1 system-ui,sans-serif;color:#1a1204;background:#f5cf6b;border:2px solid #3a2a08;border-radius:999px;padding:3px 9px;white-space:nowrap;box-shadow:0 2px 0 rgba(0,0,0,.5);";
  root.append(emote, bubble, name, hint);
  return root;
}

/** DOM-Beschriftungen mit der Liste des Frames abgleichen (nur ändern, was sich geändert hat). */
function syncLabels(layer: HTMLDivElement, cache: Map<string, HTMLDivElement>, items: LabelItem[], cw: number, ch: number) {
  const seen = new Set<string>();
  for (const it of items) {
    seen.add(it.key);
    let el = cache.get(it.key);
    if (!el) { el = makeLabelEl(); cache.set(it.key, el); layer.appendChild(el); }
    el.style.left = `${((it.x / cw) * 100).toFixed(2)}%`;
    el.style.top = `${((it.y / ch) * 100).toFixed(2)}%`;
    const set = (role: string, value: string | undefined, display: string) => {
      const child = el!.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
      const wanted = value ?? "";
      if (child.dataset.v !== wanted) { child.dataset.v = wanted; (role === "bubble" ? child.querySelector<HTMLElement>('[data-role="bubble-text"]')! : child).textContent = wanted; }
      child.style.display = value ? display : "none";
    };
    set("emote", it.emote, "block");
    set("bubble", it.bubble, "block");
    set("name", it.name, "block");
    set("hint", it.hint, "block");
  }
  for (const [key, el] of cache) if (!seen.has(key)) { el.remove(); cache.delete(key); }
}

export interface OtherPlayer { id: string; name: string; character: TeCharacterConfig | null }

interface Props {
  world: WorldDef;
  character: TeCharacterConfig;
  /** Gespeicherter Schritt je Quest-Slug dieser Welt (0 = noch nicht angenommen) */
  initialSteps: Record<string, number>;
  /** Meldungen im Spiel (Zustand liegt beim Aufrufer, siehe useGameFeed) */
  feed?: FeedItem[];
  notify?: Notify;
  /** Spiel angehalten (Menü offen): Tasten und Steuerkreuz sind gesperrt */
  paused?: boolean;
  /** Zusätzliche Bedienelemente (Menü-Knöpfe) neben dem Steuerkreuz */
  extraControls?: React.ReactNode;
  /** Menü/Overlay über der Spielfläche (z. B. Inventar) */
  overlay?: React.ReactNode;
  /** Wird auf der Spielfläche unten links als Leiste gezeigt (Stufe, Gold, Münzen) */
  hud?: React.ReactNode;
  /** Verfolgte Quests (auch von anderen Locations) fürs HUD */
  tracker: TrackerItem[];
  others: OtherPlayer[];
  /** Live-Abgleich: meldet die eigene Kachel + Blickrichtung und liefert alle gerade anwesenden anderen (oder null bei Fehler). */
  livePresence?: (me: { x: number; y: number; dir: string; scene: number; emote?: string; chatSince?: string; eventsSince?: string }) => Promise<LiveData | null>;
  /** Neue Chat-Nachrichten/Ereignisse aus dem Live-Abgleich (für Verlauf und Anzeigen außerhalb der Zeichenfläche) */
  onLiveData?: (d: { chat: ChatMessage[]; hiddenChat: string[]; events: WorldEventView[] }) => void;
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

export default function TeWorld({ world, character, initialSteps, tracker: initialTracker, others, livePresence, onLiveData, feed, notify, paused, extraControls, overlay, hud, myCardId, biome, emote, flags: initialFlags = [], onChoose, onTrade, onAdvance, viewCols, viewRows }: Props) {
  // Sichtfenster passt sich der Fensterbreite an: gleicher Pixelmaßstab (≈ 4×), auf großen Bildschirmen sieht man mehr von der Welt
  const wrapRef = useRef<HTMLDivElement>(null);
  const [auto, setAuto] = useState({ cols: DEFAULT_VIEW_W, rows: DEFAULT_VIEW_H });
  // Zoom (Pinch, Strg+Mausrad, +/−): kleiner = mehr Welt sichtbar, größer = größere Figuren; wird gemerkt
  const [zoom, setZoomState] = useState(() => {
    try { const v = typeof window === "undefined" ? 0 : Number(window.localStorage.getItem("oq-zoom")); return v >= 0.6 && v <= 2 ? v : 1; } catch { return 1; }
  });
  const setZoom = useCallback((fn: (z: number) => number) => {
    setZoomState((z) => {
      const next = Math.min(2, Math.max(0.6, Math.round(fn(z) * 100) / 100));
      try { window.localStorage.setItem("oq-zoom", String(next)); } catch { /* egal */ }
      return next;
    });
  }, []);

  const fixedView = viewCols !== undefined || viewRows !== undefined;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || fixedView) return;
    const measure = () => {
      const cols = Math.min(48, Math.max(8, Math.floor(el.clientWidth / (T * 4 * zoom))));
      const rows = Math.min(30, Math.max(6, Math.floor((window.innerHeight * 0.7) / (T * 4 * zoom))));
      setAuto((a) => (a.cols === cols && a.rows === rows ? a : { cols, rows }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixedView, zoom]);
  const VIEW_W = Math.min(viewCols ?? auto.cols, world.map.cols);
  const VIEW_H = Math.min(viewRows ?? auto.rows, world.map.rows);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const camRef = useRef({ x: 0, y: 0 });
  const sprintKey = useRef(false);
  const sprintStick = useRef(false);
  const coarse = useRef(false);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ id: number; sx: number; sy: number; t: number; stick: boolean } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const [stick, setStick] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);
  useEffect(() => { coarse.current = window.matchMedia?.("(pointer: coarse)").matches ?? false; }, []);
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
  const syncedDialog = useRef<unknown>(null);
  const handleEvents = useCallback((g: Game) => {
    syncedDialog.current = g.dialog;
    for (const e of drainEvents(g)) {
      const q = worldQuestsOf(world).find((o) => o.slug === e.quest);
      if (!q) continue;
      if (e.type === "advance") {
        const from = e.from;
        notify?.("quest", from === 0 ? `Quest angenommen: ${q.title}` : `Quest-Fortschritt: ${q.title}`, q.objectives[from + 1]);
        onAdvance(e.quest, from).then((res) => {
          const cur = gameRef.current;
          if (!res || !cur) return;
          syncQuestStep(cur, e.quest, res.step);
          setUi((u) => ({ ...u, tracker: res.tracker ?? localTracker(cur, u.tracker) }));
        });
      }
      if (e.type === "complete") notify?.("reward", `Quest abgeschlossen: ${q.title}`, `+${q.xpReward} XP`);
    }
    setUi((u) => ({ dialog: g.dialog ? { ...g.dialog } : null, tracker: localTracker(g, u.tracker) }));
  }, [world, onAdvance, localTracker, notify]);

  const handleEventsRef = useRef<((g: Game) => void) | null>(null);
  useEffect(() => { handleEventsRef.current = handleEvents; });
  const pausedRef = useRef(!!paused);
  useEffect(() => { pausedRef.current = !!paused; if (paused) { heldRef.current = []; tapRef.current = null; } }, [paused]);

  const action = useCallback(() => {
    const g = gameRef.current;
    if (!g || pausedRef.current) return;
    pressAction(g);
    handleEvents(g);
  }, [handleEvents]);

  // Würfel: erscheint bei Proben, wartet auf den Wurf des Servers und zeigt genau dieses Ergebnis
  const [dice, setDice] = useState<{ ability: string; dc: number; roll: RollResult | null } | null>(null);
  const diceDone = useRef<(() => void) | null>(null);

  const choose = useCallback(async (index: number) => {
    const g = gameRef.current;
    if (!g) return;
    const meta = g.dialog?.choices?.[index];
    const req = chooseOption(g, index);
    setUi((u) => ({ ...u, dialog: g.dialog ? { ...g.dialog } : null }));
    if (!req) return;
    if (meta?.check) setDice({ ability: meta.check.ability, dc: meta.check.dc, roll: null });
    // Ohne Server (Testlauf im Editor) bleibt die Auswertung aus: die Wahl wird zurückgenommen
    const res = onChoose ? await onChoose(req) : null;
    if (!res) notify?.("error", "Die Antwort konnte nicht ausgewertet werden.");
    if (meta?.check && res?.roll) {
      // Der Würfel purzelt und bleibt auf dem Wurf liegen — erst danach geht der Text weiter
      await new Promise<void>((resolve) => { diceDone.current = resolve; setDice((d) => (d ? { ...d, roll: res.roll! } : d)); });
    }
    setDice(null);
    applyChoiceResult(g, res);
    setUi((u) => ({ dialog: g.dialog ? { ...g.dialog } : null, tracker: res?.tracker ?? localTracker(g, u.tracker) }));
  }, [onChoose, localTracker, notify]);

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
      if (pausedRef.current || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const d = keyDir[e.key];
      if (d) {
        e.preventDefault();
        heldRef.current = [...heldRef.current.filter((x) => x !== d), d];
        tapRef.current = d;
      } else if (e.key === "Shift") {
        sprintKey.current = true;
      } else if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E" || e.key === "f" || e.key === "F") {
        if (e.repeat) return;
        e.preventDefault();
        action();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") sprintKey.current = false;
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
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const labelCache = useRef(new Map<string, HTMLDivElement>());
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
        if (data.chat.length || data.events.length || data.hiddenChat?.length) onLiveDataRef.current?.({ chat: data.chat, hiddenChat: data.hiddenChat ?? [], events: data.events });
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
        g.speed = sprintKey.current || sprintStick.current ? 1.7 : 1;
        step(g, dt, held);
        // Dialog, der durch Klick-zum-Laufen (Ankunft beim Akteur) entstand: Oberfläche nachziehen
        if (g.dialog !== syncedDialog.current) handleEventsRef.current?.(g);

        // Position der Figur (interpoliert) und Kamera
        let fx = g.px;
        let fy = g.py;
        if (g.move) {
          const p = Math.min(1, g.move.elapsed / g.move.dur);
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
        void vh;
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
          sprites.push({ base: (s.y + d.h) * T, draw: () => drawStamp(ctx, sheets, s.id, s.x * T - camX, s.y * T - camY, clock) });
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
        const labels: LabelItem[] = [];
        others.forEach((o, i) => {
          const spot = map.crowd[i];
          const sets = spritesRef.current.others.get(o.id);
          // Wer live da ist, wird nicht zusätzlich als stehende Figur gezeichnet
          if (!spot || !sets || liveRef.current.has(o.id)) return;
          sprites.push({ base: (spot.y + 1) * T, draw: () => drawTeFrame(ctx, sets.front, 1, "down", spot.x * T - camX + T / 2 - 24, spot.y * T - camY - 16, 1) });
          labels.push({ key: `c${o.id}`, x: spot.x * T + T / 2 - camX, y: spot.y * T - camY - 13, name: o.name });
        });
        const walkFrames = TE_ANIMS.walk.frames;
        for (const [liveId, e] of liveRef.current) {
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
          const bub = bubblesRef.current.get(liveId);
          labels.push({
            key: `o${liveId}`, x: e.cx * T + T / 2 - camX, y: e.cy * T - camY - 13, name: e.name,
            bubble: bub && bub.until > Date.now() ? bub.text : undefined, emote: e.emote && e.emote.until > Date.now() ? e.emote.icon : undefined,
          });
          sprites.push({
            base: e.cy * T + T,
            draw: () => {
              const sx = e.cx * T - camX + T / 2;
              const sy = e.cy * T - camY;
              drawTeFrame(ctx, layersFor(sets, dir), frameIdx, dir, sx - 24, sy - 16, 1);
              void sx; void sy;
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

        // Lichtschein von Kerzen, Lampen, Feuern: drinnen immer, draußen abends/nachts (leichtes Flackern)
        {
          const dark = map.theme === "inside" ? 1 : map.theme === "outdoor" ? darkness(berlinHour()) : 0.6;
          if (dark > 0.05) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (const st of map.stamps) {
              const def = STAMPS[st.id] as StampDef;
              if (!def.glow) continue;
              const cx = st.x * T + (def.w * T) / 2 + (def.glow.dx ?? 0) - camX;
              const cy = st.y * T + (def.h * T) / 2 + (def.glow.dy ?? 0) - camY;
              if (cx < -60 || cy < -60 || cx > vw + 60 || cy > vh + 60) continue;
              const flick = 0.85 + 0.15 * Math.sin(clock / 130 + st.x * 3.1 + st.y * 1.7) + 0.05 * Math.sin(clock / 47 + st.x);
              const rad = def.glow.r * flick;
              const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
              grad.addColorStop(0, `rgba(255,190,90,${(0.32 * dark).toFixed(3)})`);
              grad.addColorStop(1, "rgba(255,150,40,0)");
              ctx.fillStyle = grad;
              ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
            }
            ctx.restore();
          }
        }

        // Beschriftungen (Namen, Sprechblasen, Emotes) als HTML über der Zeichenfläche
        const nowMs = Date.now();
        for (const [id, bb] of bubblesRef.current) if (bb.until < nowMs) bubblesRef.current.delete(id);
        const myBubble = myCardIdRef.current ? bubblesRef.current.get(myCardIdRef.current) : undefined;
        const myEmote = myEmoteRef.current && myEmoteRef.current.until > nowMs ? myEmoteRef.current.icon : undefined;
        camRef.current = { x: camX, y: camY };
        // Interaktions-Hinweise: wen man gerade ansprechen kann, welche Tür man betritt
        if (!g.dialog && !pausedRef.current) {
          const tgt = interactTarget(g);
          if (tgt) labels.push({ key: "hint", x: tgt.x * T + T / 2 - camX, y: tgt.y * T - camY - (tgt.kind === "npc" || tgt.kind === "merchant" ? 16 : 3), hint: coarse.current ? `💬 ${tgt.name}` : `E · ${tgt.name}` });
          else {
            const di = doorAhead(g);
            if (di >= 0) { const f = doorFront(world.map.buildings[di]); labels.push({ key: "hint", x: f.x * T + T / 2 - camX, y: (f.y - 1) * T - camY, hint: coarse.current ? "🚪 Eintreten" : "↑ Eintreten" }); }
            else if (g.scene !== null) {
              const it = world.map.buildings[g.scene]?.interior;
              if (it && g.px === it.exitX && g.py === it.rows - 2) labels.push({ key: "hint", x: it.exitX * T + T / 2 - camX, y: (it.rows - 1) * T - camY, hint: coarse.current ? "🚪 Hinaus" : "↓ Hinaus" });
            }
          }
        }
        if (myBubble || myEmote) labels.push({ key: "me", x: fx * T + T / 2 - camX, y: fy * T - camY - 13, bubble: myBubble?.text, emote: myEmote });
        if (labelLayerRef.current) syncLabels(labelLayerRef.current, labelCache.current, labels, canvas.width, canvas.height);

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

  const STICK_START = 14;
  const STICK_SPRINT = 80;
  const releaseStick = () => { heldRef.current = []; sprintStick.current = false; setStick(null); };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pausedRef.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      // Zwei Finger: Zoom statt Laufen
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      gesture.current = null;
      releaseStick();
      return;
    }
    gesture.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t: performance.now(), stick: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const target = pinch.current.z * (d / Math.max(1, pinch.current.d));
      setZoom(() => target);
      return;
    }
    const gs = gesture.current;
    if (!gs || gs.id !== e.pointerId || pausedRef.current) return;
    const dx = e.clientX - gs.sx;
    const dy = e.clientY - gs.sy;
    const dist = Math.hypot(dx, dy);
    if (!gs.stick && dist < STICK_START) return;
    if (!gs.stick) {
      gs.stick = true;
      if (gameRef.current) { gameRef.current.path = []; gameRef.current.goal = null; }
    }
    // Joystick: Richtung nach der stärkeren Achse; weit ziehen = sprinten
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    heldRef.current = [dir];
    sprintStick.current = dist > STICK_SPRINT;
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect) {
      const cl = Math.min(1, 44 / Math.max(1, dist));
      setStick({ ox: gs.sx - rect.left, oy: gs.sy - rect.top, x: gs.sx - rect.left + dx * cl, y: gs.sy - rect.top + dy * cl });
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gs = gesture.current;
    ptrs.current.delete(e.pointerId);
    if (pinch.current) { if (ptrs.current.size < 2) pinch.current = null; gesture.current = null; return; }
    if (!gs || gs.id !== e.pointerId) return;
    gesture.current = null;
    if (gs.stick) { releaseStick(); return; }
    // Kurzer Tipp/Klick: zu dieser Kachel laufen (Akteure = hingehen + ansprechen, Gebäude = hinein)
    const canvas = canvasRef.current;
    const g = gameRef.current;
    if (!canvas || !g || pausedRef.current || performance.now() - gs.t > 600) return;
    const rect = canvas.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width) * canvas.width + camRef.current.x;
    const ly = ((e.clientY - rect.top) / rect.height) * canvas.height + camRef.current.y;
    const tx = Math.floor(lx / T);
    const ty = Math.floor(ly / T);
    // Ein Akteur wird auch angeklickt, wenn man auf seine Figur (über der Kachel) tippt
    const hit = g.map.actors.find((a) => a.x === tx && (a.y === ty || (a.kind !== "chest" && a.kind !== "sign" && a.y === ty + 1)));
    walkTo(g, hit ? hit.x : tx, hit ? hit.y : ty);
  };
  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    ptrs.current.delete(e.pointerId);
    pinch.current = null;
    gesture.current = null;
    releaseStick();
  };
  // Strg + Mausrad zoomt (ohne Strg bleibt das Seiten-Scrollen unberührt)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom((z) => z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [setZoom]);

  return (
    <div ref={wrapRef} className="space-y-2 w-full max-w-[1800px] mx-auto">
      <div ref={frameRef} className="relative overflow-hidden oq-panel bg-[#0b1524] select-none" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={VIEW_W * T}
          height={VIEW_H * T}
          className="block w-full h-auto"
          style={{ imageRendering: "pixelated", aspectRatio: `${VIEW_W} / ${VIEW_H}`, touchAction: "none", cursor: "pointer" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
          role="img"
          aria-label={world.title}
        />
        {stick && (
          <div className="absolute inset-0 z-20 pointer-events-none" aria-hidden>
            <div className="absolute w-24 h-24 -ml-12 -mt-12 rounded-full border-4 border-white/35 bg-white/10" style={{ left: stick.ox, top: stick.oy }} />
            <div className="absolute w-11 h-11 -ml-[22px] -mt-[22px] rounded-full bg-violet-500/80 border-2 border-white/70" style={{ left: stick.x, top: stick.y }} />
          </div>
        )}

        <div ref={labelLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-10" aria-hidden />
        <GameFeed items={feed ?? []} />
        {dice && <DiceOverlay ability={dice.ability} dc={dice.dc} roll={dice.roll} onDone={() => { diceDone.current?.(); diceDone.current = null; }} />}
        {hud && !ui.dialog && <div className="absolute left-2 bottom-2 z-10 pointer-events-none">{hud}</div>}
        {overlay}

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

      {/* Bedienung: Klick/Tippen zum Laufen, Ziehen = Joystick, WASD/Pfeile, Shift = Sprint, E = Ansprechen */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {extraControls}
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <button type="button" onClick={() => setZoom((z) => z / 1.25)} aria-label="Herauszoomen" className="oq-btn h-9 w-9 text-base grid place-items-center">−</button>
          <button type="button" onClick={() => setZoom((z) => z * 1.25)} aria-label="Hineinzoomen" className="oq-btn h-9 w-9 text-base grid place-items-center">+</button>
        </div>
        <p className="hidden md:block text-[11px] text-gray-500 max-w-[520px] text-center">
          Klicken oder Tippen zum Laufen (auf Personen zum Ansprechen, auf Häuser zum Eintreten) · WASD/Pfeile · Shift sprintet · E/Leertaste spricht an · Ziehen bewegt wie ein Joystick · Strg + Mausrad oder zwei Finger zoomen
        </p>
      </div>
    </div>
  );
}
