"use client";
// ============================================
// OMA Gems — Spielbrett (Darstellung + Eingabe)
// ============================================
// Jeder Stein ist ein eigenes, absolut positioniertes Element mit stabiler ID: Steine gleiten beim Tauschen
// und Nachrutschen sichtbar an ihren neuen Platz, abgeräumte schrumpfen weg, neue fallen von oberhalb des
// Bretts herein (spawnFrom = wie viele Reihen über ihrem Ziel sie starten). Feste Felder (Felsen, Eis, Ketten)
// liegen unter den beweglichen Steinen, die daran vorbeifallen.
//
// Effekte: Splitter beim Abräumen (bursts), Explosionen der Sondersteine und Kombos (blasts), Punkte (popups),
// Wackeln des Bretts bei großen Explosionen (shake). Bei „weniger Bewegung“ (prefers-reduced-motion) entfallen
// Splitter und Wackeln.
//
// Bedienung: Wischen/Ziehen eines Steins Richtung Nachbar, oder Tippen auf zwei benachbarte Steine.
// Tastatur: Pfeiltasten bewegen den Rahmen, Leertaste/Enter wählt aus bzw. tauscht.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { COLS, ROWS, areAdjacent, isFixed, type BlastKind, type Piece } from "@/lib/gems/engine";
import GemIcon, { GEM_COLORS } from "./GemIcon";

export interface Blast {
  key: string;
  index: number;
  kind: BlastKind;
}

export interface ScorePopup {
  key: string;
  index: number;
  text: string;
  big?: boolean;
}

export interface Burst {
  key: string;
  index: number;
  /** Farbe 0..6, -1 = Felsen */
  color: number;
}

const MOVE_MS = 0.2;
const SHARDS = 6;

function blastStyle(b: Blast, size: number): CSSProperties {
  const x = (b.index % COLS) * size;
  const y = Math.floor(b.index / COLS) * size;
  const band = (r0: number, r1: number) => ({ left: 0, top: r0 * size, width: size * COLS, height: (r1 - r0 + 1) * size });
  const col = (c0: number, c1: number) => ({ left: c0 * size, top: 0, width: (c1 - c0 + 1) * size, height: size * ROWS });
  const r = Math.floor(b.index / COLS);
  switch (b.kind) {
    case "row":
      return { left: 0, top: y + size * 0.3, width: size * COLS, height: size * 0.4 };
    case "col":
      return { left: x + size * 0.3, top: 0, width: size * 0.4, height: size * ROWS };
    case "bomb":
      return { left: x - size, top: y - size, width: size * 3, height: size * 3, borderRadius: "50%" };
    case "bomb5":
      return { left: x - 2 * size, top: y - 2 * size, width: size * 5, height: size * 5, borderRadius: "50%" };
    case "cross":
      return band(r, r);
    case "cross3":
      return band(Math.max(0, r - 1), Math.min(ROWS - 1, r + 1));
    case "ice":
      return { left: x, top: y, width: size, height: size, borderRadius: 12 };
    default:
      // Prisma / ganzes Brett
      return col(0, COLS - 1);
  }
}

