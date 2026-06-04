"use client";
import { useEffect, useRef } from "react";

// ── Hex-Grid + Glow-Pulse Background ─────────────────────────────────────────
// Draws a honeycomb grid where individual cells periodically light up
// with a rose/violet glow. A slow drift keeps it alive without being distracting.

const HEX_SIZE   = 36;   // radius of each hexagon
const GAP        = 4;    // gap between hexagons
const STEP       = HEX_SIZE * 2 + GAP;

// Color palette — rose and violet
const PULSE_COLORS = [
  [244,  63,  94],  // rose-500
  [244,  63,  94],  // rose (weighted)
  [139,  92, 246],  // violet-500
  [167, 139, 250],  // violet-300
  [251, 113, 133],  // rose-400
];

interface Cell {
  col: number;
  row: number;
  cx: number;
  cy: number;
  phase: number;       // current animation phase (0 = idle, 1 = peak glow)
  speed: number;       // how fast it pulses
  color: number[];
  active: boolean;
  timer: number;       // countdown until next activation
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else         ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let cells: Cell[] = [];
    let t = 0;

    function buildGrid() {
      if (!canvas) return;
      cells = [];
      const w = canvas.width;
      const h = canvas.height;

      const cols = Math.ceil(w / (STEP * 0.75)) + 2;
      const rows = Math.ceil(h / STEP) + 2;

      for (let col = -1; col < cols; col++) {
        for (let row = -1; row < rows; row++) {
          const cx = col * STEP * 0.75;
          const cy = row * STEP + (col % 2 === 0 ? 0 : STEP / 2);
          cells.push({
            col, row, cx, cy,
            phase:  0,
            speed:  Math.random() * 0.008 + 0.004,
            color:  PULSE_COLORS[Math.floor(Math.random() * PULSE_COLORS.length)],
            active: false,
            timer:  Math.random() * 400 + 100,
          });
        }
      }
    }

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      buildGrid();
    }

    // Randomly activate cells over time
    function tickActivations() {
      const now = t;
      for (const cell of cells) {
        if (!cell.active) {
          cell.timer--;
          if (cell.timer <= 0) {
            cell.active = true;
            cell.phase  = 0;
            cell.color  = PULSE_COLORS[Math.floor(Math.random() * PULSE_COLORS.length)];
            cell.speed  = Math.random() * 0.012 + 0.005;
            // Re-schedule next activation
            cell.timer  = Math.random() * 600 + 200;
          }
        }
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tickActivations();

      for (const cell of cells) {
        // Advance phase for active cells
        if (cell.active) {
          cell.phase += cell.speed;
          if (cell.phase >= Math.PI) {
            cell.phase  = 0;
            cell.active = false;
          }
        }

        const glowAlpha = cell.active ? Math.sin(cell.phase) : 0;

        // ── Base hex outline ──────────────────────────────────────
        hexPath(ctx, cell.cx, cell.cy, HEX_SIZE - GAP / 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.028 + glowAlpha * 0.04})`;
        ctx.lineWidth   = 0.5 + glowAlpha * 0.8;
        ctx.stroke();

        // ── Glow fill when active ─────────────────────────────────
        if (glowAlpha > 0.01) {
          const [r, g, b] = cell.color;

          // Inner fill
          hexPath(ctx, cell.cx, cell.cy, HEX_SIZE - GAP / 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${glowAlpha * 0.07})`;
          ctx.fill();

          // Radial glow from center
          const grad = ctx.createRadialGradient(
            cell.cx, cell.cy, 0,
            cell.cx, cell.cy, HEX_SIZE
          );
          grad.addColorStop(0,   `rgba(${r},${g},${b},${glowAlpha * 0.18})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${glowAlpha * 0.07})`);
          grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

          hexPath(ctx, cell.cx, cell.cy, HEX_SIZE * 1.5);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
      data-animated-bg
      style={{ zIndex: 0 }}
    />
  );
}
