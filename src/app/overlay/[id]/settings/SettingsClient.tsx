"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, Tv2, Check, LayoutGrid, Table2, Users, Repeat, Swords, Sparkles, Move } from "lucide-react";
import { toast } from "sonner";
import { ELEMENT_SIZE, type ElementKey } from "../OverlayClient";

type PanelKey = "bracket" | "table" | "participants";
type PanelOption = { key: PanelKey; label: string; icon: typeof LayoutGrid; forFormats: string[] | null };
type Pos = { x: number; y: number }; // Prozent von 1920×1080, oben links des Elements

const PANEL_OPTIONS: PanelOption[] = [
  { key: "bracket",      label: "Turnierbaum",  icon: LayoutGrid, forFormats: ["single_elimination", "double_elimination"] },
  { key: "table",        label: "Tabelle",       icon: Table2,     forFormats: ["liga", "round_robin", "ffa", "coop_stats", "avg_stats"] },
  { key: "participants", label: "Teilnehmer",    icon: Users,      forFormats: null },
];

const ELEMENT_LABELS: Record<ElementKey, { label: string; icon: typeof Swords }> = {
  ticker: { label: "Aktuelles Match", icon: Swords },
  brand:  { label: "Live/Event/Spiel & Logo", icon: Sparkles },
  panel:  { label: "Turnierbaum/Tabelle/Teilnehmer", icon: LayoutGrid },
};

/** Ausgangspositionen, angelehnt an die alte Standardplatzierung (Brand+Ticker unten links
 *  nebeneinander, Panel oben rechts) — Prozent von 1920×1080. */
const DEFAULT_POSITIONS: Record<ElementKey, Pos> = {
  brand:  { x: 1.5,  y: 90.6 },
  ticker: { x: 18.4, y: 90.6 },
  panel:  { x: 68.4, y: 2.6 },
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
  eventId, eventTitle, format, token,
}: { eventId: string; eventTitle: string; format: string | null; token: string }) {
  const relevantPanels = PANEL_OPTIONS.filter(p => !p.forFormats || (format && p.forFormats.includes(format)));
  const [enabled, setEnabled] = useState<Set<PanelKey>>(new Set(relevantPanels.map(p => p.key)));
  const [rotateSeconds, setRotateSeconds] = useState(14);
  const [showTicker, setShowTicker] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [positions, setPositions] = useState<Record<ElementKey, Pos>>(DEFAULT_POSITIONS);
  const [copied, setCopied] = useState(false);

  const activeElements = useMemo<ElementKey[]>(() => {
    const list: ElementKey[] = [];
    if (showBrand) list.push("brand");
    if (showTicker) list.push("ticker");
    if (enabled.size > 0) list.push("panel");
    return list;
  }, [showBrand, showTicker, enabled.size]);

  const overlayUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({ token });
    if (enabled.size > 0 && enabled.size < relevantPanels.length) {
      params.set("panels", [...enabled].join(","));
    }
    if (rotateSeconds !== 14) params.set("rotate", String(rotateSeconds));
    if (!showTicker) params.set("ticker", "0");
    if (!showBrand) params.set("brand", "0");
    const layout = activeElements.map(key => `${key}:${positions[key].x.toFixed(1)},${positions[key].y.toFixed(1)}`).join(";");
    if (layout) params.set("layout", layout);
    return `${origin}/overlay/${eventId}?${params.toString()}`;
  }, [eventId, token, enabled, relevantPanels.length, rotateSeconds, showTicker, showBrand, activeElements, positions]);

  function toggle(key: PanelKey) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // mindestens ein Panel muss aktiv bleiben
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
            Jedes Element lässt sich einzeln aus- und wieder einblenden. Turnierbaum/Tabelle und
            Teilnehmer rotieren automatisch durch, wenn mehr als eins aktiv ist, damit dein
            Gameplay sichtbar bleibt.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowTicker(v => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium transition-all ${
                showTicker
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                  : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              Aktuelles Match
            </button>
            <button
              onClick={() => setShowBrand(v => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium transition-all ${
                showBrand
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                  : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Live/Event/Spiel &amp; Logo
            </button>
            {relevantPanels.map(({ key, label, icon: Icon }) => {
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
        </div>

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" /> Position
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Zieh jedes aktive Element dahin, wo es auf deinem Bildschirm frei ist — die
            Vorschau entspricht 1920×1080. Elemente lassen sich nicht übereinander ziehen,
            sie stoppen automatisch an der Kante des jeweils anderen.
          </p>
          <PositionCanvas
            activeElements={activeElements}
            positions={positions}
            onChange={(key, pos) => setPositions(prev => ({ ...prev, [key]: pos }))}
          />
        </div>

        {enabled.size > 1 && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" /> Rotation
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Jeder Bereich sichtbar für</span>
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
          </div>
        )}

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

/** 16:9-Vorschau des OBS-Canvas mit ziehbaren Boxen je aktivem Element. Kollisionsvermeidung:
 *  eine Bewegung, die zu einer Überlappung mit einem anderen aktiven Element führen würde,
 *  wird verworfen — die Box bleibt an der Kante des anderen Elements stehen, statt darüber
 *  hinweg zu rutschen. */
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
      const others = activeElements.filter(k => k !== drag.key);
      const collides = others.some(k => overlaps(candidate, drag.key, positions[k], k));
      if (!collides) onChange(drag.key, candidate);
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
        const { label, icon: Icon } = ELEMENT_LABELS[key];
        return (
          <div
            key={key}
            onPointerDown={e => startDrag(key, e)}
            className={`absolute flex items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium cursor-grab active:cursor-grabbing transition-shadow ${
              dragging === key
                ? "bg-teal-500/25 border-teal-400/60 text-teal-100 shadow-lg shadow-teal-500/20 z-10"
                : "bg-teal-500/10 border-teal-500/30 text-teal-300"
            }`}
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`,
              width: `${size.w}%`, height: `${size.h}%`,
              touchAction: "none",
            }}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
