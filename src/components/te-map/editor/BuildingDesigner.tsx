"use client";

// ============================================
// Gebäude-Designer: Live-Vorschau des ganzen Hauses (Tür/Fenster per Klick), Vorlagen, Größe, Dach- und Wandfarbe.
// Wird für neue Gebäude (Werkzeug) und für das ausgewählte Gebäude benutzt.
// ============================================

import { useEffect, useRef, useState } from "react";
import { drawBuilding, T, type Sheets } from "@/components/te-map/TeWorld";
import { LIMITS } from "@/lib/te-map/custom-world";
import type { Building } from "@/lib/te-map/types";
import { Swatch } from "./Swatch";

export type BuildingLook = Pick<Building, "name" | "w" | "roofRows" | "roof" | "wall" | "doorDx" | "windowDx" | "sign">;

export const MIN_W = 3;
export const MAX_W = 12;
const ROOF_HEIGHTS = [{ v: 2, label: "Niedrig" }, { v: 3, label: "Mittel" }, { v: 4, label: "Hoch" }];
const SIGNS: { v: Building["sign"] | ""; label: string }[] = [{ v: "", label: "Keins" }, { v: "shopSword", label: "Waffen" }, { v: "shopInn", label: "Gasthaus" }, { v: "shopMug", label: "Krug" }];

type Preset = { id: string; label: string; look: BuildingLook };
const PRESETS: Preset[] = [
  { id: "huette", label: "Hütte", look: { w: 3, roofRows: 2, roof: { k: 6, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 1, windowDx: [], name: "Hütte" } },
  { id: "bauernhaus", label: "Bauernhaus", look: { w: 5, roofRows: 3, roof: { k: 0, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 2, windowDx: [0, 4], name: "Bauernhaus" } },
  { id: "taverne", label: "Taverne", look: { w: 7, roofRows: 3, roof: { k: 3, r: 0 }, wall: { k: 0, r: 1 }, doorDx: 3, windowDx: [1, 5], sign: "shopMug", name: "Taverne" } },
  { id: "laden", label: "Laden", look: { w: 5, roofRows: 3, roof: { k: 4, r: 0 }, wall: { k: 1, r: 1 }, doorDx: 2, windowDx: [0, 4], sign: "shopSword", name: "Laden" } },
  { id: "turm", label: "Turm", look: { w: 3, roofRows: 4, roof: { k: 5, r: 0 }, wall: { k: 2, r: 3 }, doorDx: 1, windowDx: [], name: "Turm" } },
  { id: "halle", label: "Lagerhalle", look: { w: 9, roofRows: 3, roof: { k: 2, r: 2 }, wall: { k: 3, r: 3 }, doorDx: 4, windowDx: [1, 7], name: "Lagerhalle" } },
];

/** Das Haus gezeichnet wie auf der Karte. Mit `onCell` wird es anklickbar (obere Wandreihe = Fenster, untere = Tür). */
export function HouseCanvas({ sheets, look, scale, height, onCell }: { sheets: Sheets | null; look: BuildingLook; scale?: number; height?: number; onCell?: (i: number, j: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const rows = look.roofRows + 2;
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !sheets) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, look.w * T, rows * T);
    drawBuilding(ctx, sheets, look, 0, 0);
    if (hover && onCell && hover.j >= look.roofRows) {
      ctx.fillStyle = hover.j === look.roofRows ? "rgba(251,191,36,0.35)" : "rgba(52,211,153,0.35)";
      ctx.fillRect(hover.i * T, hover.j * T, T, T);
    }
  }, [sheets, look, rows, hover, onCell]);
  const at = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { i: Math.min(look.w - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * look.w))), j: Math.min(rows - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * rows))) };
  };
  return (
    <canvas
      ref={ref}
      width={look.w * T}
      height={rows * T}
      onPointerMove={onCell ? (e) => { const c = at(e); setHover((h) => (h && h.i === c.i && h.j === c.j ? h : c)); } : undefined}
      onPointerLeave={onCell ? () => setHover(null) : undefined}
      onClick={onCell ? (e) => { const c = at(e); onCell(c.i, c.j); } : undefined}
      style={{ imageRendering: "pixelated", width: scale ? look.w * T * scale : "100%", height: scale ? rows * T * scale : height ?? "auto", objectFit: "contain", cursor: onCell ? "pointer" : undefined, display: "block" }}
      aria-label={onCell ? "Haus-Vorschau: obere Wandreihe anklicken für Fenster, untere für die Tür" : "Haus-Vorschau"}
      role="img"
    />
  );
}

function Stepper({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <span className="block">{label}</span>
      <div className="mt-0.5 flex items-center rounded border border-white/10 bg-zinc-900 overflow-hidden">
        <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className="w-8 py-1 text-white disabled:opacity-30 hover:bg-white/10" aria-label={`${label} verringern`}>−</button>
        <span className="flex-1 text-center text-white tabular-nums">{value}</span>
        <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="w-8 py-1 text-white disabled:opacity-30 hover:bg-white/10" aria-label={`${label} erhöhen`}>+</button>
      </div>
    </div>
  );
}

