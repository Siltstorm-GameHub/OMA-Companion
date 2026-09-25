"use client";

// ============================================
// Begehbare Karte (Prototyp): Zeichnen, Eingabe, Dialog, Quest-Anzeige
// ============================================
// Logik liegt in lib/te-map/engine.ts. Hier: Kacheln laden, statische Ebene (Boden, Wege, Häuser)
// einmal vorzeichnen, pro Frame Figuren/Objekte nach Fußlinie sortiert darüberzeichnen, Kamera
// folgt der Figur. Die Zeichenfläche hat logische Größe (20×13 Kacheln) und wird per CSS
// pixelscharf hochskaliert.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { drawTeFrame, loadTeLayers } from "@/components/te-character/TeCharacter";
import { TE_ANIMS, type TeCharacterConfig } from "@/lib/te-character";
import { groundQuarters, wallQuarters, type Quarters } from "@/lib/te-map/autotile";
import { createGame, drainEvents, pressAction, step, TILE_MS, type Dialog, type Dir, type Game } from "@/lib/te-map/engine";
import { STAMPS, type StampId, type TileSheet } from "@/lib/te-map/stamps";
import { GROUND, QUEST, VILLAGE, type QuestStep } from "@/lib/te-map/village";

const T = 16;
const VIEW_W = 20;
const VIEW_H = 13;

