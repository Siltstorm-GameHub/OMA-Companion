// ============================================
// OMA Blocks — Canvas-Zeichnen (Spielfeld, Hold, Vorschau, Gegner-Minifelder)
// ============================================

import {
  BlocksEngine, GARBAGE_CELL, HEIGHT, PIECES, PREVIEW_COUNT, SHAPES, VISIBLE_ROWS, VISIBLE_TOP, WIDTH, type PieceType,
} from "@/lib/blocks/engine";

/** Farben je Zell-Code (Index 0 = leer). Eigene OMA-Palette. */
export const CELL_COLORS = ["", "#2dd4bf", "#fbbf24", "#c084fc", "#4ade80", "#fb7185", "#60a5fa", "#fb923c", "#64748b"];

const BG = "#0b0f17";
const GRID = "rgba(255,255,255,0.045)";
const FRAME = "rgba(255,255,255,0.16)";

/** Spalten des Gesamtlayouts: Hold (4.5) | Feld (10) | Vorschau (4.5) — plus Garbage-Leiste. */
export const LAYOUT_COLS = 4.5 + 0.6 + WIDTH + 0.5 + 4.5;
/** Linker Rand des Spielfelds im Layout (in Zellen). */
export const BOARD_LEFT = 4.5 + 0.6;
/** Zeilen: sichtbares Feld + 2 Pufferzeilen oben. */
export const LAYOUT_ROWS = VISIBLE_ROWS + 2.8;

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s, s);
  // leichte Kante oben/links für Tiefe
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(x, y, s, Math.max(1, s * 0.12));
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x, y + s - Math.max(1, s * 0.12), s, Math.max(1, s * 0.12));
  ctx.globalAlpha = 1;
}

function drawMiniPiece(ctx: CanvasRenderingContext2D, type: PieceType, cx: number, cy: number, s: number, dim = false): void {
  const cells = SHAPES[type][0];
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const w = Math.max(...xs) - Math.min(...xs) + 1;
  const h = Math.max(...ys) - Math.min(...ys) + 1;
  const ox = cx - (w * s) / 2 - Math.min(...xs) * s;
  const oy = cy - (h * s) / 2 - Math.min(...ys) * s;
  const color = CELL_COLORS[PIECES.indexOf(type) + 1];
  for (const [x, y] of cells) drawCell(ctx, ox + x * s, oy + y * s, s - 1, dim ? "#475569" : color);
}

export interface DrawOptions {
  /** Kantenlänge einer Zelle in Canvas-Pixeln. */
  cell: number;
  /** 0..1 — kurzes Aufblitzen nach Line-Clear. */
  flash: number;
  ghost: boolean;
}

