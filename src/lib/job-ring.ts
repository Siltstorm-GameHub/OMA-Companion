import type { CSSProperties } from "react";
import { RANK_RING } from "@/lib/ranks";
import type { JobBadgeData } from "@/lib/job-badges";

/**
 * Ring um das Profilbild: Farbe = Beruf, Effekt = Ansehens-Stufe (1–4) im Beruf.
 * Wer keinen Job hat, bekommt den schlichten grauen Ring (früher unterster Rang).
 * Nutzt die bestehenden CSS-Klassen .rank-ring/.rr-t1–3/.rr-apex aus globals.css.
 */

import { JOB_ICONS } from "@/lib/job-icons";

/** Eine Quelle für die Berufsfarbe: dieselbe wie beim Job-Icon (lib/job-icons.ts). */
export function jobColor(jobKey: string): string | undefined {
  return JOB_ICONS[jobKey]?.color;
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

export function isEmployed(badge: JobBadgeData | null | undefined): badge is JobBadgeData {
  return !!badge && !!jobColor(badge.jobKey);
}

/** Stufe 4: Gold im Verlauf und (bei genug Platz) ein zusätzlicher goldener Innenring. */
export const GOLD = "#fbbf24";

export function getJobRing(badge: JobBadgeData | null | undefined): { className: string; style: CSSProperties; level: number } {
  if (!isEmployed(badge)) {
    const r = RANK_RING[1];
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
  const base = jobColor(badge.jobKey)!;
  const lvl = Math.min(4, Math.max(1, badge.level)) - 1;
  const fx = LEVEL_FX[lvl];
  const top = lvl === 3;
  const dark = mix(base, [0, 0, 0], 0.55);
  const light = top ? "#fde68a" : mix(base, [255, 255, 255], 0.55);
  const mid = top ? mix(base, [251, 191, 36], 0.75) : base;
  const glowRgb = top ? GOLD : base;
  return {
    level: lvl + 1,
    className: `rank-ring ${TIER_CLASS[lvl]}`,
    style: {
      "--rr-dc1": dark, "--rr-dc2": light, "--rr-dc3": mid,
      "--rr-dglow": `${fx.glow}px`, "--rr-dglowc": fx.glow ? `${glowRgb}73` : "transparent",
      "--rr-lc1": light, "--rr-lc2": mix(base, [0, 0, 0], 0.6), "--rr-lc3": top ? mix(base, [217, 119, 6], 0.5) : mix(base, [0, 0, 0], 0.2),
      "--rr-lglow": `${Math.round(fx.glow * 0.55)}px`, "--rr-lglowc": fx.glow ? `${mix(base, [0, 0, 0], 0.6)}47` : "transparent",
      "--rr-speed": fx.speed,
    } as CSSProperties,
  };
}
