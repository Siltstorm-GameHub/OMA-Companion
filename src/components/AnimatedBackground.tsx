"use client";
import { useEffect, useRef } from "react";

const HEX_SIZE = 38;
const GAP      = 5;
const STEP     = HEX_SIZE * 2 + GAP;

const PULSE_COLORS: [number, number, number][] = [
  [244,  63,  94],  // rose-500
  [244,  63,  94],  // rose (extra weight)
  [139,  92, 246],  // violet-500
  [167, 139, 250],  // violet-300
  [251, 113, 133],  // rose-400
];

interface Cell {
  cx: number;
  cy: number;
  phase: number;
  speed: number;
  color: [number, number, number];
  active: boolean;
  timer: number;
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function randomColor(): [number, number, number] {
  return PULSE_COLORS[Math.floor(Math.random() * PULSE_COLORS.length)];
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
      const cols = Math.ceil(canvas.width  / (STEP * 0.75)) + 3;
      const rows = Math.ceil(canvas.height / STEP) + 3;

      for (let col = -1; col < cols; col++) {
        for (let row = -1; row < rows; row++) {
          const cx = col * STEP * 0.75;
          const cy = row * STEP + (col % 2 === 0 ? 0 : STEP / 2);
          cells.push({
            cx, cy,
            phase:  0,
            speed:  Math.random() * 0.01 + 0.005,
            color:  randomColor(),
            active: false,
            timer:  Math.random() * 300 + 60,
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

    function draw() {
      if (!canvas || !ctx) return;
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const cell of cells) {
        // Tick timer → activate
        if (!cell.active) {
          cell.timer--;
          if (cell.timer <= 0) {
            cell.active = true;
            cell.phase  = 0;
            cell.color  = randomColor();
            cell.speed  = Math.random() * 0.012 + 0.005;
            cell.timer  = Math.random() * 500 + 150;
          }
        }

        // Advance phase
        if (cell.active) {
          cell.phase += cell.speed;
          if (cell.phase >= Math.PI) {
            cell.active = false;
            cell.phase  = 0;
          }
        }

        const glow = cell.active ? Math.sin(cell.phase) : 0;
        const [r, g, b] = cell.color;

        // ── Always-visible hex border ─────────────────────────────
        hexPath(ctx, cell.cx, cell.cy, HEX_SIZE - GAP / 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.07 + glow * 0.25})`;
        ctx.lineWidth   = 0.7 + glow * 1.4;
        ctx.stroke();

        // ── Glow effects when active ──────────────────────────────
        if (glow > 0.02) {
          // Inner fill
          hexPath(ctx, cell.cx, cell.cy, HEX_SIZE - GAP / 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${glow * 0.12})`;
          ctx.fill();

          // Outer radial glow (bleeds beyond hex edges)
          const grad = ctx.createRadialGradient(
            cell.cx, cell.cy, 0,
            cell.cx, cell.cy, HEX_SIZE * 1.6
          );
          grad.addColorStop(0,   `rgba(${r},${g},${b},${glow * 0.30})`);
          grad.addColorStop(0.4, `rgba(${r},${g},${b},${glow * 0.12})`);
          grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
          hexPath(ctx, cell.cx, cell.cy, HEX_SIZE * 1.6);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
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
      aria-hidden="true"
      data-animated-bg
      style={{
        position:      "fixed",
        top:           0,
        left:          0,
        width:         "100%",
        height:        "100%",
        zIndex:        1,          // above body blobs (z-index 0), below content (z-index 2)
        pointerEvents: "none",
      }}
    />
  );
}