/** Zeichnet das komplette Spielfeld inkl. Hold, Vorschau und Garbage-Leiste. */
export function drawGame(ctx: CanvasRenderingContext2D, e: BlocksEngine, o: DrawOptions): void {
  const s = o.cell;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  const boardX = BOARD_LEFT * s;
  const boardY = 2.5 * s;
  const boardW = WIDTH * s;
  const boardH = VISIBLE_ROWS * s;

  // Feld-Hintergrund + Raster
  ctx.fillStyle = BG;
  ctx.fillRect(boardX, boardY, boardW, boardH);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < WIDTH; x++) {
    ctx.moveTo(boardX + x * s + 0.5, boardY);
    ctx.lineTo(boardX + x * s + 0.5, boardY + boardH);
  }
  for (let y = 1; y < VISIBLE_ROWS; y++) {
    ctx.moveTo(boardX, boardY + y * s + 0.5);
    ctx.lineTo(boardX + boardW, boardY + y * s + 0.5);
  }
  ctx.stroke();

  // Liegende Blöcke (inkl. 2 Pufferzeilen über dem Feld)
  const firstRow = VISIBLE_TOP - 2;
  for (let y = firstRow; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const c = e.cell(x, y);
      if (!c) continue;
      drawCell(ctx, boardX + x * s, boardY + (y - VISIBLE_TOP) * s, s, CELL_COLORS[c], e.gameOver ? 0.45 : 1);
    }
  }

  // Ghost + aktives Teil
  if (e.active && !e.gameOver) {
    const color = CELL_COLORS[PIECES.indexOf(e.active.type) + 1];
    if (o.ghost) {
      const gy = e.ghostY();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1, s * 0.08);
      for (const [x, y] of e.activeCells({ ...e.active, y: gy })) {
        if (y < firstRow) continue;
        ctx.strokeRect(boardX + x * s + 1.5, boardY + (y - VISIBLE_TOP) * s + 1.5, s - 3, s - 3);
      }
      ctx.globalAlpha = 1;
    }
    for (const [x, y] of e.activeCells()) {
      if (y < firstRow) continue;
      drawCell(ctx, boardX + x * s, boardY + (y - VISIBLE_TOP) * s, s, color);
    }
  }

  // Aufblitzen nach Clear
  if (o.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.18 * o.flash})`;
    ctx.fillRect(boardX, boardY, boardW, boardH);
  }

  // Rahmen
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 2;
  ctx.strokeRect(boardX - 1, boardY - 1, boardW + 2, boardH + 2);

  // Garbage-Leiste links vom Feld
  const pending = e.pendingGarbageTotal;
  if (pending > 0) {
    const h = Math.min(VISIBLE_ROWS, pending) * s;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(boardX - 0.5 * s, boardY + boardH - h, 0.35 * s, h);
  }

  // Hold
  const labelSize = Math.max(9, Math.round(s * 0.55));
  ctx.font = `700 ${labelSize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.textAlign = "center";
  ctx.fillText("HOLD", 2.25 * s, boardY + labelSize);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0.25 * s, boardY + labelSize * 1.4, 4 * s, 3 * s);
  if (e.hold) drawMiniPiece(ctx, e.hold, 2.25 * s, boardY + labelSize * 1.4 + 1.5 * s, s * 0.8, e.holdUsed);

  // Vorschau
  const nextX = boardX + boardW + 0.5 * s;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("NEXT", nextX + 2.25 * s, boardY + labelSize);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(nextX + 0.25 * s, boardY + labelSize * 1.4, 4 * s, PREVIEW_COUNT * 2.6 * s);
  for (let i = 0; i < PREVIEW_COUNT && i < e.queue.length; i++) {
    drawMiniPiece(ctx, e.queue[i], nextX + 2.25 * s, boardY + labelSize * 1.4 + (i * 2.6 + 1.3) * s, s * (i === 0 ? 0.8 : 0.65));
  }
}

/** Gegner-Minifeld aus dem 200-Zeichen-String (siehe encodeVisibleBoard). */
export function drawMiniBoard(ctx: CanvasRenderingContext2D, board: string | null, pendingGarbage: number, dead: boolean): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const s = Math.floor(Math.min(W / (WIDTH + 0.6), H / VISIBLE_ROWS));
  const ox = Math.floor((W - WIDTH * s) / 2);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG;
  ctx.fillRect(ox, 0, WIDTH * s, VISIBLE_ROWS * s);
  if (board) {
    for (let i = 0; i < board.length; i++) {
      const c = board.charCodeAt(i) - 48;
      if (!c) continue;
      const x = i % WIDTH;
      const y = Math.floor(i / WIDTH);
      ctx.globalAlpha = dead ? 0.35 : 1;
      ctx.fillStyle = CELL_COLORS[c] ?? CELL_COLORS[GARBAGE_CELL];
      ctx.fillRect(ox + x * s, y * s, s - 1, s - 1);
    }
    ctx.globalAlpha = 1;
  }
  if (pendingGarbage > 0) {
    const h = Math.min(VISIBLE_ROWS, pendingGarbage) * s;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(Math.max(0, ox - Math.ceil(s * 0.5)), VISIBLE_ROWS * s - h, Math.max(2, Math.floor(s * 0.35)), h);
  }
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, 0.5, WIDTH * s - 1, VISIBLE_ROWS * s - 1);
}
