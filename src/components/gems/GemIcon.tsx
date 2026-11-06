// ============================================
// OMA Gems — Edelstein-Grafiken (SVG)
// ============================================
// Jede Farbe hat zusätzlich eine eigene Form (Quadrat, Raute, Achteck, Kreis, Dreieck, Sechseck, Stern) — so
// lassen sich die Steine auch ohne Farbsehen auseinanderhalten. Sondersteine bekommen ein Overlay: Streifen
// (Linien-Stein), Glut-Ring (Bombe) bzw. sind ein Regenbogen-Prisma. Felsen sind graue Brocken.

import { memo } from "react";
import type { Piece } from "@/lib/gems/engine";

export const GEM_COLORS: { light: string; base: string; dark: string; glow: string }[] = [
  { light: "#ffb3c1", base: "#e11d48", dark: "#7f1030", glow: "rgba(244,63,94,0.55)" }, // Rubin
  { light: "#fff3a3", base: "#facc15", dark: "#a16207", glow: "rgba(250,204,21,0.5)" }, // Topas
  { light: "#b6f5cf", base: "#22c55e", dark: "#14532d", glow: "rgba(34,197,94,0.5)" }, // Smaragd
  { light: "#bfe0ff", base: "#3b82f6", dark: "#1e3a8a", glow: "rgba(59,130,246,0.55)" }, // Saphir
  { light: "#ecd5ff", base: "#a855f7", dark: "#581c87", glow: "rgba(168,85,247,0.55)" }, // Amethyst
  { light: "#ffd8b0", base: "#f97316", dark: "#9a3412", glow: "rgba(249,115,22,0.5)" }, // Bernstein
  { light: "#ffffff", base: "#dbe4ee", dark: "#7c8a9c", glow: "rgba(226,232,240,0.5)" }, // Perle
];

/** Umriss je Farbe (viewBox 0 0 100 100) + hellere Facette oben links. */
const SHAPES: { outline: string; facet: string }[] = [
  { outline: "M18 10 H82 L90 18 V82 L82 90 H18 L10 82 V18 Z", facet: "M24 18 H70 L58 34 H38 L24 46 Z" },
  { outline: "M50 6 L92 50 L50 94 L8 50 Z", facet: "M50 16 L74 42 L50 48 L28 42 Z" },
  { outline: "M32 8 H68 L92 32 V68 L68 92 H32 L8 68 V32 Z", facet: "M34 16 H66 L56 32 H38 L18 44 V36 Z" },
  { outline: "M50 7 A43 43 0 1 1 49.9 7 Z", facet: "M30 26 A30 30 0 0 1 70 22 L60 38 A18 18 0 0 0 40 40 Z" },
  { outline: "M50 8 L94 88 H6 Z", facet: "M50 22 L70 60 H50 L38 54 Z" },
  { outline: "M28 10 H72 L94 50 L72 90 H28 L6 50 Z", facet: "M31 18 H69 L60 34 H40 L20 46 Z" },
  { outline: "M50 6 L61 37 L94 38 L68 58 L77 92 L50 72 L23 92 L32 58 L6 38 L39 37 Z", facet: "M50 18 L57 40 L50 50 L42 40 Z" },
];

function GemShape({ color, id }: { color: number; id: string }) {
  const c = GEM_COLORS[color] ?? GEM_COLORS[0];
  const s = SHAPES[color] ?? SHAPES[0];
  return (
    <>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
      </defs>
      <path d={s.outline} fill={`url(#${id}-g)`} stroke={c.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d={s.facet} fill="#fff" opacity="0.38" />
      <circle cx="34" cy="28" r="5" fill="#fff" opacity="0.8" />
    </>
  );
}

function Prism({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-p`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e9d5ff" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill={`url(#${id}-p)`} stroke="#c4b5fd" strokeWidth="3" />
      {["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#f97316"].map((col, i) => (
        <path
          key={col}
          d="M50 50 L50 14 A36 36 0 0 1 81 32 Z"
          fill={col}
          opacity="0.55"
          transform={`rotate(${i * 60} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="12" fill="#fff" opacity="0.9" />
    </>
  );
}

function Stone() {
  return (
    <>
      <path d="M22 14 L62 8 L88 30 L92 70 L66 92 L26 88 L8 60 L10 30 Z" fill="#57534e" stroke="#292524" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 14 L62 8 L70 24 L40 30 L10 30 Z" fill="#a8a29e" opacity="0.55" />
      <path d="M40 30 L70 24 L88 30 L74 52 L46 54 Z" fill="#78716c" opacity="0.7" />
      <path d="M30 60 L46 54 L52 72 L36 80 Z" fill="#44403c" opacity="0.8" />
      <path d="M62 62 L74 52 L82 70 L68 78 Z" fill="#292524" opacity="0.5" />
    </>
  );
}

function SpecialOverlay({ special }: { special: Piece["special"] }) {
  if (special === "row" || special === "col") {
    const t = special === "col" ? "rotate(90 50 50)" : undefined;
    return (
      <g transform={t}>
        <rect x="6" y="40" width="88" height="7" rx="3.5" fill="#fff" opacity="0.85" />
        <rect x="6" y="54" width="88" height="7" rx="3.5" fill="#fff" opacity="0.85" />
        <path d="M2 50 L12 40 V60 Z M98 50 L88 40 V60 Z" fill="#fff" />
      </g>
    );
  }
  if (special === "bomb") {
    return (
      <>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#fde047" strokeWidth="5" strokeDasharray="8 6" opacity="0.95" />
        <circle cx="50" cy="50" r="14" fill="#fff7ed" opacity="0.9" />
        <circle cx="50" cy="50" r="7" fill="#fb923c" />
      </>
    );
  }
  return null;
}

/** Ein Spielstein. `uid` muss im Dokument eindeutig sein (SVG-Gradient-IDs). */
function GemIconInner({ piece, uid }: { piece: Pick<Piece, "kind" | "color" | "special">; uid: string }) {
  const special = piece.special;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" aria-hidden>
      {piece.kind === "stone" ? <Stone /> : special === "prism" ? <Prism id={uid} /> : <GemShape color={piece.color} id={uid} />}
      {piece.kind === "gem" && special !== "none" && special !== "prism" && <SpecialOverlay special={special} />}
    </svg>
  );
}

const GemIcon = memo(GemIconInner);
export default GemIcon;
