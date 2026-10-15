"use client";

import { useState } from "react";
import { Move, Repeat, Maximize2, Timer } from "@/components/icons";
import PositionCanvas, { type CanvasElementOption, type Pos } from "./PositionCanvas";
import { SCALE_STEPS, snapScale, type LayoutEntry, type OverlayLayout } from "./types";
import HelpTip from "./HelpTip";

export type EditorElementOption<K extends string> = CanvasElementOption<K> & {
  /** Kurzer Hinweis unter dem Schalter, z.B. "nur bei K.-o.-Turnieren". */
  hint?: string;
};

const DEFAULT_CYCLE = { onSec: 10, offSec: 6 };

/**
 * Editor für ein Overlay-Layout (Event- oder Profil-Modus): Elemente an/aus, Größe,
 * Sichtbarkeits-Zyklus, Rotationstakt und Position per Drag & Drop. Kontrolliert — der Wert ist
 * genau das, was gespeichert und im Overlay gerendert wird (aktive Elemente = Schlüssel in
 * `value.elements`).
 */
export default function LayoutEditor<K extends string>({
  options, stackable, elementSize, defaultPositions, value, onChange, stacking = true, preview,
}: {
  options: EditorElementOption<K>[];
  stackable: readonly K[];
  elementSize: Record<K, { width: number; height: number }>;
  defaultPositions: Record<K, { x: number; y: number }>;
  value: OverlayLayout<K>;
  onChange: (next: OverlayLayout<K>) => void;
  /** false = kein Stapeln/Rotieren (Vollbild-Szenen wie Pause und Clips). */
  stacking?: boolean;
  /** Echte Overlay-Vorschau hinter den Kästchen (URL der Vorschau-Seite) plus Bedienelemente darüber. */
  preview?: { src: string; controls?: React.ReactNode };
}) {
  // Zeitsteuerung und Rotationstakt sind Feinheiten — für Einsteiger erst auf Wunsch sichtbar.
  const [showMore, setShowMore] = useState(() => Object.values(value.elements).some(e => (e as LayoutEntry | undefined)?.cycle));
  // Position ausgeschalteter Elemente merken, damit Aus-/Einschalten sie nicht zurücksetzt.
  const [parked, setParked] = useState<Partial<Record<K, LayoutEntry>>>({});

  const activeElements = options.map(o => o.key).filter(key => value.elements[key]);
  const positions = Object.fromEntries(
    options.map(o => [o.key, value.elements[o.key] ?? parked[o.key] ?? defaultPositions[o.key]]),
  ) as Record<K, Pos>;

  const hasAnyStack = (() => {
    const buckets = new Map<string, number>();
    for (const key of activeElements) {
      if (!stackable.includes(key)) continue;
      const p = positions[key];
      const posKey = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      buckets.set(posKey, (buckets.get(posKey) ?? 0) + 1);
    }
    return [...buckets.values()].some(n => n > 1);
  })();

  function patchEntry(key: K, patch: Partial<LayoutEntry>) {
    const current = value.elements[key];
    if (!current) return;
    onChange({ ...value, elements: { ...value.elements, [key]: { ...current, ...patch } } });
  }

  /** Größe gilt für den ganzen Stapel: alle gestapelten Elemente an derselben Stelle mitziehen. */
  function patchScale(key: K, scale: number) {
    const current = value.elements[key];
    if (!current) return;
    const same = (p: LayoutEntry) => p.x.toFixed(1) === current.x.toFixed(1) && p.y.toFixed(1) === current.y.toFixed(1);
    const elements = { ...value.elements };
    for (const k of activeElements) {
      const e = elements[k];
      if (e && (k === key || (stacking && stackable.includes(k) && stackable.includes(key) && same(e)))) elements[k] = { ...e, scale };
    }
    onChange({ ...value, elements });
  }

  function toggle(key: K) {
    const elements = { ...value.elements };
    if (elements[key]) {
      if (activeElements.length === 1) return; // mindestens ein Element muss aktiv bleiben
      const removed = elements[key];
      setParked(p => ({ ...p, [key]: removed }));
      delete elements[key];
    } else {
      elements[key] = parked[key] ?? { ...defaultPositions[key] };
    }
    onChange({ ...value, elements });
  }

  return (
    <>
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Was soll zu sehen sein?
          <HelpTip text={stacking
            ? "Antippen blendet eine Kachel ein oder aus. Liegen Kacheln unten in der Vorschau übereinander, wechseln sie sich automatisch ab."
            : "Antippen blendet einen Baustein ein oder aus. Position und Größe stellst du darunter ein."} />
        </h2>
        <div className="flex flex-wrap gap-2">
          {options.map(({ key, label, icon: Icon, hint }) => {
            const active = !!value.elements[key];
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                title={hint}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium transition-all ${
                  active
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                    : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {hint && <span className="text-[10px] font-normal opacity-60">· {hint}</span>}
              </button>
            );
          })}
        </div>

        {showMore && stacking && hasAnyStack && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
              <Repeat className="w-3.5 h-3.5" /> Rotation
            </span>
            <span className="text-sm text-gray-400">Übereinanderliegende Kacheln wechseln alle</span>
            <input
              type="number"
              min={4}
              max={60}
              value={value.rotateSeconds}
              onChange={e => onChange({ ...value, rotateSeconds: Math.min(60, Math.max(4, Number(e.target.value) || 14)) })}
              className="input-glass w-16 text-center"
            />
            <span className="text-sm text-gray-400">Sekunden</span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
          {activeElements.map(key => {
            const option = options.find(o => o.key === key)!;
            const entry = value.elements[key]!;
            const scale = entry.scale ?? 1;
            return (
              <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5 text-gray-300 font-medium w-48 shrink-0">
                  <option.icon className="w-3.5 h-3.5 text-gray-500" /> {option.label}
                </span>
                <span className="flex items-center gap-2 text-gray-500">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                    {SCALE_STEPS.map(step => (
                      <button
                        key={step.value}
                        type="button"
                        title={step.title}
                        onClick={() => patchScale(key, step.value)}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                          snapScale(scale) === step.value ? "bg-teal-500/20 text-teal-200" : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </span>
                </span>
                {showMore && <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!entry.cycle}
                    onChange={e => patchEntry(key, { cycle: e.target.checked ? { ...DEFAULT_CYCLE } : undefined })}
                    className="accent-teal-400"
                  />
                  <Timer className="w-3.5 h-3.5" /> Nur zeitweise zeigen
                </label>}
                {showMore && entry.cycle && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <input
                      type="number" min={2} max={300} value={entry.cycle.onSec}
                      onChange={e => patchEntry(key, { cycle: { ...entry.cycle!, onSec: Math.min(300, Math.max(2, Number(e.target.value) || 10)) } })}
                      className="input-glass w-14 text-center"
                    />
                    <span className="text-xs">s sichtbar,</span>
                    <input
                      type="number" min={2} max={300} value={entry.cycle.offSec}
                      onChange={e => patchEntry(key, { cycle: { ...entry.cycle!, offSec: Math.min(300, Math.max(2, Number(e.target.value) || 6)) } })}
                      className="input-glass w-14 text-center"
                    />
                    <span className="text-xs">s ausgeblendet</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="mt-3 text-xs text-gray-500 hover:text-teal-300"
        >
          {showMore ? "Weniger Optionen" : "Mehr Optionen (nur zeitweise zeigen, Wechseltakt)"}
        </button>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" /> Wo soll es stehen?
            <HelpTip text={stacking
              ? "Kästchen mit der Maus oder dem Finger verschieben. Sie rasten am Raster, am Bildschirmrand und an anderen Kacheln ein. Legst du eine Kachel auf eine andere, wechseln sich beide ab."
              : "Kästchen mit der Maus oder dem Finger verschieben. Sie rasten am Raster, am Bildschirmrand und aneinander ein."} />
          </h2>
          {preview?.controls}
        </div>
        <PositionCanvas
          previewSrc={preview?.src}
          options={options}
          elementSize={elementSize}
          activeElements={activeElements}
          positions={positions}
          onChange={(key, pos) => patchEntry(key, { x: pos.x, y: pos.y, ...(pos.scale !== undefined ? { scale: pos.scale } : {}) })}
          stacking={stacking}
        />
      </div>
    </>
  );
}
