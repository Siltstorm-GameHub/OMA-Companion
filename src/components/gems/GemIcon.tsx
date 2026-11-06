// ============================================
// OMA Gems — Edelstein-Grafiken (SVG, Neon-Stil)
// ============================================
// Jede Farbe hat zusätzlich eine eigene Form (Kissen, Raute, Achteck, Rund, Dreieck, Sechseck, Stern) — so
// lassen sich die Steine auch ohne Farbsehen auseinanderhalten. Der Schliff wird aus den Eckpunkten der Form
// berechnet: eine helle Tafel in der Mitte, rundum Facetten, die je nach Lage zum Licht (oben links) heller
// oder dunkler sind, dazu eine leuchtende Neon-Kante.
// Sondersteine: Linien-Stein mit Leuchtstreifen und Pfeilen, Bombe mit glimmendem Kern und Funkenring,
// Prisma als rotierender Regenbogen-Kristall. Felsen sind graue Brocken, Eis ein Block über dem Stein,
// Ketten zwei gekreuzte Stränge.

import { memo } from "react";
import type { Piece } from "@/lib/gems/engine";

export const GEM_COLORS: { light: string; base: string; dark: string; neon: string; glow: string }[] = [
  { light: "#ffd1dc", base: "#f43f5e", dark: "#6b0f2a", neon: "#ff5c8a", glow: "rgba(255,64,129,0.75)" }, // Rubin
  { light: "#fff7c2", base: "#facc15", dark: "#854d0e", neon: "#ffe94d", glow: "rgba(255,221,51,0.7)" }, // Topas
  { light: "#c9ffe0", base: "#22c55e", dark: "#064e3b", neon: "#3dffa0", glow: "rgba(61,255,160,0.65)" }, // Smaragd
  { light: "#d6ecff", base: "#3b82f6", dark: "#172554", neon: "#4dc3ff", glow: "rgba(77,195,255,0.75)" }, // Saphir
  { light: "#f1e1ff", base: "#a855f7", dark: "#3b0764", neon: "#c77dff", glow: "rgba(199,125,255,0.75)" }, // Amethyst
  { light: "#ffe2c4", base: "#f97316", dark: "#7c2d12", neon: "#ff8a3d", glow: "rgba(255,138,61,0.7)" }, // Bernstein
  { light: "#ffffff", base: "#e2e8f0", dark: "#64748b", neon: "#f8fafc", glow: "rgba(241,245,249,0.6)" }, // Perle
];

type Pt = [number, number];

