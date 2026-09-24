"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "@/components/icons";
import SeriesIcon from "@/components/SeriesIcon";
import { PICTO_CATEGORIES, PICTO_COLORS, PICTO_DEFAULT_COLOR, pictoSrc } from "@/lib/picto-icons";
import { decodeSeriesIcon, encodeSeriesIcon } from "@/lib/series-icons";

/**
 * Auswahl für Reihen- und Squad-Icons: ein Feld mit Vorschau, das ein Fenster
 * mit Suche, Kategorien, Icon-Raster und Farbpalette öffnet. `value` und
 * `onChange` nutzen das gespeicherte Format ("pi:<id>:<#hex>", "" = kein Icon).
 */
export default function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const decoded = decodeSeriesIcon(value);
  const currentId = decoded?.id ?? "";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(PICTO_CATEGORIES[0].name);
  // Farbe, solange noch kein Icon gewählt ist: sie wird beim ersten Icon übernommen
  const [pendingColor, setPendingColor] = useState(PICTO_DEFAULT_COLOR);
  const color = decoded?.color ?? pendingColor;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (q) return PICTO_CATEGORIES.flatMap(c => c.icons).filter(i => `${i.label} ${i.keywords}`.toLowerCase().includes(q));
    return PICTO_CATEGORIES.find(c => c.name === cat)?.icons ?? [];
  }, [q, cat]);

  const pickIcon = (id: string) => onChange(encodeSeriesIcon(id, color));
  const pickColor = (c: string) => {
    setPendingColor(c);
    if (currentId) onChange(encodeSeriesIcon(currentId, c));
  };

  return (
    <div ref={rootRef}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-white/25 px-3 py-2 transition-colors">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: `${color}1f`, border: `1px solid ${color}55` }}>
          {currentId ? <SeriesIcon name={value} className="w-5 h-5" /> : <span className="text-gray-300 text-lg leading-none">+</span>}
        </span>
        <span className="text-sm text-gray-300">{currentId ? "Icon ändern" : "Icon wählen"}</span>
      </button>

      {open && (
        <div className="mt-2 w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#12181b] p-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen, z. B. Schwert, Pokal, Feuer…"
              className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] pl-9 pr-8 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/50" />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!q && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {PICTO_CATEGORIES.map(c => (
                <button key={c.name} type="button" onClick={() => setCat(c.name)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    cat === c.name ? "border-teal-500/50 bg-teal-500/10 text-teal-300" : "border-white/10 text-gray-500 hover:text-gray-300"
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="h-56 overflow-y-auto pr-1">
            {shown.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-10">Kein Icon gefunden.</p>
            ) : (
              <div className="grid grid-cols-6 gap-1.5">
                {shown.map(i => {
                  const selected = currentId === i.id;
                  const src = `url(${pictoSrc(i.id)})`;
                  return (
                    <button key={i.id} type="button" title={i.label} onClick={() => pickIcon(i.id)}
                      className="aspect-square flex items-center justify-center rounded-lg border transition-all"
                      style={selected
                        ? { borderColor: `${color}99`, background: `${color}1f` }
                        : { borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                      <span className="w-6 h-6 block" style={{
                        backgroundColor: selected ? color : "#9ca3af",
                        WebkitMaskImage: src, maskImage: src,
                        WebkitMaskSize: "contain", maskSize: "contain",
                        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center", maskPosition: "center",
                      }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {PICTO_COLORS.map(c => (
              <button key={c.value} type="button" title={c.label} onClick={() => pickColor(c.value)}
                className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110"
                style={{ background: c.value, borderColor: color === c.value ? "#fff" : "transparent" }}>
                {color === c.value && <Check className="w-3 h-3 text-black/70" />}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { onChange(""); setPendingColor(PICTO_DEFAULT_COLOR); }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Icon entfernen
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors">
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
