import type { CSSProperties } from "react";
import type { FrameCosmetic } from "./catalog";

/**
 * Rahmen (Ring ums Profilbild) → CSS-Klassen + Variablen für RankRing.css.
 * Ohne gekauften Rahmen gibt es den schlichten grauen Ring.
 */

function mix(hex: string, other: [number, number, number], t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const m = c.map((v, i) => Math.round(v + (other[i] - v) * t));
  return `#${m.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

const NEUTRAL: CSSProperties = {
  "--rr-dc1": "#3f3f46", "--rr-dc2": "#a1a1aa", "--rr-dc3": "#52525b", "--rr-dglow": "0px", "--rr-dglowc": "transparent",
  "--rr-lc1": "#a1a1aa", "--rr-lc2": "#3f3f46", "--rr-lc3": "#71717a", "--rr-lglow": "0px", "--rr-lglowc": "transparent",
  "--rr-speed": "12s",
} as CSSProperties;

export function getFrameRing(frame: FrameCosmetic | undefined): { className: string; style: CSSProperties } {
  if (!frame) return { className: "rank-ring rr-t1", style: NEUTRAL };
  const [dark, light, base] = frame.colors;
  const tierClass = `rr-t${frame.tier}${frame.pulse ? " rr-apex" : ""}`;
  return {
    className: `rank-ring ${tierClass}`,
    style: {
      "--rr-dc1": dark, "--rr-dc2": light, "--rr-dc3": base,
      "--rr-dglow": `${frame.glow}px`, "--rr-dglowc": frame.glow ? `${base}73` : "transparent",
      "--rr-lc1": mix(base, [255, 255, 255], 0.55), "--rr-lc2": mix(base, [0, 0, 0], 0.6), "--rr-lc3": mix(base, [0, 0, 0], 0.2),
      "--rr-lglow": `${Math.round(frame.glow * 0.55)}px`, "--rr-lglowc": frame.glow ? `${mix(base, [0, 0, 0], 0.6)}47` : "transparent",
      "--rr-speed": frame.speed,
    } as CSSProperties,
  };
}
