"use client";

import { useEffect, useRef, useState } from "react";
import { EDGE_MARGIN } from "./types";
import type { LucideIcon } from "lucide-react";

/** scale skaliert die gesamte Kachel samt Inhalt (CSS transform) — 1 = Originalgröße. */
export type Pos = { x: number; y: number; scale?: number }; // Prozent von 1920×1080, oben links des Elements

export type CanvasElementOption<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
  /** Elemente ohne fixe=true dürfen sich stapeln (identische Position = eine rotierende
   *  Gruppe); "fixe" Elemente (z.B. die Marken-Kachel) blocken jede Überlappung. */
  fixed?: boolean;
};

// Alles in Pixeln des OBS-Canvas gerechnet (1920×1080), gespeichert wird in Prozent.
const CANVAS_W = 1920;
const CANVAS_H = 1080;
/** Rasterweite: 40px — sichtbar als feine Linien, jede dritte (120px, also 16×9 Felder) kräftiger. */
const GRID = 40;
const GRID_MAJOR = 120;
/** Abstand zwischen zwei nebeneinander angedockten Kacheln. */
const TILE_GAP = 16;
/** Wie nah (px) eine Kante an Bildschirmrand oder Nachbarkachel sein muss, um dort einzurasten. */
const SNAP_PX = 24;
/** Ab diesem Anteil Überdeckung wird die gezogene Kachel Teil des Stapels darunter. */
const STACK_OVERLAP = 0.5;

type Target = { pos: number; line: number };

/** Nächstes Spezialziel (Rand, Nachbarkante) innerhalb SNAP_PX, sonst die nächste Rasterlinie. */
function snapAxis(raw: number, targets: Target[], max: number, size: number): { pos: number; line?: number } {
  // Im Randbereich (bis Randabstand + Einrast-Weite) immer genau auf den Randabstand — auch wenn
  // über den Bildschirmrand hinaus gezogen wird.
  if (raw <= EDGE_MARGIN + SNAP_PX) return { pos: EDGE_MARGIN, line: EDGE_MARGIN };
  if (raw >= max - EDGE_MARGIN - SNAP_PX) return { pos: max - EDGE_MARGIN, line: max + size - EDGE_MARGIN };
  let best: Target | null = null;
  for (const t of targets) {
    if (t.pos < 0 || t.pos > max) continue;
    if (Math.abs(t.pos - raw) <= SNAP_PX && (!best || Math.abs(t.pos - raw) < Math.abs(best.pos - raw))) best = t;
  }
  if (best) return { pos: best.pos, line: best.line };
  const grid = Math.min(Math.max(0, Math.round(raw / GRID) * GRID), Math.floor(max / GRID) * GRID);
  return { pos: grid, line: grid };
}

/** 16:9-Vorschau des OBS-Canvas mit ziehbaren Boxen je aktivem Element — von beiden
 *  Overlay-Typen (Event, Profil) genutzt, daher generisch über den Element-Schlüsseltyp.
 *  - Fixe Elemente blocken jede Überlappung — die Box bleibt an der Kante des anderen
 *    Elements stehen.
 *  - Stapelbare Elemente rasten beim Überlappen eines anderen stapelbaren Elements exakt auf
 *    dessen Position ein (das IST die Stapelbildung), bleiben aber von fixen Elementen fern.
 *  - Beim Ziehen rastet jede Kachel ein: am Bildschirmrand (mit Abstand), bündig oder mit Lücke an
 *    Nachbarkacheln, sonst immer am sichtbaren 40px-Raster. Hilfslinien zeigen das Einrast-Ziel. */
