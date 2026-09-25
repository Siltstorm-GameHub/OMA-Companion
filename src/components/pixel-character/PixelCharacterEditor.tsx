"use client";

// ============================================
// Pixel-Charakter-Editor — Live-Vorschau + Teile-Auswahl je Kategorie
// ============================================
// Kontrolliertes Bauteil: der Aufrufer (MyCardEditor) hält den Zustand und speichert.

import { useState } from "react";
import { Dices } from "@/components/icons";
import PixelCharacter from "./PixelCharacter";
import {
  CATALOG, FOCUS_RECT, FRAME,
  type CatalogCategory, type CatalogItem, type PixelAnim, type PixelCharacterConfig, type PixelDir,
} from "@/lib/pixel-character";

interface Props {
  value: PixelCharacterConfig;
  onChange: (next: PixelCharacterConfig) => void;
}

const HEAD_CATEGORIES = new Set(["head", "hair", "beard"]);
const HEAD_THUMB_RECT = { x: 19, y: 20, w: 26, h: 26 };
/** Diese Ebenen bleiben beim Zufall meist leer, sonst trägt jede Figur Rüstung + Umhang + Bogen. */
const RARE_CATEGORIES = new Set(["weapon", "offhand", "bow", "staff", "cape", "overall", "chest", "skirt", "beard", "hands"]);

const DIRS: { id: PixelDir; label: string }[] = [
  { id: "up", label: "↑" },
  { id: "left", label: "←" },
  { id: "down", label: "↓" },
  { id: "right", label: "→" },
];

/** Miniatur eines einzelnen Teils: erster Frame (blickt nach vorn) direkt aus dem Sheet als Hintergrundbild. */
function Thumb({ cat, item, size }: { cat: CatalogCategory; item: CatalogItem; size: number }) {
  const part = item.parts.includes("m") ? "m" : item.parts.includes("f") ? "f" : item.parts[0];
  // Kopf-Teile sind winzig — dafür enger auf den Kopf zoomen als auf die ganze Figur.
  const rect = HEAD_CATEGORIES.has(cat.id) ? HEAD_THUMB_RECT : FOCUS_RECT;
  const k = size / rect.w;
  const sheetW = FRAME * CATALOG.frames.idle * k;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: `url(/pixel-character/${cat.id}/${item.id}/${part}-idle.png)`,
        backgroundSize: `${sheetW}px auto`,
        backgroundPosition: `${-rect.x * k}px ${-rect.y * k}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

export function randomPixelConfig(): PixelCharacterConfig {
  const layers: Record<string, string> = {};
  for (const c of CATALOG.categories) {
    if (!c.items.length) continue;
    const skipChance = !c.optional ? 0 : RARE_CATEGORIES.has(c.id) ? 0.75 : 0.3;
    if (Math.random() < skipChance) continue;
    layers[c.id] = c.items[Math.floor(Math.random() * c.items.length)].id;
  }
  return { v: 1, layers };
}

export default function PixelCharacterEditor({ value, onChange }: Props) {
  const [catId, setCatId] = useState(CATALOG.categories[0].id);
  const [anim, setAnim] = useState<PixelAnim>("idle");
  const [dir, setDir] = useState<PixelDir>("down");

  const cat = CATALOG.categories.find((c) => c.id === catId)!;
  const selected = value.layers[cat.id];

  function choose(id: string | null) {
    const layers = { ...value.layers };
    if (id) layers[cat.id] = id;
    else delete layers[cat.id];
    onChange({ v: 1, layers });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* ── Vorschau ─────────────────────────────────────────────── */}
      <div className="space-y-3 md:sticky md:top-4 self-start">
        <div className="flex justify-center rounded-xl bg-[#141a28] py-3">
          <PixelCharacter config={value} anim={anim} dir={dir} scale={5} mode="focus" title="Vorschau" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-lg bg-black/30 p-0.5" role="group" aria-label="Animation">
            {(["idle", "move"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAnim(a)}
                aria-pressed={anim === a}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${anim === a ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {a === "idle" ? "Stehen" : "Laufen"}
              </button>
            ))}
          </div>
          <div className="flex gap-1" role="group" aria-label="Blickrichtung">
            {DIRS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDir(d.id)}
                aria-pressed={dir === d.id}
                aria-label={`Blick ${d.id}`}
                className={`w-7 h-7 rounded-md text-sm transition-colors ${dir === d.id ? "bg-violet-600 text-white" : "bg-black/30 text-gray-400 hover:text-white"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(randomPixelConfig())}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white text-xs font-semibold py-2 transition-colors"
        >
          <Dices className="w-4 h-4" /> Zufällige Figur
        </button>
      </div>

      {/* ── Auswahl ──────────────────────────────────────────────── */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Kategorie">
          {CATALOG.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === catId}
              onClick={() => setCatId(c.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                c.id === catId ? "bg-violet-600 text-white" : "bg-black/30 text-gray-400 hover:text-white"
              }`}
            >
              {c.label}
              {value.layers[c.id] && c.optional ? <span className="ml-1 text-amber-300">•</span> : null}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
          {cat.optional && (
            <button
              type="button"
              onClick={() => choose(null)}
              aria-pressed={!selected}
              className={`h-[84px] rounded-xl border text-[11px] font-semibold transition-colors ${
                !selected ? "border-violet-500 bg-violet-500/15 text-white" : "border-white/10 bg-black/20 text-gray-500 hover:text-white"
              }`}
            >
              Keine
            </button>
          )}
          {cat.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item.id)}
              aria-pressed={selected === item.id}
              title={item.label}
              className={`h-[84px] rounded-xl border flex flex-col items-center justify-between py-1 transition-colors ${
                selected === item.id ? "border-violet-500 bg-violet-500/15" : "border-white/10 bg-[#141a28] hover:border-white/30"
              }`}
            >
              <Thumb cat={cat} item={item} size={60} />
              <span className="text-[9px] text-gray-400 truncate max-w-full px-1 leading-none pb-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
