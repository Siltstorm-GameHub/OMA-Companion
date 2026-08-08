"use client";

import { useMemo, useRef, useState } from "react";
import {
  Copy, ExternalLink, Tv2, Check, LayoutGrid, Table2, Users, Repeat, Swords, Sparkles, Move, Gamepad2, Award,
} from "lucide-react";
import { toast } from "sonner";
import { ELEMENT_SIZE, STACKABLE_ELEMENTS, type ElementKey } from "../OverlayClient";

type Pos = { x: number; y: number }; // Prozent von 1920×1080, oben links des Elements
type ElementOption = { key: ElementKey; label: string; icon: typeof Swords; forFormats: string[] | null };

const ELEMENT_OPTIONS: ElementOption[] = [
  { key: "brand",        label: "OMA-Logo & Streamer",         icon: Sparkles,   forFormats: null },
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

function pctSize(key: ElementKey): { w: number; h: number } {
  return { w: (ELEMENT_SIZE[key].width / 1920) * 100, h: (ELEMENT_SIZE[key].height / 1080) * 100 };
}

function overlaps(a: Pos, aKey: ElementKey, b: Pos, bKey: ElementKey): boolean {
  const sa = pctSize(aKey);
  const sb = pctSize(bKey);
  return a.x < b.x + sb.w && a.x + sa.w > b.x && a.y < b.y + sb.h && a.y + sa.h > b.y;
}

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
  const [enabled, setEnabled] = useState<Set<ElementKey>>(
    new Set(relevantElements.filter(o => o.key !== "favorites" && o.key !== "badges").map(o => o.key))
  );
  const [rotateSeconds, setRotateSeconds] = useState(14);
  const [positions, setPositions] = useState<Record<ElementKey, Pos>>(DEFAULT_POSITIONS);
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
    const layout = activeElements.map(key => `${key}:${positions[key].x.toFixed(1)},${positions[key].y.toFixed(1)}`).join(";");
    if (layout) params.set("layout", layout);
    return `${origin}/overlay/${eventId}?${params.toString()}`;
  }, [eventId, token, streamerId, rotateSeconds, activeElements, positions]);

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

/** 16:9-Vorschau des OBS-Canvas mit ziehbaren Boxen je aktivem Element.
 *  - "brand" (fix, nie Teil eines Stapels) blockt jede Überlappung — die Box bleibt an der
 *    Kante des anderen Elements stehen.
 *  - Stapelbare Elemente rasten beim Überlappen eines anderen stapelbaren Elements exakt auf
 *    dessen Position ein (das IST die Stapelbildung), bleiben aber ebenfalls von "brand" fern. */
function PositionCanvas({
  activeElements, positions, onChange,
}: { activeElements: ElementKey[]; positions: Record<ElementKey, Pos>; onChange: (key: ElementKey, pos: Pos) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ key: ElementKey; grabDx: number; grabDy: number } | null>(null);
  const [dragging, setDragging] = useState<ElementKey | null>(null);

  function startDrag(key: ElementKey, e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = positions[key];
    const pointerXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerYPct = ((e.clientY - rect.top) / rect.height) * 100;
    dragState.current = { key, grabDx: pointerXPct - pos.x, grabDy: pointerYPct - pos.y };
    setDragging(key);

    const handleMove = (ev: PointerEvent) => {
      const drag = dragState.current;
      const canvasEl = canvasRef.current;
      if (!drag || !canvasEl) return;
      const r = canvasEl.getBoundingClientRect();
      const size = pctSize(drag.key);
      const rawX = ((ev.clientX - r.left) / r.width) * 100 - drag.grabDx;
      const rawY = ((ev.clientY - r.top) / r.height) * 100 - drag.grabDy;
      const candidate: Pos = {
        x: Math.min(100 - size.w, Math.max(0, rawX)),
        y: Math.min(100 - size.h, Math.max(0, rawY)),
      };
      const isStackable = STACKABLE_ELEMENTS.includes(drag.key);
      const others = activeElements.filter(k => k !== drag.key);

      const hitsBrand = drag.key !== "brand" && others.includes("brand") && overlaps(candidate, drag.key, positions.brand, "brand");
      if (hitsBrand) return; // "brand" blockt immer — Bewegung verwerfen

      if (drag.key === "brand") {
        const collides = others.some(k => overlaps(candidate, "brand", positions[k], k));
        if (collides) return;
        onChange("brand", candidate);
        return;
      }

      if (isStackable) {
        const stackPartner = others.find(k => k !== "brand" && STACKABLE_ELEMENTS.includes(k) && overlaps(candidate, drag.key, positions[k], k));
        onChange(drag.key, stackPartner ? positions[stackPartner] : candidate);
      }
    };
    const handleUp = () => {
      dragState.current = null;
      setDragging(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  // Stapel-Mitglieder an derselben Position bekommen einen kleinen Versatz in der Vorschau,
  // sonst läge nur die zuletzt gerenderte Box sichtbar da — im echten Overlay rotieren sie
  // stattdessen durch, hier reicht ein Fächer-Effekt zur Anzeige "hier stapelt sich was".
  const stackOffset = new Map<string, number>();

  return (
    <div
      ref={canvasRef}
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{
        aspectRatio: "16 / 9",
        background: "linear-gradient(135deg, #0d1420 0%, #131a26 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundImage:
          "linear-gradient(rgba(20,184,166,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.06) 1px, transparent 1px)",
        backgroundSize: "5% 5%",
      }}
    >
      {activeElements.map(key => {
        const pos = positions[key];
        const size = pctSize(key);
        const option = ELEMENT_OPTIONS.find(o => o.key === key)!;
        const Icon = option.icon;
        const posKey = `${pos.x.toFixed(1)},${pos.y.toFixed(1)}`;
        const fanIndex = stackOffset.get(posKey) ?? 0;
        stackOffset.set(posKey, fanIndex + 1);
        const isBrand = key === "brand";
        return (
          <div
            key={key}
            onPointerDown={e => startDrag(key, e)}
            className={`absolute flex items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium cursor-grab active:cursor-grabbing transition-shadow ${
              dragging === key
                ? "bg-teal-500/25 border-teal-400/60 text-teal-100 shadow-lg shadow-teal-500/20 z-20"
                : isBrand
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-300 z-10"
                  : "bg-teal-500/10 border-teal-500/30 text-teal-300"
            }`}
            style={{
              left: `calc(${pos.x}% + ${fanIndex * 4}px)`, top: `calc(${pos.y}% + ${fanIndex * 4}px)`,
              width: `${size.w}%`, height: `${size.h}%`,
              zIndex: dragging === key ? 20 : 10 + fanIndex,
              touchAction: "none",
            }}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{option.label}</span>
          </div>
        );
      })}
    </div>
  );
}