function circlePoints(n: number, r: number, cx = 50, cy = 50, rot = -Math.PI / 2): Pt[] {
  return Array.from({ length: n }, (_, k) => {
    const a = rot + (k / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

function starPoints(): Pt[] {
  return Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
    const r = k % 2 === 0 ? 46 : 21;
    return [50 + Math.cos(a) * r, 54 + Math.sin(a) * r];
  });
}

/** Umrisse je Farbe (viewBox 0 0 100 100). */
const OUTLINES: Pt[][] = [
  [[20, 9], [80, 9], [91, 20], [91, 80], [80, 91], [20, 91], [9, 80], [9, 20]], // Kissen
  [[50, 4], [94, 50], [50, 96], [6, 50]], // Raute
  circlePoints(8, 45, 50, 50, -Math.PI / 2 + Math.PI / 8), // Achteck
  circlePoints(16, 44), // Rund
  [[50, 7], [95, 88], [5, 88]], // Dreieck
  circlePoints(6, 46, 50, 50, 0), // Sechseck
  starPoints(), // Stern
];

const LIGHT: Pt = [-0.6, -0.8];

interface Cut {
  outline: string;
  table: string;
  facets: { d: string; shade: number }[];
}

const path = (pts: Pt[]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")} Z`;

function makeCut(pts: Pt[]): Cut {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const table: Pt[] = pts.map(([x, y]) => [cx + (x - cx) * 0.52, cy + (y - cy) * 0.52]);
  const facets = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const mx = (p[0] + q[0]) / 2 - cx;
    const my = (p[1] + q[1]) / 2 - cy;
    const len = Math.hypot(mx, my) || 1;
    const shade = (mx / len) * LIGHT[0] + (my / len) * LIGHT[1]; // -1 (abgewandt) … 1 (zum Licht)
    return { d: path([p, q, table[(i + 1) % pts.length], table[i]]), shade };
  });
  return { outline: path(pts), table: path(table), facets };
}

const CUTS: Cut[] = OUTLINES.map(makeCut);

function GemShape({ color, id }: { color: number; id: string }) {
  const c = GEM_COLORS[color] ?? GEM_COLORS[0];
  const cut = CUTS[color] ?? CUTS[0];
  return (
    <>
      <defs>
        <radialGradient id={`${id}-g`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="40%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
        <radialGradient id={`${id}-t`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor={c.light} stopOpacity="0.55" />
          <stop offset="100%" stopColor={c.base} stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <path d={cut.outline} fill={`url(#${id}-g)`} />
      {cut.facets.map((f, i) => (
        <path
          key={i}
          d={f.d}
          fill={f.shade > 0 ? "#fff" : "#000"}
          opacity={f.shade > 0 ? 0.08 + f.shade * 0.32 : Math.min(0.42, -f.shade * 0.38)}
          stroke={c.light}
          strokeOpacity="0.18"
          strokeWidth="0.8"
        />
      ))}
      <path d={cut.table} fill={`url(#${id}-t)`} stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
      {/* Neon-Kante: breiter, zarter Schein + feine, helle Linie */}
      <path d={cut.outline} fill="none" stroke={c.neon} strokeWidth="5" strokeOpacity="0.35" strokeLinejoin="round" />
      <path d={cut.outline} fill="none" stroke={c.light} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Glanzpunkt */}
      <path d="M33 24 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5 Z" fill="#fff" opacity="0.9" />
    </>
  );
}

function Prism({ id }: { id: string }) {
  const hex = circlePoints(6, 44, 50, 50, 0);
  return (
    <>
      <defs>
        <radialGradient id={`${id}-p`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#c4b5fd" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </radialGradient>
      </defs>
      <path d={path(hex)} fill="#0f0a2a" />
      <g className="gems-spin">
        {["#ff4081", "#ffdd33", "#3dffa0", "#4dc3ff", "#c77dff", "#ff8a3d"].map((col, i) => (
          <path key={col} d={path([[50, 50], hex[i], hex[(i + 1) % 6]])} fill={col} opacity="0.75" />
        ))}
      </g>
      <path d={path(hex)} fill={`url(#${id}-p)`} opacity="0.55" />
      <path d={path(circlePoints(6, 18, 50, 50, Math.PI / 6))} fill="#fff" opacity="0.9" />
      <path d={path(hex)} fill="none" stroke="#fff" strokeWidth="2" />
      <path d={path(hex)} fill="none" stroke="#e9d5ff" strokeWidth="6" strokeOpacity="0.35" />
    </>
  );
}

function Stone() {
  return (
    <>
      <path d="M22 14 L62 8 L88 30 L92 70 L66 92 L26 88 L8 60 L10 30 Z" fill="#57534e" stroke="#1c1917" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 14 L62 8 L70 24 L40 30 L10 30 Z" fill="#a8a29e" opacity="0.5" />
      <path d="M40 30 L70 24 L88 30 L74 52 L46 54 Z" fill="#78716c" opacity="0.7" />
      <path d="M30 60 L46 54 L52 72 L36 80 Z" fill="#292524" opacity="0.8" />
      <path d="M62 62 L74 52 L82 70 L68 78 Z" fill="#1c1917" opacity="0.5" />
      <path d="M22 14 L62 8 L88 30 L92 70 L66 92 L26 88 L8 60 L10 30 Z" fill="none" stroke="#fb923c" strokeOpacity="0.35" strokeWidth="5" />
      <path d="M22 14 L62 8 L88 30 L92 70 L66 92 L26 88 L8 60 L10 30 Z" fill="none" stroke="#e7e5e4" strokeOpacity="0.75" strokeWidth="1.5" />
    </>
  );
}

function SpecialOverlay({ special, color }: { special: Piece["special"]; color: number }) {
  const c = GEM_COLORS[color] ?? GEM_COLORS[6];
  if (special === "row" || special === "col") {
    const t = special === "col" ? "rotate(90 50 50)" : undefined;
    return (
      <g transform={t} className="gems-streak">
        <rect x="2" y="39" width="96" height="22" rx="11" fill={c.neon} opacity="0.5" />
        <rect x="6" y="45.5" width="88" height="9" rx="4.5" fill="#fff" stroke={c.dark} strokeOpacity="0.5" strokeWidth="1" />
        <path d="M-2 50 L14 36 V64 Z" fill="#fff" stroke={c.dark} strokeOpacity="0.5" strokeWidth="1" />
        <path d="M102 50 L86 36 V64 Z" fill="#fff" stroke={c.dark} strokeOpacity="0.5" strokeWidth="1" />
      </g>
    );
  }
  if (special === "bomb") {
    return (
      <>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#ffb020" strokeWidth="3.5" strokeDasharray="5 7" className="gems-spin" opacity="0.95" />
        <circle cx="50" cy="50" r="20" fill="#1a0b00" opacity="0.75" />
        <circle cx="50" cy="50" r="13" fill="#ff8a3d" className="gems-ember" />
        <circle cx="50" cy="50" r="6" fill="#fff7d6" />
      </>
    );
  }
  return null;
}

function Ice() {
  return (
    <>
      <rect x="3" y="3" width="94" height="94" rx="16" fill="#7dd3fc" opacity="0.32" stroke="#e0f2fe" strokeWidth="3" />
      <rect x="3" y="3" width="94" height="94" rx="16" fill="none" stroke="#38bdf8" strokeWidth="7" strokeOpacity="0.35" />
      <path d="M12 30 L30 12 M14 52 L52 14 M60 88 L88 60" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity="0.75" />
      <path d="M70 20 L78 34 L66 40" stroke="#bae6fd" strokeWidth="3" fill="none" opacity="0.9" />
    </>
  );
}

function ChainStrand({ rotate }: { rotate: number }) {
  return (
    <g transform={`rotate(${rotate} 50 50)`}>
      {[14, 38, 62].map((x) => (
        <rect key={x} x={x} y="42" width="26" height="16" rx="8" fill="none" stroke="#e7e5e4" strokeWidth="6" />
      ))}
      {[14, 38, 62].map((x) => (
        <rect key={`i${x}`} x={x} y="42" width="26" height="16" rx="8" fill="none" stroke="#57534e" strokeWidth="2" />
      ))}
    </g>
  );
}

function Chains() {
  return (
    <>
      <ChainStrand rotate={45} />
      <ChainStrand rotate={-45} />
      <circle cx="50" cy="50" r="9" fill="#a8a29e" stroke="#44403c" strokeWidth="3" />
    </>
  );
}

/** Ein Spielstein. `uid` muss im Dokument eindeutig sein (SVG-Gradient-IDs). */
function GemIconInner({ piece, uid }: { piece: Pick<Piece, "kind" | "color" | "special" | "lock">; uid: string }) {
  const special = piece.special;
  const lock = piece.lock ?? "none";
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" aria-hidden>
      {piece.kind === "stone" ? <Stone /> : special === "prism" ? <Prism id={uid} /> : <GemShape color={piece.color} id={uid} />}
      {piece.kind === "gem" && special !== "none" && special !== "prism" && <SpecialOverlay special={special} color={piece.color} />}
      {piece.kind === "gem" && lock === "ice" && <Ice />}
      {piece.kind === "gem" && lock === "chain" && <Chains />}
    </svg>
  );
}

const GemIcon = memo(GemIconInner);
export default GemIcon;
