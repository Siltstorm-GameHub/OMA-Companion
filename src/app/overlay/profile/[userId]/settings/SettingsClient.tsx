"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Tv2, Check, Repeat, Move, Sparkles, TrendingUp, CalendarClock, Gamepad2, Award } from "lucide-react";
import { toast } from "sonner";
import PositionCanvas, { type CanvasElementOption, type Pos } from "@/app/overlay/PositionCanvas";
import {
  PROFILE_ELEMENT_SIZE, PROFILE_STACKABLE, type ProfileElementKey,
} from "../ProfileOverlayClient";

type ElementOption = CanvasElementOption<ProfileElementKey>;

/** Ausgangspositionen (Prozent von 1920×1080). Deutlich weniger Elemente als beim
 *  Event-Overlay, entsprechend großzügiger verteilt. */
const DEFAULT_POSITIONS: Record<ProfileElementKey, Pos> = {
  brand:     { x: 1.5, y: 90.6 },
  rank:      { x: 66,  y: 2.6 },
  nextEvent: { x: 66,  y: 2.6 },
  favorites: { x: 5,   y: 40 },
  badges:    { x: 5,   y: 63 },
};

export default function SettingsClient({
  userId, displayName, token, hasFavorites, hasBadges,
}: { userId: string; displayName: string; token: string; hasFavorites: boolean; hasBadges: boolean }) {
  const elementOptions = useMemo<ElementOption[]>(() => [
    { key: "brand",     label: "OMA-Logo & Ich",         icon: Sparkles,      fixed: true },
    { key: "rank",      label: "Rang",                    icon: TrendingUp },
    { key: "nextEvent", label: "Nächstes Event",           icon: CalendarClock },
    ...(hasFavorites ? [{ key: "favorites" as const, label: "Lieblingsspiele", icon: Gamepad2 }] : []),
    ...(hasBadges ? [{ key: "badges" as const, label: "Abzeichen", icon: Award }] : []),
  ], [hasFavorites, hasBadges]);

  const [enabled, setEnabled] = useState<Set<ProfileElementKey>>(new Set(elementOptions.map(o => o.key)));
  const [rotateSeconds, setRotateSeconds] = useState(14);
  const [positions, setPositions] = useState<Record<ProfileElementKey, Pos>>(DEFAULT_POSITIONS);
  const [copied, setCopied] = useState(false);

  const activeElements = useMemo(() => elementOptions.filter(o => enabled.has(o.key)).map(o => o.key), [elementOptions, enabled]);

  const hasAnyStack = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const key of activeElements) {
      if (!PROFILE_STACKABLE.includes(key)) continue;
      const p = positions[key];
      const posKey = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      buckets.set(posKey, (buckets.get(posKey) ?? 0) + 1);
    }
    return [...buckets.values()].some(n => n > 1);
  }, [activeElements, positions]);

  const overlayUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({ token });
    if (rotateSeconds !== 14) params.set("rotate", String(rotateSeconds));
    const layout = activeElements.map(key => `${key}:${positions[key].x.toFixed(1)},${positions[key].y.toFixed(1)}`).join(";");
    if (layout) params.set("layout", layout);
    return `${origin}/overlay/profile/${userId}?${params.toString()}`;
  }, [userId, token, rotateSeconds, activeElements, positions]);

  function toggle(key: ProfileElementKey) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
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
          <h1 className="text-lg font-semibold text-white">Persönliches Overlay</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">{displayName}</p>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Elemente
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Jedes Element lässt sich einzeln aus- und wieder einblenden und unten frei
            positionieren. Zieh mehrere aufeinander, damit sie sich zu einer Stelle stapeln und
            automatisch durchrotieren — &quot;OMA-Logo &amp; Ich&quot; bleibt immer allein und fix.
          </p>
          <div className="flex flex-wrap gap-2">
            {elementOptions.map(({ key, label, icon: Icon }) => {
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
        </div>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" /> Position
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Zieh jedes aktive Element dahin, wo es auf deinem Bildschirm frei ist — die
            Vorschau entspricht 1920×1080.
          </p>
          <PositionCanvas
            options={elementOptions}
            elementSize={PROFILE_ELEMENT_SIZE}
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
