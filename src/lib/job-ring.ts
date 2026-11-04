import type { CSSProperties } from "react";
import type { JobBadgeData } from "@/lib/job-badges";

/**
 * Profilrahmen (Ring um das Profilbild): Farbe UND Effekt = Ansehens-Stufe des Users
 * (Bronze, Silber, Gold, Platin) aus der Gesamtleistung aller Community-Jobs — kein
 * Berufsbezug mehr. Solange die Stufe noch lädt, gibt es den schlichten grauen Ring.
 * Nutzt die bestehenden CSS-Klassen .rank-ring/.rr-t1–3/.rr-apex aus globals.css.
 */

export const GOLD = "#fbbf24";

/** Grundfarbe je Stufe (Index 0 = Stufe 1). */
export const REPUTATION_COLORS: readonly string[] = ["#cd7f32", "#c0c7d1", GOLD, "#a5f3fc"];

export function reputationColor(level: number): string {
  return REPUTATION_COLORS[Math.min(4, Math.max(1, level)) - 1];
}

function mix(hex: string, other: [number, number, number], t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const m = c.map((v, i) => Math.round(v + (other[i] - v) * t));
  return `#${m.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Pro Stufe: Drehtempo und Glow-Stärke (Stufe 1 ruhig, Stufe 4 mit Puls). */
const LEVEL_FX = [
  { speed: "12s", glow: 0 },
  { speed: "10s", glow: 10 },
  { speed: "8s",  glow: 16 },
  { speed: "6s",  glow: 22 },
] as const;

const TIER_CLASS = ["rr-t1", "rr-t2", "rr-t3", "rr-t3 rr-apex"] as const;

/** Lädt noch: schlichter grauer Ring. */
const NEUTRAL_RING = {
  c1: "#3f3f46", c2: "#a1a1aa", c3: "#52525b", speed: "12s", glow: "0px", glowColor: "transparent",
  light: { c1: "#a1a1aa", c2: "#3f3f46", c3: "#71717a", glow: "0px", glowColor: "transparent" },
};

export function getJobRing(badge: JobBadgeData | null | undefined): { className: string; style: CSSProperties; level: number } {
  if (!badge) {
    const r = NEUTRAL_RING;
    return {
      level: 0,
      className: "rank-ring rr-t1",
      style: {
        "--rr-dc1": r.c1, "--rr-dc2": r.c2, "--rr-dc3": r.c3, "--rr-dglow": r.glow, "--rr-dglowc": r.glowColor,
        "--rr-lc1": r.light.c1, "--rr-lc2": r.light.c2, "--rr-lc3": r.light.c3, "--rr-lglow": r.light.glow, "--rr-lglowc": r.light.glowColor,
        "--rr-speed": r.speed,
      } as CSSProperties,
    };
  }
  const lvl = Math.min(4, Math.max(1, badge.level)) - 1;
  const base = REPUTATION_COLORS[lvl];
  const fx = LEVEL_FX[lvl];
  const dark = mix(base, [0, 0, 0], 0.55);
  const light = mix(base, [255, 255, 255], 0.55);
  return {
    level: lvl + 1,
    className: `rank-ring ${TIER_CLASS[lvl]}`,
    style: {
      "--rr-dc1": dark, "--rr-dc2": light, "--rr-dc3": base,
      "--rr-dglow": `${fx.glow}px`, "--rr-dglowc": fx.glow ? `${base}73` : "transparent",
      "--rr-lc1": light, "--rr-lc2": mix(base, [0, 0, 0], 0.6), "--rr-lc3": mix(base, [0, 0, 0], 0.2),
      "--rr-lglow": `${Math.round(fx.glow * 0.55)}px`, "--rr-lglowc": fx.glow ? `${mix(base, [0, 0, 0], 0.6)}47` : "transparent",
      "--rr-speed": fx.speed,
    } as CSSProperties,
  };
}
