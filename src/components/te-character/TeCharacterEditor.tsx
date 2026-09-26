"use client";

// ============================================
// Time-Elements-Figur — Editor (Prototyp): Live-Vorschau, Hautton, Teile + Farbvarianten
// ============================================
// Kontrolliertes Bauteil: der Aufrufer hält den Zustand und speichert.

import { useState } from "react";
import { Dices } from "@/components/icons";
import TeCharacter from "./TeCharacter";
import { weaponItemId } from "@/lib/te-character/class-weapons";
import {
  TE_ANIMS, TE_CATALOG, TE_FRAME, randomTeConfig,
  type TeAnim, type TeCategory, type TeCharacterConfig, type TeDir, type TeItem,
} from "@/lib/te-character";

interface Props {
  value: TeCharacterConfig;
  onChange: (next: TeCharacterConfig) => void;
  /** Ohne eigene Vorschau (die Figur wird woanders gezeigt, z.B. in der Karte): nur Hautton, Zufall und Teile. */
  compact?: boolean;
  /** Erlaubte Waffen (Item-Kennungen) der Klasse; null/leer = alle. Die aktuell getragene Waffe bleibt auch dann wählbar. */
  allowedWeapons?: string[] | null;
  /** Freischalt-Zustand gesperrter Teile (Schlüssel „Ebene:Teil“); fehlt = alles frei */
  itemStates?: Record<string, { ok: boolean; hint: string }>;
  /** Antippen eines gesperrten Teils (z. B. kaufen) */
  onLockedPick?: (key: string) => void;
}

const ANIM_OPTIONS: { id: TeAnim; label: string }[] = [
  { id: "idle", label: "Stehen" },
  { id: "walk", label: "Laufen" },
  { id: "attack", label: "Angriff" },
  { id: "bow", label: "Bogen" },
  { id: "cast", label: "Zauber" },
  { id: "crouch", label: "Ducken" },
  { id: "block", label: "Abwehr" },
  { id: "jump", label: "Springen" },
  { id: "ko", label: "K.O." },
];

const DIRS: { id: TeDir; label: string }[] = [
  { id: "up", label: "↑" },
  { id: "left", label: "←" },
  { id: "down", label: "↓" },
  { id: "right", label: "→" },
];

/** Ausschnitt der 48×48-Bilder je Kategorie: Kopfteile winzig → eng auf den Kopf, Rest auf den ganzen Körper. */
const HEAD_CATS = new Set(["hair", "backhair", "hat", "head"]);
const HEAD_RECT = { x: 12, y: 2, w: 24, h: 24 };
const BODY_RECT = { x: 8, y: 4, w: 32, h: 32 };