const SHEET_FILES = {
  a2: "/te/tiles/tileA2.png",
  a3: "/te/tiles/tileA3.png",
  out: "/te/tiles/tileB_outside.png",
  town: "/te/tiles/tileB_town.png",
  chests: "/te/tiles/chests.png",
} as const;
type SheetKey = keyof typeof SHEET_FILES;
type Sheets = Record<SheetKey, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild fehlt: ${src}`));
    img.src = src;
  });
}

async function loadSheets(): Promise<Sheets> {
  const entries = await Promise.all(Object.entries(SHEET_FILES).map(async ([k, v]) => [k, await loadImage(v)] as const));
  return Object.fromEntries(entries) as Sheets;
}

function drawQuarters(ctx: CanvasRenderingContext2D, img: HTMLImageElement, bx: number, by: number, q: Quarters, dx: number, dy: number) {
  for (let i = 0; i < 4; i++) {
    ctx.drawImage(img, bx + q[i][0] * 8, by + q[i][1] * 8, 8, 8, dx + (i % 2) * 8, dy + (i >> 1) * 8, 8, 8);
  }
}

/** Stempel an Pixelposition (x, y) — obere linke Ecke — zeichnen. */
function drawStamp(ctx: CanvasRenderingContext2D, sheets: Sheets, id: StampId, x: number, y: number) {
  const s = STAMPS[id];
  ctx.drawImage(sheets[s.sheet as TileSheet], s.sx * T, s.sy * T, s.w * T, s.h * T, x, y, s.w * T, s.h * T);
}

/** Boden, Wege, Pflaster und Häuser einmal in eine große Zeichenfläche vorzeichnen. */
function bakeStatic(sheets: Sheets): HTMLCanvasElement {
  const m = VILLAGE;
  const c = document.createElement("canvas");
  c.width = m.cols * T;
  c.height = m.rows * T;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) ctx.drawImage(sheets.a2, 0, 0, T, T, x * T, y * T, T, T);

  const blocks: Record<number, [number, number]> = { [GROUND.dirt]: [32, 0], [GROUND.cobble]: [64, 48] };
  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      const type = m.ground[y][x];
      const block = blocks[type];
      if (!block) continue;
      // Außerhalb der Karte zählt als gleiche Fläche, damit Wege bis zum Rand durchlaufen.
      const same = (dx: number, dy: number) => (m.ground[y + dy]?.[x + dx] ?? type) === type;
      drawQuarters(ctx, sheets.a2, block[0], block[1], groundQuarters(same), x * T, y * T);
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

export default function TeMapGame({ character }: { character: TeCharacterConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(createGame(VILLAGE));
  const heldRef = useRef<Dir[]>([]);
  /** Kurzer Tastendruck, der zwischen zwei Frames beginnt und endet, soll trotzdem einen Schritt auslösen. */
  const tapRef = useRef<Dir | null>(null);
  // Was das React-UI (Quest-Text, Dialog) vom Spielzustand braucht; der Zustand selbst lebt im Ref und wird pro Frame gezeichnet.
  const [ui, setUi] = useState<{ quest: QuestStep; dialog: Dialog | null }>({ quest: 0, dialog: null });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const npcKey = useMemo(() => JSON.stringify(VILLAGE.npcs.map((n) => n.config)), []);
  const playerKey = JSON.stringify(character);

  // Figuren-Bilder (Spieler + NPCs) — werden bei Änderung des Charakters neu geladen.
  const spritesRef = useRef<{ player: HTMLImageElement[]; npcs: Map<string, HTMLImageElement[]> }>({ player: [], npcs: new Map() });
  useEffect(() => {
    let cancelled = false;
    loadTeLayers(character).then((imgs) => { if (!cancelled) spritesRef.current.player = imgs; });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerKey]);

  const action = useCallback(() => {
    const g = gameRef.current;
    pressAction(g);
    for (const e of drainEvents(g)) {
      if (e === "questStarted") toast("Neue Quest: " + QUEST.title, { description: QUEST.objectives[1] });
      if (e === "gotJug") toast.success("Krug gefunden!", { description: QUEST.objectives[2] });
      if (e === "questComplete") toast.success("Quest abgeschlossen: " + QUEST.title, { description: QUEST.reward });
    }
    setUi({ quest: g.quest, dialog: g.dialog ? { ...g.dialog } : null });
  }, []);

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
      const npcImgs = await Promise.all(VILLAGE.npcs.map(async (n) => [n.id, await loadTeLayers(n.config)] as const));
      if (cancelled) return;
      spritesRef.current.npcs = new Map(npcImgs);
      const baked = bakeStatic(sheets);
      setReady(true);
      ctx.imageSmoothingEnabled = false;

      const frame = (now: number) => {
        if (cancelled) return;
        const dt = Math.min(64, now - last);
        last = now;
        clock += dt;
        const g = gameRef.current;
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
        const camX = Math.round(Math.min(Math.max(fx * T + T / 2 - (VIEW_W * T) / 2, 0), VILLAGE.cols * T - VIEW_W * T));
        const camY = Math.round(Math.min(Math.max(fy * T + T / 2 - (VIEW_H * T) / 2, 0), VILLAGE.rows * T - VIEW_H * T));

        ctx.fillStyle = "#0b1524";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baked, camX, camY, VIEW_W * T, VIEW_H * T, 0, 0, VIEW_W * T, VIEW_H * T);

        // Sortierte Sprites (Fußlinie = Unterkante)
        type Sprite = { base: number; draw: () => void };
        const sprites: Sprite[] = [];
        for (const s of VILLAGE.stamps) {
          const d = STAMPS[s.id];
          if (s.x * T + d.w * T < camX || s.x * T > camX + VIEW_W * T || s.y * T + d.h * T < camY || s.y * T > camY + VIEW_H * T) continue;
          sprites.push({ base: (s.y + d.h) * T, draw: () => drawStamp(ctx, sheets, s.id, s.x * T - camX, s.y * T - camY) });
        }
        const chest = VILLAGE.chest;
        sprites.push({
          base: (chest.y + 1) * T,
          draw: () => ctx.drawImage(sheets.chests, 16, g.chestOpen ? 112 : 16, 16, 16, chest.x * T - camX, chest.y * T - camY, 16, 16),
        });
        for (const n of VILLAGE.npcs) {
          const imgs = spritesRef.current.npcs.get(n.id) ?? [];
          sprites.push({ base: (n.y + 1) * T, draw: () => drawTeFrame(ctx, imgs, 1, n.dir, n.x * T - camX + T / 2 - 24, n.y * T - camY - 16, 1) });
        }
        const walkFrames = TE_ANIMS.walk.frames;
        const pf = g.move ? walkFrames[Math.floor((clock / 1000) * TE_ANIMS.walk.fps) % walkFrames.length] : 1;
        sprites.push({
          base: fy * T + T,
          draw: () => drawTeFrame(ctx, spritesRef.current.player, pf, g.dir, fx * T - camX + T / 2 - 24, fy * T - camY - 16, 1),
        });
        sprites.sort((a, b) => a.base - b.base);
        for (const s of sprites) s.draw();

        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [npcKey]);

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
          aria-label="Dorf Krähbach"
        />

        {/* Quest-Anzeige */}
        <div className="absolute top-2 left-2 max-w-[60%] rounded-lg bg-black/65 px-2.5 py-1.5 pointer-events-none">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">{QUEST.title}</p>
          <p className="text-[11px] text-white leading-snug">{QUEST.objectives[ui.quest]}</p>
        </div>

        {!ready && !loadError && <p className="absolute inset-0 grid place-items-center text-xs text-gray-400">Lade Dorf …</p>}
        {loadError && <p className="absolute inset-0 grid place-items-center text-xs text-red-400 px-4 text-center">{loadError}</p>}

        {/* Dialog */}
        {dialog && (
          <button
            type="button"
            onClick={action}
            className="absolute inset-x-2 bottom-2 rounded-xl border border-white/20 bg-[#0b1220]/95 p-3 text-left"
          >
            <p className="text-[11px] font-bold text-amber-300 mb-0.5">{dialog.speaker}</p>
            <p className="text-sm text-white leading-snug">{dialog.lines[dialog.index]}</p>
            <p className="text-[10px] text-gray-500 mt-1.5 text-right">
              {dialog.index < dialog.lines.length - 1 ? "Weiter ▶" : "Schließen ▶"}
            </p>
          </button>
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