export default function GemsBoard({
  cells,
  spawnFrom,
  disabled,
  hint,
  blasts,
  popups,
  bursts,
  shake,
  onSwap,
}: {
  cells: (Piece | null)[];
  spawnFrom: Record<number, number>;
  disabled: boolean;
  hint: [number, number] | null;
  blasts: Blast[];
  popups: ScorePopup[];
  bursts: Burst[];
  /** Zähler: jede Erhöhung lässt das Brett kurz wackeln. */
  shake: number;
  onSwap: (a: number, b: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; cell: number; moved: boolean } | null>(null);
  const reduced = useReducedMotion();
  const shakeCtl = useAnimationControls();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize(el.clientWidth / COLS);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Während Animationen keine Auswahl stehen lassen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (disabled) setSelected(null);
  }, [disabled]);

  useEffect(() => {
    if (shake <= 0 || reduced) return;
    void shakeCtl.start({ x: [0, -7, 6, -4, 3, 0], y: [0, 3, -4, 2, -1, 0], transition: { duration: 0.35 } });
  }, [shake, reduced, shakeCtl]);

  const cellAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = ref.current;
      if (!el || size <= 0) return null;
      const rect = el.getBoundingClientRect();
      const c = Math.floor((clientX - rect.left) / size);
      const r = Math.floor((clientY - rect.top) / size);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return r * COLS + c;
    },
    [size],
  );

  const tap = useCallback(
    (cell: number) => {
      if (disabled) return;
      if (selected === null) setSelected(cell);
      else if (selected === cell) setSelected(null);
      else if (areAdjacent(selected, cell)) {
        setSelected(null);
        onSwap(selected, cell);
      } else setSelected(cell);
    },
    [disabled, selected, onSwap],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    drag.current = { x: e.clientX, y: e.clientY, cell, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.moved || disabled) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.35) return;
    d.moved = true;
    const r = Math.floor(d.cell / COLS);
    const c = d.cell % COLS;
    let target: number | null = null;
    if (Math.abs(dx) > Math.abs(dy)) target = dx > 0 ? (c < COLS - 1 ? d.cell + 1 : null) : c > 0 ? d.cell - 1 : null;
    else target = dy > 0 ? (r < ROWS - 1 ? d.cell + COLS : null) : r > 0 ? d.cell - COLS : null;
    setSelected(null);
    if (target !== null) onSwap(d.cell, target);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) tap(d.cell);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = cursor ?? selected ?? 27;
    const r = Math.floor(cur / COLS);
    const c = cur % COLS;
    let next = cur;
    if (e.key === "ArrowLeft" && c > 0) next = cur - 1;
    else if (e.key === "ArrowRight" && c < COLS - 1) next = cur + 1;
    else if (e.key === "ArrowUp" && r > 0) next = cur - COLS;
    else if (e.key === "ArrowDown" && r < ROWS - 1) next = cur + COLS;
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      tap(cur);
      setCursor(cur);
      return;
    } else if (e.key === "Escape") {
      setSelected(null);
      return;
    } else return;
    e.preventDefault();
    setCursor(next);
  };

  const pos = (index: number) => ({ x: (index % COLS) * size, y: Math.floor(index / COLS) * size });

  return (
    <motion.div animate={shakeCtl}>
      <div
        ref={ref}
        role="grid"
        aria-label="Spielbrett"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        className="relative w-full aspect-square rounded-2xl overflow-hidden touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
        style={{
          background:
            "repeating-conic-gradient(rgba(255,255,255,0.035) 0% 25%, rgba(255,255,255,0.0) 0% 50%) 0 0 / 25% 25%, linear-gradient(160deg, #111827, #0b1020)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        {size > 0 && (
          <>
            {/* Hinweis */}
            {hint &&
              hint.map((i) => (
                <div
                  key={`hint-${i}`}
                  className="absolute rounded-xl animate-pulse pointer-events-none"
                  style={{ left: pos(i).x, top: pos(i).y, width: size, height: size, boxShadow: "inset 0 0 0 3px rgba(253,224,71,0.85)", background: "rgba(253,224,71,0.12)" }}
                />
              ))}
            {/* Auswahl / Tastatur-Rahmen */}
            {selected !== null && (
              <div
                className="absolute rounded-xl pointer-events-none"
                style={{ left: pos(selected).x, top: pos(selected).y, width: size, height: size, background: "rgba(255,255,255,0.14)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.75)" }}
              />
            )}
            {cursor !== null && (
              <div
                className="absolute rounded-xl pointer-events-none"
                style={{ left: pos(cursor).x, top: pos(cursor).y, width: size, height: size, boxShadow: "inset 0 0 0 2px rgba(45,212,191,0.9)" }}
              />
            )}

            <AnimatePresence>
              {cells.map((p, index) => {
                if (!p) return null;
                const { x, y } = pos(index);
                const from = spawnFrom[p.id];
                const special = p.kind === "gem" && p.special !== "none";
                const glow = p.kind === "gem" && p.color >= 0 ? GEM_COLORS[p.color].glow : "rgba(196,181,253,0.6)";
                return (
                  <motion.div
                    key={p.id}
                    className="absolute pointer-events-none"
                    style={{ width: size, height: size, left: 0, top: 0, padding: size * 0.08, zIndex: isFixed(p) ? 1 : 2 }}
                    initial={{ x, y: from ? y - from * size : y, scale: from ? 1 : 0.6, opacity: from ? 1 : 0 }}
                    animate={{ x, y, scale: 1, opacity: 1 }}
                    exit={{ scale: 0.1, opacity: 0, transition: { duration: 0.18 } }}
                    transition={{ duration: from ? 0.28 : MOVE_MS, ease: from ? "easeIn" : "easeOut" }}
                  >
                    <div
                      className={`w-full h-full ${special ? "gems-special" : ""}`}
                      style={special ? { filter: `drop-shadow(0 0 ${size * 0.12}px ${glow})` } : undefined}
                    >
                      <GemIcon piece={p} uid={`g${p.id}`} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Splitter */}
            {!reduced && (
              <AnimatePresence>
                {bursts.map((b) => {
                  const { x, y } = pos(b.index);
                  const col = b.color >= 0 ? GEM_COLORS[b.color].base : "#a8a29e";
                  return Array.from({ length: SHARDS }, (_, k) => {
                    const angle = (k / SHARDS) * Math.PI * 2 + (b.index % 3) * 0.4;
                    const dist = size * (0.55 + (k % 3) * 0.15);
                    return (
                      <motion.div
                        key={`${b.key}-${k}`}
                        className="absolute pointer-events-none rounded-sm"
                        style={{ left: x + size / 2 - size * 0.06, top: y + size / 2 - size * 0.06, width: size * 0.12, height: size * 0.12, background: col, zIndex: 3, boxShadow: `0 0 6px ${col}` }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + size * 0.3, opacity: 0, rotate: 180, scale: 0.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    );
                  });
                })}
              </AnimatePresence>
            )}

            {/* Explosionen der Sondersteine und Kombos */}
            <AnimatePresence>
              {blasts.map((b) => (
                <motion.div
                  key={b.key}
                  className="absolute pointer-events-none"
                  style={{
                    ...blastStyle(b, size),
                    zIndex: 4,
                    background:
                      b.kind === "prism" || b.kind === "board"
                        ? "radial-gradient(circle, rgba(255,255,255,0.6), rgba(168,85,247,0.2) 70%)"
                        : b.kind === "ice"
                          ? "radial-gradient(closest-side, rgba(224,242,254,0.95), rgba(125,211,252,0.3) 70%, rgba(125,211,252,0))"
                          : "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(253,224,71,0.55) 60%, rgba(253,224,71,0))",
                  }}
                  initial={{ opacity: 0.95, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: b.kind === "ice" ? 0.35 : 0.5, ease: "easeOut" }}
                />
              ))}
              {/* Kreuz-Kombos: zusätzlich die Spalte(n) */}
              {blasts
                .filter((b) => b.kind === "cross" || b.kind === "cross3")
                .map((b) => {
                  const c = b.index % COLS;
                  const c0 = b.kind === "cross" ? c : Math.max(0, c - 1);
                  const c1 = b.kind === "cross" ? c : Math.min(COLS - 1, c + 1);
                  return (
                    <motion.div
                      key={`${b.key}-v`}
                      className="absolute pointer-events-none"
                      style={{
                        left: c0 * size,
                        top: 0,
                        width: (c1 - c0 + 1) * size,
                        height: ROWS * size,
                        zIndex: 4,
                        background: "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(253,224,71,0.55) 60%, rgba(253,224,71,0))",
                      }}
                      initial={{ opacity: 0.95, scaleX: 0.6 }}
                      animate={{ opacity: 0, scaleX: 1.1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  );
                })}
            </AnimatePresence>

            {/* Punkte */}
            <AnimatePresence>
              {popups.map((p) => {
                const { x, y } = pos(p.index);
                return (
                  <motion.div
                    key={p.key}
                    className="absolute pointer-events-none font-display font-black tabular-nums"
                    style={{
                      left: x - size,
                      top: y,
                      width: size * 3,
                      textAlign: "center",
                      zIndex: 5,
                      color: p.big ? "#fde047" : "#fff",
                      fontSize: Math.max(12, size * (p.big ? 0.48 : 0.32)),
                      textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                    }}
                    initial={{ opacity: 0, y: size * 0.2, scale: p.big ? 0.6 : 1 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -size * 0.6, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: p.big ? 1.2 : 0.9, ease: "easeOut" }}
                  >
                    {p.text}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}