function BlockPicker({ label, sheets, rows, value, onPick, disabled }: { label: string; sheets: Sheets | null; rows: [number, number]; value: { k: number; r: number }; onPick: (v: { k: number; r: number }) => void; disabled?: boolean }) {
  const variant = value.r === rows[1] ? 1 : 0;
  return (
    <div className={disabled ? "opacity-60 pointer-events-none" : undefined}>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <div className="flex rounded-md border border-white/10 overflow-hidden text-[10px]" role="group" aria-label={`${label}: Variante`}>
          {["Variante A", "Variante B"].map((t, v) => (
            <button key={t} type="button" onClick={() => onPick({ k: value.k, r: rows[v] })} className={`px-2 py-0.5 ${variant === v ? "bg-amber-400/15 text-amber-200" : "text-gray-400 hover:text-white"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1 mt-1">
        {Array.from({ length: 8 }, (_, k) => k).map((k) => (
          <Swatch key={k} sheets={sheets} w={32} h={32} box={28} selected={value.k === k} title={`${label} ${k + 1}`}
            draw={(ctx, s) => ctx.drawImage(s.a3, k * 32, rows[variant] * 32, 32, 32, 0, 0, 32, 32)}
            onClick={() => onPick({ k, r: rows[variant] })} />
        ))}
      </div>
    </div>
  );
}

const SECTION = "text-[10px] font-semibold text-violet-400 uppercase tracking-widest";

export default function BuildingDesigner({ sheets, look, onChange, readOnly = false, showName = true }: { sheets: Sheets | null; look: BuildingLook; onChange: (patch: Partial<BuildingLook>) => void; readOnly?: boolean; showName?: boolean }) {
  const rows = look.roofRows + 2;
  const previewScale = Math.max(1, Math.min(4, Math.floor(250 / (look.w * T))));

  const setWidth = (w: number) => {
    const door = Math.min(look.doorDx, w - 1);
    onChange({ w, doorDx: door, windowDx: look.windowDx.filter((d) => d < w && d !== door) });
  };
  const clickCell = (i: number, j: number) => {
    if (readOnly) return;
    if (j === look.roofRows) {
      if (i === look.doorDx) return;
      const on = look.windowDx.includes(i);
      onChange({ windowDx: on ? look.windowDx.filter((d) => d !== i) : [...look.windowDx, i].sort((a, b) => a - b).slice(0, 4) });
    } else if (j === look.roofRows + 1) {
      onChange({ doorDx: i, windowDx: look.windowDx.filter((d) => d !== i) });
    }
  };
  const applyPreset = (p: Preset) => {
    const { name, ...rest } = p.look;
    const keepName = !look.name || PRESETS.some((x) => x.look.name === look.name);
    onChange({ ...rest, sign: rest.sign, ...(showName && keepName ? { name } : {}) });
  };
  const sameLook = (p: Preset) => p.look.w === look.w && p.look.roofRows === look.roofRows && p.look.roof.k === look.roof.k && p.look.roof.r === look.roof.r && p.look.wall.k === look.wall.k && p.look.wall.r === look.wall.r && p.look.doorDx === look.doorDx && (p.look.sign ?? "") === (look.sign ?? "");

  return (
    <div className="space-y-3 text-[11px] text-gray-400">
      {/* Live-Vorschau */}
      <div className="rounded-xl border border-white/10 bg-[#0f1c2c] p-2">
        <div className="flex justify-center items-end min-h-[96px] py-1">
          <HouseCanvas sheets={sheets} look={look} scale={previewScale} onCell={readOnly ? undefined : clickCell} />
        </div>
        <p className="text-[10px] text-gray-500 text-center">{look.w}×{rows} Kacheln{readOnly ? "" : " · obere Wandreihe klicken = Fenster, untere = Tür"}</p>
      </div>

      {showName && (
        <label className="block">Name
          <input value={look.name} maxLength={LIMITS.nameLen} disabled={readOnly} onChange={(e) => onChange({ name: e.target.value })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white" />
        </label>
      )}

      {!readOnly && (
        <div className="space-y-1">
          <p className={SECTION}>Vorlage</p>
          <div className="grid grid-cols-3 gap-1">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyPreset(p)} title={`${p.label} übernehmen`} className={`rounded-md border p-1 bg-[#1b2a3d] ${sameLook(p) ? "border-amber-400 ring-1 ring-amber-400" : "border-white/10 hover:border-white/30"}`}>
                <HouseCanvas sheets={sheets} look={p.look} height={44} />
                <span className="block text-[10px] text-gray-300 text-center mt-0.5">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stepper label="Breite" value={look.w} min={MIN_W} max={MAX_W} disabled={readOnly} onChange={setWidth} />
        <div>
          <span className="block">Dachhöhe</span>
          <div className="mt-0.5 flex rounded border border-white/10 overflow-hidden" role="group" aria-label="Dachhöhe">
            {ROOF_HEIGHTS.map((h) => (
              <button key={h.v} type="button" disabled={readOnly} onClick={() => onChange({ roofRows: h.v })} className={`flex-1 py-1 text-[10px] ${look.roofRows === h.v ? "bg-amber-400/15 text-amber-200" : "bg-zinc-900 text-gray-400 hover:text-white"}`}>{h.label}</button>
            ))}
          </div>
        </div>
      </div>

      <BlockPicker label="Dach" sheets={sheets} rows={[0, 2]} value={look.roof} onPick={(roof) => onChange({ roof })} disabled={readOnly} />
      <BlockPicker label="Wand" sheets={sheets} rows={[1, 3]} value={look.wall} onPick={(wall) => onChange({ wall })} disabled={readOnly} />

      <div>
        <span className="block">Schild an der Tür</span>
        <div className="mt-0.5 grid grid-cols-4 gap-1">
          {SIGNS.map((s) => (
            <button key={s.v} type="button" disabled={readOnly} onClick={() => onChange({ sign: (s.v || undefined) as Building["sign"] })} className={`rounded border py-1 text-[10px] ${(look.sign ?? "") === s.v ? "border-amber-400 text-amber-200 bg-amber-400/10" : "border-white/10 text-gray-400 hover:border-white/30"}`}>{s.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
