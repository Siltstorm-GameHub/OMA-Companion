// ============================================
// OMA Quest — Stufen-Schmuck der Monster-Figuren (Canvas): Aura am Boden und Symbol über dem Kopf
// ============================================

import { TIER_META, type MonsterTier } from "@/lib/dnd/monster-tier";

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Pulsierende Aura unter den Füßen (vor dem Sprite zeichnen). Normal hat keine. */
export function drawTierAura(ctx: CanvasRenderingContext2D, tier: MonsterTier, cx: number, footY: number, clock: number) {
  const t = TIER_META[tier];
  if (!t.aura) return;
  const k = t.mapScale;
  const pulse = 0.5 + 0.22 * Math.sin(clock / 320);
  const y = footY - 2;
  const g = ctx.createRadialGradient(cx, y, 1, cx, y, 16 * k);
  g.addColorStop(0, rgba(t.aura, pulse));
  g.addColorStop(1, rgba(t.aura, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, y, 16 * k, 7 * k, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Symbol über dem Kopf: Krone (Elite), roter Schädel (Boss), Krone + Schädel (Raid). */
export function drawTierIcon(ctx: CanvasRenderingContext2D, tier: MonsterTier, cx: number, topY: number, clock: number) {
  const t = TIER_META[tier];
  if (!t.icon) return;
  ctx.save();
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = t.color;
  ctx.shadowBlur = 5;
  ctx.fillText(t.icon, cx, topY - 1 + Math.sin(clock / 400) * 0.8);
  ctx.restore();
}
