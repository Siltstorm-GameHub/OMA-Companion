"use client";
// OMA Blocks — Einstellungen (Steuerungs-Timing, Ghost, Touch-Buttons/Gesten) + Tastenübersicht

import { HANDLING_LIMITS, SDF_INSTANT, FPS } from "@/lib/blocks/engine";
import { ACTION_LABELS, DEFAULT_KEYS, type Action, type BlocksSettings } from "./settings";

const KEY_NAMES: Record<string, string> = {
  ArrowLeft: "←", ArrowRight: "→", ArrowDown: "↓", ArrowUp: "↑", Space: "Leertaste",
  ControlLeft: "Strg", ShiftLeft: "Shift",
};
function keyName(code: string): string {
  return KEY_NAMES[code] ?? code.replace(/^Key/, "");
}

function Slider({
  label, hint, value, min, max, onChange, format,
}: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-xs">
        <span className="font-semibold text-white">{label}</span>
        <span className="tabular-nums text-teal-300">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-teal-400" />
      <span className="block text-[11px] text-gray-500">{hint}</span>
    </label>
  );
}

export default function SettingsPanel({ settings, onChange }: { settings: BlocksSettings; onChange: (s: BlocksSettings) => void }) {
  const h = settings.handling;
  const ms = (frames: number) => `${Math.round((frames * 1000) / FPS)} ms`;
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Slider
          label="DAS" hint="Verzögerung, bis gehaltenes Links/Rechts automatisch weiterläuft."
          value={h.das} min={HANDLING_LIMITS.das.min} max={HANDLING_LIMITS.das.max} format={ms}
          onChange={(das) => onChange({ ...settings, handling: { ...h, das } })}
        />
        <Slider
          label="ARR" hint="Tempo der automatischen Wiederholung (0 = sofort bis zur Wand)."
          value={h.arr} min={HANDLING_LIMITS.arr.min} max={HANDLING_LIMITS.arr.max} format={(v) => (v === 0 ? "sofort" : ms(v))}
          onChange={(arr) => onChange({ ...settings, handling: { ...h, arr } })}
        />
        <Slider
          label="Soft Drop" hint="Wie schnell ↓ das Teil fallen lässt (Vielfaches der Fallgeschwindigkeit)."
          value={h.sdf} min={HANDLING_LIMITS.sdf.min} max={HANDLING_LIMITS.sdf.max} format={(v) => (v >= SDF_INSTANT ? "sofort" : `${v}×`)}
          onChange={(sdf) => onChange({ ...settings, handling: { ...h, sdf } })}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 text-white">
          <input type="checkbox" checked={settings.ghost} onChange={(e) => onChange({ ...settings, ghost: e.target.checked })} className="accent-teal-400" />
          Landeposition anzeigen
        </label>
        <label className="flex items-center gap-2 text-white">
          Touch-Buttons
          <select
            value={settings.touchControls}
            onChange={(e) => onChange({ ...settings, touchControls: e.target.value as BlocksSettings["touchControls"] })}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
          >
            <option value="auto">automatisch</option>
            <option value="on">immer</option>
            <option value="off">nie</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-white">
          <input type="checkbox" checked={settings.gestures} onChange={(e) => onChange({ ...settings, gestures: e.target.checked })} className="accent-teal-400" />
          Wischgesten
        </label>
        <label className="flex items-center gap-2 text-white">
          <input type="checkbox" checked={settings.haptics} onChange={(e) => onChange({ ...settings, haptics: e.target.checked })} className="accent-teal-400" />
          Vibration
        </label>
      </div>

      {settings.gestures && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Gesten (Touch)</p>
          <div className="mb-3">
            <Slider
              label="Wisch-Empfindlichkeit" hint="Höher = kürzere Wege pro Zelle und schon leichte Wischer lösen Hard Drop / Hold aus."
              value={settings.gestureSensitivity} min={1} max={5}
              format={(v) => ["sehr träge", "träge", "normal", "empfindlich", "sehr empfindlich"][v - 1] ?? String(v)}
              onChange={(gestureSensitivity) => onChange({ ...settings, gestureSensitivity })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {[
              ["Ziehen links/rechts", "Teil verschieben"],
              ["Tippen links / rechts", "Drehen ↺ / ↻"],
              ["Nach unten ziehen", "Soft Drop"],
              ["Nach unten wischen", "Hard Drop"],
              ["Nach oben wischen", "Hold"],
              ["Tippen auf Hold-Box", "Hold"],
            ].map(([g, a]) => (
              <div key={g} className="flex justify-between gap-2">
                <span className="text-gray-400">{g}</span>
                <span className="text-white font-semibold">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Tasten</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
          {(Object.keys(DEFAULT_KEYS) as Action[]).map((a) => (
            <div key={a} className="flex justify-between gap-2">
              <span className="text-gray-400">{ACTION_LABELS[a]}</span>
              <span className="text-white font-semibold">{DEFAULT_KEYS[a].map(keyName).join(" / ")}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2"><span className="text-gray-400">Pause</span><span className="text-white font-semibold">Esc / P</span></div>
          <div className="flex justify-between gap-2"><span className="text-gray-400">Neustart</span><span className="text-white font-semibold">R</span></div>
        </div>
      </div>
    </div>
  );
}
