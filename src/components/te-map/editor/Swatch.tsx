"use client";

import { useEffect, useRef } from "react";
import type { Sheets } from "@/components/te-map/TeWorld";

/** Kleine Vorschau eines Objekts (Stempel) bzw. Dach-/Wandblocks; wird passend in ein Feld von `box` Pixeln eingepasst. */
export function Swatch({ sheets, draw, w, h, selected, title, onClick, box = 44, label }: {
  sheets: Sheets | null; draw: (ctx: CanvasRenderingContext2D, sheets: Sheets) => void; w: number; h: number; selected: boolean; title: string; onClick: () => void; box?: number; label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !sheets) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    draw(ctx, sheets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets, w, h]);
  const scale = Math.min(box / w, box / h, 3);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-md border p-1 bg-[#1b2a3d] ${selected ? "border-amber-400 ring-1 ring-amber-400" : "border-white/10 hover:border-white/30"}`}
      style={{ minHeight: box + 8 }}
    >
      <canvas ref={ref} width={w} height={h} style={{ imageRendering: "pixelated", width: w * scale, height: h * scale }} />
      {label && <span className="text-[9px] leading-none text-gray-400">{label}</span>}
    </button>
  );
}
