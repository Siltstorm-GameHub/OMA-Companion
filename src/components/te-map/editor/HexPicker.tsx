"use client";

// ============================================
// Feld-Auswahl auf der Hex-Weltkarte für eine neue Location (nur leere Landfelder)
// ============================================

import { useEffect, useState } from "react";
import { hexCenter, hexCorners, pointToHex, type Hex } from "@/lib/dnd/hex/grid";
import { TERRAIN } from "@/lib/dnd/hex/terrain";
import { WORLD_COLS, WORLD_IMAGE, WORLD_LAYOUT, WORLD_ROWS, terrainAt } from "@/lib/dnd/hex/world";

interface Taken { col: number; row: number; slug: string; name: string }

interface Props {
  value: Hex | null;
  onChange: (hex: Hex) => void;
  /** Eigener Slug: das eigene Feld gilt nicht als belegt. */
  ownSlug: string;
  readOnly: boolean;
}

const polygon = (h: Hex) => {
  const c = hexCenter(h, WORLD_LAYOUT);
  return hexCorners(WORLD_LAYOUT).map(([dx, dy]) => `${c.x + dx},${c.y + dy}`).join(" ");
};

export default function HexPicker({ value, onChange, ownSlug, readOnly }: Props) {
  const [taken, setTaken] = useState<Taken[]>([]);
  const [zoom, setZoom] = useState(2);
  const [hover, setHover] = useState<Hex | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/dnd/custom-worlds/hexes").then((r) => r.json()).then((j) => { if (!cancelled && j.taken) setTaken(j.taken); }).catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  const occupant = (h: Hex) => taken.find((t) => t.col === h.col && t.row === h.row && t.slug !== ownSlug);
  const problemOf = (h: Hex): string | null => {
    const t = terrainAt(h);
    if (!t || t === "o" || t === "l" || t === "v") return "Wasser/Lava — hier kann nichts stehen";
    const o = occupant(h);
    return o ? `Belegt von „${o.name}“` : null;
  };

  const pick = (e: React.MouseEvent<SVGSVGElement>): Hex | null => {
    const r = e.currentTarget.getBoundingClientRect();
    return pointToHex(((e.clientX - r.left) / r.width) * WORLD_LAYOUT.width, ((e.clientY - r.top) / r.height) * WORLD_LAYOUT.height, WORLD_LAYOUT, WORLD_COLS, WORLD_ROWS);
  };

  const label = value ? `Feld ${value.col}, ${value.row} · ${TERRAIN[terrainAt(value) ?? "p"].label}` : "Noch kein Feld gewählt";
  const hoverProblem = hover ? problemOf(hover) : null;

  return (
    <div className="moba-panel rounded-2xl p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Standort auf der Weltkarte</p>
        <span className={`text-xs ${value ? "text-emerald-300" : "text-amber-300"}`}>{label}</span>
        {!readOnly && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="ml-auto rounded-lg border border-white/15 text-gray-200 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">
            {open ? "Karte schließen" : value ? "Feld ändern" : "Feld wählen"}
          </button>
        )}
      </div>
      {open && !readOnly && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <label className="flex items-center gap-1.5">Zoom
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">
                <option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option><option value={4}>4×</option>
              </select>
            </label>
            <span className="text-amber-300">■ belegt</span><span className="text-emerald-300">■ deine Wahl</span>
            <span className="ml-auto">{hover ? `${hover.col}, ${hover.row} · ${TERRAIN[terrainAt(hover) ?? "p"].label}${hoverProblem ? ` — ${hoverProblem}` : ""}` : "Feld anklicken"}</span>
          </div>
          <div className="rounded-xl border border-white/10 overflow-auto max-h-[60vh] bg-black/40">
            <div className="relative" style={{ width: `${zoom * 100}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={WORLD_IMAGE} alt="Weltkarte" draggable={false} className="block w-full h-auto" />
              <svg
                viewBox={`0 0 ${WORLD_LAYOUT.width} ${WORLD_LAYOUT.height}`}
                className="absolute inset-0 w-full h-full"
                style={{ cursor: "crosshair" }}
                onPointerMove={(e) => { const h = pick(e); setHover((p) => (p && h && p.col === h.col && p.row === h.row ? p : h)); }}
                onPointerLeave={() => setHover(null)}
                onClick={(e) => {
                  const h = pick(e);
                  if (!h) return;
                  const problem = problemOf(h);
                  if (problem) return;
                  onChange(h);
                }}
              >
                {taken.map((t) => <polygon key={t.slug} points={polygon(t)} fill="rgba(251,191,36,0.35)" stroke="#fbbf24" strokeWidth={3} vectorEffect="non-scaling-stroke"><title>{t.name}</title></polygon>)}
                {hover && <polygon points={polygon(hover)} fill={hoverProblem ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.25)"} stroke={hoverProblem ? "#ef4444" : "#fff"} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
                {value && <polygon points={polygon(value)} fill="rgba(52,211,153,0.45)" stroke="#34d399" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
