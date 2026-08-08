"use client";

import { useMemo, useState } from "react";
import {
  Copy, ExternalLink, Tv2, Check, LayoutGrid, Table2, Users, Repeat, Swords, Sparkles, Move, Gamepad2, Award, Maximize2, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { ELEMENT_SIZE, STACKABLE_ELEMENTS, type ElementKey } from "../OverlayClient";
import PositionCanvas, { type CanvasElementOption, type Pos } from "../../PositionCanvas";

type ElementOption = CanvasElementOption<ElementKey> & { forFormats: string[] | null };

const ELEMENT_OPTIONS: ElementOption[] = [
  { key: "brand",        label: "OMA-Logo & Streamer",         icon: Sparkles,   forFormats: null, fixed: true },
  { key: "liveinfo",     label: "Live / Event / Spiel",         icon: Tv2,        forFormats: null },
  { key: "ticker",       label: "Aktuelles Match",              icon: Swords,     forFormats: null },
  { key: "bracket",      label: "Turnierbaum",                  icon: LayoutGrid, forFormats: ["single_elimination", "double_elimination"] },
  { key: "table",        label: "Tabelle",                      icon: Table2,     forFormats: ["liga", "round_robin", "ffa", "coop_stats", "avg_stats"] },
  { key: "participants", label: "Teilnehmer",                   icon: Users,      forFormats: null },
  { key: "favorites",    label: "Lieblingsspiele",               icon: Gamepad2,   forFormats: null },
  { key: "badges",       label: "Abzeichen",                     icon: Award,      forFormats: null },
];

/** Ausgangspositionen (Prozent von 1920×1080). Turnierbaum/Tabelle/Teilnehmer teilen sich
 *  bewusst dieselbe Standardposition — sie stapeln sich dadurch von Anfang an genau wie im
 *  alten System, ohne dass der Streamer das erst manuell zusammenziehen muss. */
const DEFAULT_POSITIONS: Record<ElementKey, Pos> = {
  brand:        { x: 1.5,  y: 90.6 },
  liveinfo:     { x: 19,   y: 90.6 },
  ticker:       { x: 40,   y: 90.6 },
  bracket:      { x: 66,   y: 2.6 },
  table:        { x: 66,   y: 2.6 },
  participants: { x: 66,   y: 2.6 },
  favorites:    { x: 5,    y: 40 },
  badges:       { x: 5,    y: 63 },
};

export default function SettingsClient({
  eventId, eventTitle, format, token, streamerId, hasFavorites, hasBadges,
}: {
  eventId: string; eventTitle: string; format: string | null; token: string;
  streamerId: string | null; hasFavorites: boolean; hasBadges: boolean;
}) {
  const relevantElements = ELEMENT_OPTIONS.filter(o => {
    if (o.key === "favorites") return hasFavorites;
    if (o.key === "badges") return hasBadges;
    return !o.forFormats || (format && o.forFormats.includes(format));
  });
  const [enabled, setEnabled] = useState<Set<ElementKey>>(new Set(relevantElements.map(o => o.key)));
  const [rotateSeconds, setRotateSeconds] = useState(14);
  const [positions, setPositions] = useState<Record<ElementKey, Pos>>(DEFAULT_POSITIONS);
  const [cycles, setCycles] = useState<Partial<Record<ElementKey, { enabled: boolean; onSec: number; offSec: number }>>>({});
  const [copied, setCopied] = useState(false);

  const activeElements = useMemo(() => relevantElements.filter(o => enabled.has(o.key)).map(o => o.key), [relevantElements, enabled]);

  // Stapel-Vorschau: welche aktiven, stapelbaren Elemente teilen sich (auf 0.1% gerundet)
  // dieselbe Position — genau die Gruppierung, die das Overlay zur Laufzeit auch bildet.
  const stackSizes = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const key of activeElements) {
      if (!STACKABLE_ELEMENTS.includes(key)) continue;
      const p = positions[key];
      const posKey = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      buckets.set(posKey, (buckets.get(posKey) ?? 0) + 1);
    }
    return buckets;
  }, [activeElements, positions]);
  const hasAnyStack = [...stackSizes.values()].some(n => n > 1);

  const overlayUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({ token });
    if (streamerId) params.set("streamer", streamerId);
    if (rotateSeconds !== 14) params.set("rotate", String(rotateSeconds));
    const layout = activeElements.map(key => {
      const p = positions[key];
      const parts = [p.x.toFixed(1), p.y.toFixed(1)];
      if (p.scale && Math.abs(p.scale - 1) > 0.001) parts.push(`s${p.scale.toFixed(2)}`);
      const c = cycles[key];
      if (c?.enabled) parts.push(`c${c.onSec}-${c.offSec}`);
      return `${key}:${parts.join(",")}`;
    }).join(";");
    if (layout) params.set("layout", layout);
    return `${origin}/overlay/${eventId}?${params.toString()}`;
  }, [eventId, token, streamerId, rotateSeconds, activeElements, positions, cycles]);

  function setScale(key: ElementKey, scale: number) {
    setPositions(prev => ({ ...prev, [key]: { ...prev[key], scale } }));
  }
  function setCycle(key: ElementKey, patch: Partial<{ enabled: boolean; onSec: number; offSec: number }>) {
    setCycles(prev => ({
      ...prev,
      [key]: { enabled: false, onSec: 10, offSec: 6, ...prev[key], ...patch },
    }));
  }

  function toggle(key: ElementKey) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // mindestens ein Element muss aktiv bleiben
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.message("Overlay-Link", { description: overlayUrl });
    }
  }

  return (
    <div className="min-h-dvh flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2.5 mb-1">
          <Tv2 className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-white">Overlay-Einstellungen</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">{eventTitle}</p>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Elemente
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Jedes Element lässt sich einzeln aus- und wieder einblenden und unten frei
            positionieren. Zieh mehrere aufeinander, damit sie sich zu einer Stelle stapeln und
            automatisch durchrotieren — &quot;OMA-Logo &amp; Streamer&quot; bleibt immer allein und fix.
          </p>
          <div className="flex flex-wrap gap-2">
            {relevantElements.map(({ key, label, icon: Icon }) => {
              const active = enabled.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium transition-all ${
                    active
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                      : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {hasAnyStack && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
                <Repeat className="w-3.5 h-3.5" /> Rotation
              </span>
              <span className="text-sm text-gray-400">Jedes gestapelte Element sichtbar für</span>
              <input
                type="number"
                min={4}
                max={60}
                value={rotateSeconds}
                onChange={e => setRotateSeconds(Math.min(60, Math.max(4, Number(e.target.value) || 14)))}
                className="input-glass w-16 text-center"
              />
              <span className="text-sm text-gray-400">Sekunden</span>
            </div>
          )}

          {activeElements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
              {activeElements.map(key => {
                const option = relevantElements.find(o => o.key === key)!;
                const scale = positions[key].scale ?? 1;
                const cycle = cycles[key];
                return (
                  <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-300 font-medium w-40 shrink-0">
                      <option.icon className="w-3.5 h-3.5 text-gray-500" /> {option.label}
                    </span>
                    <span className="flex items-center gap-2 text-gray-500">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <input
                        type="range"
                        min={0.6}
                        max={1.6}
                        step={0.05}
                        value={scale}
                        onChange={e => setScale(key, Number(e.target.value))}
                        className="w-28 accent-teal-400"
                      />
                      <span className="text-xs text-gray-400 w-9 tabular-nums">{Math.round(scale * 100)}%</span>
                    </span>
                    <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cycle?.enabled ?? false}
                        onChange={e => setCycle(key, { enabled: e.target.checked })}
                        className="accent-teal-400"
                      />
                      <Timer className="w-3.5 h-3.5" /> Zeitgesteuert
                    </label>
                    {cycle?.enabled && (
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <input
                          type="number" min={2} max={300}
                          value={cycle.onSec}
                          onChange={e => setCycle(key, { onSec: Math.min(300, Math.max(2, Number(e.target.value) || 10)) })}
                          className="input-glass w-14 text-center"
                        />
                        <span className="text-xs">s sichtbar,</span>
                        <input
                          type="number" min={2} max={300}
                          value={cycle.offSec}
                          onChange={e => setCycle(key, { offSec: Math.min(300, Math.max(2, Number(e.target.value) || 6)) })}
                          className="input-glass w-14 text-center"
                        />
                        <span className="text-xs">s ausgeblendet</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" /> Position
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Zieh jedes aktive Element dahin, wo es auf deinem Bildschirm frei ist — die
            Vorschau entspricht 1920×1080. Zwei Elemente übereinander bilden automatisch einen
            Stapel; &quot;OMA-Logo &amp; Streamer&quot; lässt sich nicht mit anderen überlappen.
          </p>
          <PositionCanvas
            options={relevantElements}
            elementSize={ELEMENT_SIZE}
            activeElements={activeElements}
            positions={positions}
            onChange={(key, pos) => setPositions(prev => ({ ...prev, [key]: pos }))}
          />
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            OBS Browser-Source
          </h2>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs text-gray-300 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 overflow-x-auto whitespace-nowrap">
              {overlayUrl}
            </code>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition-all font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Kopiert" : "Kopieren"}
            </button>
          </div>
          <a
            href={overlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-300 transition-colors mb-4"
          >
            <ExternalLink className="w-3 h-3" /> Vorschau in neuem Tab öffnen
          </a>
          <div className="text-xs text-gray-500 leading-relaxed border-t border-white/[0.06] pt-3">
            In OBS: <span className="text-gray-300">Quellen → Hinzufügen → Browser-Quelle</span>, obigen Link
            einfügen, Breite <span className="text-gray-300">1920</span>, Höhe <span className="text-gray-300">1080</span>.
          </div>
        </div>
      </div>
    </div>
  );
}