export default function PositionCanvas<K extends string>({
  options, elementSize, activeElements, positions, onChange, stacking = true, previewSrc,
}: {
  options: CanvasElementOption<K>[];
  elementSize: Record<K, { width: number; height: number }>;
  activeElements: K[];
  positions: Record<K, Pos>;
  onChange: (key: K, pos: Pos) => void;
  /** false = Elemente dürfen sich frei überlappen, ohne zu einem Stapel einzurasten (Vollbild-Szenen). */
  stacking?: boolean;
  /** Echtes Overlay (Vorschau-Seite) verkleinert hinter den Kästchen. */
  previewSrc?: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Breite der Fläche → Skalierung der 1920×1080-Vorschau. Zusätzlich zum ResizeObserver kurz
  // nachmessen: Beim ersten Rendern (Streaming, versteckter Reiter) ist die Fläche noch 0px breit,
  // und das spätere Einhängen meldet der Observer nicht zuverlässig.
  const [canvasWidth, setCanvasWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setCanvasWidth(w => (w === el.clientWidth ? w : el.clientWidth));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t = setInterval(measure, 1000);
    return () => { ro.disconnect(); clearInterval(t); };
  }, []);
  const dragState = useRef<{ key: K; grabDx: number; grabDy: number } | null>(null);
  const [dragging, setDragging] = useState<K | null>(null);
  // Hilfslinien beim Ziehen: woran die Kachel gerade einrastet (px im 1920×1080-Canvas).
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});

  const optionByKey = new Map(options.map(o => [o.key, o]));
  const isFixed = (key: K) => optionByKey.get(key)?.fixed ?? false;

  function pctSize(key: K): { w: number; h: number } {
    const scale = positions[key]?.scale ?? 1;
    return { w: (elementSize[key].width / 1920) * 100 * scale, h: (elementSize[key].height / 1080) * 100 * scale };
  }
  function overlaps(a: Pos, aKey: K, b: Pos, bKey: K): boolean {
    const sa = pctSize(aKey);
    const sb = pctSize(bKey);
    return a.x < b.x + sb.w && a.x + sa.w > b.x && a.y < b.y + sb.h && a.y + sa.h > b.y;
  }

  /** Anteil der gezogenen bzw. kleineren Kachel, der überdeckt wird (0–1). */
  function overlapRatio(a: Pos, aKey: K, b: Pos, bKey: K): number {
    const sa = pctSize(aKey);
    const sb = pctSize(bKey);
    const w = Math.max(0, Math.min(a.x + sa.w, b.x + sb.w) - Math.max(a.x, b.x));
    const h = Math.max(0, Math.min(a.y + sa.h, b.y + sb.h) - Math.max(a.y, b.y));
    return (w * h) / Math.max(0.0001, Math.min(sa.w * sa.h, sb.w * sb.h));
  }

  function startDrag(key: K, e: React.PointerEvent) {
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
      const w = (size.w / 100) * CANVAS_W;
      const h = (size.h / 100) * CANVAS_H;
      const rawL = (((ev.clientX - r.left) / r.width) * 100 - drag.grabDx) / 100 * CANVAS_W;
      const rawT = (((ev.clientY - r.top) / r.height) * 100 - drag.grabDy) / 100 * CANVAS_H;
      const others = activeElements.filter(k => k !== drag.key);
      const boxes = others.map(k => {
        const s = pctSize(k);
        const left = (positions[k].x / 100) * CANVAS_W, top = (positions[k].y / 100) * CANVAS_H;
        return { left, top, right: left + (s.w / 100) * CANVAS_W, bottom: top + (s.h / 100) * CANVAS_H };
      });

      // Einrast-Ziele je Achse: Bildschirmrand mit Abstand (auch rechts-/unten-bündig) und die
      // Kanten anderer Kacheln (bündig oder mit Lücke daneben). Ist keins nah genug, rastet die
      // Kachel auf das sichtbare Raster ein — es gibt also immer genau eine nachvollziehbare Regel.
      const xTargets: Target[] = [
        { pos: EDGE_MARGIN, line: EDGE_MARGIN },
        { pos: CANVAS_W - EDGE_MARGIN - w, line: CANVAS_W - EDGE_MARGIN },
        ...boxes.flatMap(b => [
          { pos: b.left, line: b.left },
          { pos: b.right - w, line: b.right },
          { pos: b.right + TILE_GAP, line: b.right + TILE_GAP },
          { pos: b.left - TILE_GAP - w, line: b.left - TILE_GAP },
        ]),
      ];
      const yTargets: Target[] = [
        { pos: EDGE_MARGIN, line: EDGE_MARGIN },
        { pos: CANVAS_H - EDGE_MARGIN - h, line: CANVAS_H - EDGE_MARGIN },
        ...boxes.flatMap(b => [
          { pos: b.top, line: b.top },
          { pos: b.bottom - h, line: b.bottom },
          { pos: b.bottom + TILE_GAP, line: b.bottom + TILE_GAP },
          { pos: b.top - TILE_GAP - h, line: b.top - TILE_GAP },
        ]),
      ];
      const sx = snapAxis(rawL, xTargets, CANVAS_W - w, w);
      const sy = snapAxis(rawT, yTargets, CANVAS_H - h, h);
      setGuides({ x: sx.line, y: sy.line });

      const ownScale = positions[drag.key]?.scale;
      const candidate: Pos = {
        x: Math.round((sx.pos / CANVAS_W) * 10000) / 100,
        y: Math.round((sy.pos / CANVAS_H) * 10000) / 100,
        ...(ownScale !== undefined ? { scale: ownScale } : {}),
      };

      const fixedOthers = others.filter(isFixed);
      const hitsFixed = fixedOthers.some(k => overlaps(candidate, drag.key, positions[k], k));
      if (hitsFixed) return; // fixe Elemente blocken immer — Bewegung verwerfen

      if (isFixed(drag.key)) {
        const collides = others.some(k => overlaps(candidate, drag.key, positions[k], k));
        if (collides) return;
        onChange(drag.key, candidate);
        return;
      }

      if (!stacking) { onChange(drag.key, candidate); return; }
      // Stapeln erst, wenn die Kachel überwiegend auf einer anderen liegt — ein bloßes Streifen
      // der Kante soll nicht unvermittelt einen Stapel bilden.
      const stackable = others.filter(k => !isFixed(k));
      const stackPartner = stackable.find(k => overlapRatio(candidate, drag.key, positions[k], k) >= STACK_OVERLAP);
      if (stackPartner) {
        setGuides({});
        // Im Stapel gilt die Größe des Stapels — sonst würde die Kachel beim Rotieren springen.
        onChange(drag.key, { ...positions[stackPartner] });
        return;
      }
      // Teilweise Überlappung ohne Stapel würde im Stream Kacheln übereinander legen.
      if (stackable.some(k => overlaps(candidate, drag.key, positions[k], k))) return;
      onChange(drag.key, candidate);
    };
    const handleUp = () => {
      dragState.current = null;
      setDragging(null);
      setGuides({});
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  // Stapel-Gruppen bilden: alle aktiven Elemente mit identischer Position (auf 0.1% gerundet)
  // gehören zusammen. Statt sie deckungsgleich zu übereinanderzulegen (unlesbar, siehe Feedback),
  // teilen sie sich die eine Box in gleich hohen, nicht überlappenden Bändern auf — jedes Band
  // bleibt einzeln per Pointer-Down greifbar, um wieder herausgezogen zu werden.
  const groups = new Map<string, K[]>();
  for (const key of activeElements) {
    const p = positions[key];
    const posKey = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    (groups.get(posKey) ?? groups.set(posKey, []).get(posKey)!).push(key);
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{
        aspectRatio: "16 / 9",
        background: "linear-gradient(135deg, #0d1420 0%, #131a26 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        // Feines Raster (40px) und kräftigeres (120px) — genau die Linien, auf die beim Ziehen eingerastet wird.
        backgroundImage: [
          "linear-gradient(rgba(20,184,166,0.16) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(20,184,166,0.16) 1px, transparent 1px)",
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: [
          `${(GRID_MAJOR / CANVAS_W) * 100}% ${(GRID_MAJOR / CANVAS_H) * 100}%`,
          `${(GRID_MAJOR / CANVAS_W) * 100}% ${(GRID_MAJOR / CANVAS_H) * 100}%`,
          `${(GRID / CANVAS_W) * 100}% ${(GRID / CANVAS_H) * 100}%`,
          `${(GRID / CANVAS_W) * 100}% ${(GRID / CANVAS_H) * 100}%`,
        ].join(", "),
      }}
    >
      {previewSrc && canvasWidth > 0 && (
        <iframe
          src={previewSrc}
          title="Vorschau"
          tabIndex={-1}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: CANVAS_W, height: CANVAS_H, border: 0, transform: `scale(${canvasWidth / CANVAS_W})`, transformOrigin: "top left" }}
        />
      )}
      {dragging && guides.x !== undefined && (
        <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(guides.x / CANVAS_W) * 100}%`, width: 1, background: "rgba(94,234,212,0.8)", zIndex: 30 }} />
      )}
      {dragging && guides.y !== undefined && (
        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${(guides.y / CANVAS_H) * 100}%`, height: 1, background: "rgba(94,234,212,0.8)", zIndex: 30 }} />
      )}
      {[...groups.entries()].map(([posKey, keys]) => {
        const pos = positions[keys[0]];
        const boxSize = keys.reduce(
          (acc, k) => { const s = pctSize(k); return { w: Math.max(acc.w, s.w), h: Math.max(acc.h, s.h) }; },
          { w: 0, h: 0 }
        );
        const groupDragging = dragging != null && keys.includes(dragging);
        return (
          <div
            key={posKey}
            className="absolute rounded-lg overflow-hidden flex flex-col"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`,
              width: `${boxSize.w}%`, height: `${boxSize.h}%`,
              zIndex: groupDragging ? 20 : 10,
              boxShadow: keys.length > 1 ? "0 0 0 1px rgba(20,184,166,0.25)" : undefined,
            }}
          >
            {keys.map(key => {
              const option = optionByKey.get(key)!;
              const Icon = option.icon;
              return (
                <div
                  key={key}
                  onPointerDown={e => startDrag(key, e)}
                  className={`flex items-center gap-1.5 border px-2 text-[11px] font-medium cursor-grab active:cursor-grabbing transition-shadow ${
                    dragging === key
                      ? "bg-teal-500/25 border-teal-400/60 text-teal-100 shadow-lg shadow-teal-500/20"
                      : previewSrc
                        ? option.fixed
                          ? "bg-violet-500/[0.04] border-violet-400/50 text-violet-200 hover:bg-violet-500/15"
                          : "bg-teal-500/[0.04] border-teal-400/50 text-teal-100 hover:bg-teal-500/15"
                        : option.fixed
                          ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                          : "bg-teal-500/10 border-teal-500/30 text-teal-300"
                  }`}
                  style={{ flex: 1, minHeight: 0, touchAction: "none" }}
                >
                  {/* Über der echten Vorschau als kleines Etikett, damit der Inhalt darunter sichtbar bleibt. */}
                  <span className={`flex items-center gap-1 min-w-0 ${previewSrc ? "self-start mt-0.5 rounded bg-black/70 px-1 py-px" : ""}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{option.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