/** Ein Sheet-Bild (Blick nach Süden, Standbild) als Miniatur — direkt aus dem Sheet als Hintergrund. */
function Thumb({ src, size, catId }: { src: string; size: number; catId: string }) {
  const r = HEAD_CATS.has(catId) ? HEAD_RECT : BODY_RECT;
  const k = size / r.w;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: `${TE_FRAME * TE_CATALOG.frames * k}px auto`,
        backgroundPosition: `${-(TE_FRAME * 1 + r.x) * k}px ${-r.y * k}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function sheetSrc(cat: TeCategory, variant: string, item: TeItem, skin: number) {
  return `/te/char/${cat.id}/${variant}${item.skin && skin > 0 ? `.t${skin}` : ""}.png`;
}

export default function TeCharacterEditor({ value, onChange, compact = false, allowedWeapons, itemStates, onLockedPick }: Props) {
  const [catId, setCatId] = useState(TE_CATALOG.categories.find((c) => c.id === "hair")?.id ?? TE_CATALOG.categories[0].id);
  const [anim, setAnim] = useState<TeAnim>("walk");
  const [dir, setDir] = useState<TeDir>("down");
  const [replay, setReplay] = useState(0);

  const cat = TE_CATALOG.categories.find((c) => c.id === catId)!;
  const selected = value.layers[cat.id];
  const selectedItem = cat.items.find((i) => i.variants.includes(selected ?? ""));

  function choose(variant: string | null) {
    const layers = { ...value.layers };
    if (variant) layers[cat.id] = variant;
    else delete layers[cat.id];
    onChange({ ...value, layers });
  }

  return (
    <div className={compact ? "space-y-4" : "grid gap-4 md:grid-cols-[260px_1fr]"}>
      {/* ── Vorschau ─────────────────────────────────────────────── */}
      <div className={compact ? "flex flex-wrap items-end justify-between gap-4" : "space-y-3 md:sticky md:top-4 self-start"}>
        {!compact && (<>
        <div className="flex justify-center rounded-xl bg-[#141a28] py-2">
          <TeCharacter config={value} anim={anim} dir={dir} scale={5} replayKey={replay} title="Vorschau" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <select
            value={anim}
            onChange={(e) => { setAnim(e.target.value as TeAnim); setReplay((n) => n + 1); }}
            aria-label="Animation"
            className="rounded-lg bg-black/30 text-[11px] font-semibold text-gray-200 px-2 py-1.5 outline-none border border-white/10 focus:border-violet-500"
          >
            {ANIM_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          {!TE_ANIMS[anim].loop && (
            <button type="button" onClick={() => setReplay((n) => n + 1)} className="text-[11px] text-violet-300 hover:text-violet-200">
              Nochmal
            </button>
          )}
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

        </>)}

        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Hautton</p>
          <div className="flex gap-1.5" role="group" aria-label="Hautton">
            {TE_CATALOG.skinTones.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...value, skin: i })}
                aria-pressed={value.skin === i}
                aria-label={`Hautton ${i + 1}`}
                className={`w-7 h-7 rounded-full border-2 transition-colors ${value.skin === i ? "border-violet-400" : "border-white/15"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const r = randomTeConfig();
            const layers = { ...r.layers };
            const w = weaponItemId(r);
            if (allowedWeapons && w && !allowedWeapons.includes(w)) delete layers.weapon;
            // Gesperrte Teile bleiben bei „Zufällige Figur“ außen vor
            for (const c of TE_CATALOG.categories) { const it = c.items.find((i) => i.variants.includes(layers[c.id] ?? "")); const st = it ? itemStates?.[`${c.id}:${it.id}`] : undefined; if (st && !st.ok) delete layers[c.id]; }
            onChange({ ...r, layers, pose: value.pose, bg: value.bg, night: value.night });
          }}
          className={`${compact ? "" : "w-full "}flex items-center justify-center gap-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white text-xs font-semibold px-3 py-2 transition-colors`}
        >
          <Dices className="w-4 h-4" /> Zufällige Figur
        </button>
      </div>

      {/* ── Auswahl ──────────────────────────────────────────────── */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Kategorie">
          {TE_CATALOG.categories.map((c) => (
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

        {selectedItem && selectedItem.variants.length > 1 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Farbe</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedItem.variants.map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => choose(v)}
                  aria-pressed={selected === v}
                  aria-label={`Farbvariante ${i + 1}`}
                  className={`rounded-lg border p-0.5 transition-colors ${selected === v ? "border-violet-400 bg-violet-500/15" : "border-white/10 bg-[#141a28] hover:border-white/30"}`}
                >
                  <Thumb src={sheetSrc(cat, v, selectedItem, value.skin)} size={44} catId={cat.id} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2">
          {cat.optional && (
            <button
              type="button"
              onClick={() => choose(null)}
              aria-pressed={!selected}
              className={`h-[76px] rounded-xl border text-[11px] font-semibold transition-colors ${
                !selected ? "border-violet-500 bg-violet-500/15 text-white" : "border-white/10 bg-black/20 text-gray-500 hover:text-white"
              }`}
            >
              Keine
            </button>
          )}
          {cat.items.filter((item) => cat.id !== "weapon" || !allowedWeapons || allowedWeapons.includes(item.id) || item.id === selectedItem?.id).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { const st = itemStates?.[`${cat.id}:${item.id}`]; if (st && !st.ok) onLockedPick?.(`${cat.id}:${item.id}`); else choose(item.variants.includes(selected ?? "") ? selected : item.variants[0]); }}
              aria-pressed={selectedItem?.id === item.id}
              title={itemStates?.[`${cat.id}:${item.id}`] && !itemStates[`${cat.id}:${item.id}`].ok ? `${item.label} — ${itemStates[`${cat.id}:${item.id}`].hint}` : item.label}
              className={`h-[76px] rounded-xl border flex flex-col items-center justify-between py-1 transition-colors ${
                selectedItem?.id === item.id ? "border-violet-500 bg-violet-500/15" : "border-white/10 bg-[#141a28] hover:border-white/30"
              }`}
            >
              <span className={itemStates?.[`${cat.id}:${item.id}`] && !itemStates[`${cat.id}:${item.id}`].ok ? "opacity-40" : ""}><Thumb src={sheetSrc(cat, item.variants[0], item, value.skin)} size={52} catId={cat.id} /></span>
              <span className="text-[9px] text-gray-400 truncate max-w-full px-1 leading-none pb-0.5">{itemStates?.[`${cat.id}:${item.id}`] && !itemStates[`${cat.id}:${item.id}`].ok ? `🔒 ${itemStates[`${cat.id}:${item.id}`].hint}` : item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
