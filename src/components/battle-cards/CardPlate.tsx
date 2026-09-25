// ============================================
// Kartenschild: Name, Klasse und Level gut lesbar + deutliche Unterscheidung Community- / Standard-Karte
// ============================================
// Community-Karten (Mitglieder) tragen ein türkis-goldenes Band „COMMUNITY", einen leuchtenden Rahmen und ein getöntes Namensschild;
// Standard-Karten bleiben sachlich (grauer Stahlrahmen, dunkles Schild).

import { getClassConfig, type BattleCardData } from "./BattleCardView";

type Rarity = BattleCardData["rarity"];

export const isCommunity = (rarity: Rarity): boolean => rarity === "COMMUNITY";

/** Rahmen der Karte: Community leuchtet türkis/gold, Standard bleibt in der Stufenfarbe. */
export function rarityFrame(rarity: Rarity, levelColor: string, opts: { locked?: boolean; glow?: number } = {}): string {
  if (opts.locked) return `0 0 0 1.5px ${levelColor}`;
  const g = opts.glow ?? 8;
  return isCommunity(rarity)
    ? `0 0 0 2.5px #22d3ee, 0 0 0 4px #f5c451, 0 4px 14px rgba(0,0,0,0.55), 0 0 ${g + 10}px #22d3ee88`
    : `0 0 0 1.5px ${levelColor}, 0 4px 14px rgba(0,0,0,0.55), 0 0 ${g}px ${levelColor}66`;
}

/** Band oben auf der Karte: nur bei Community-Karten. */
export function CommunityRibbon({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`absolute inset-x-0 top-0 z-[8] flex items-center justify-center gap-1 font-black uppercase tracking-widest text-[#0b1a24] pointer-events-none ${compact ? "text-[7px] py-px" : "text-[8px] py-0.5"}`}
      style={{ background: "linear-gradient(90deg, #22d3ee, #f5c451)" }}
    >
      <span aria-hidden>★</span>Community
    </div>
  );
}

/** Namensschild unten auf der Karte: Name groß, darunter Klasse (mit Symbol) und Level. */
export function CardPlate({ card, level, levelColor, locked = false, compact = false }: { card: Pick<BattleCardData, "name" | "class" | "rarity">; level: number; levelColor: string; locked?: boolean; compact?: boolean }) {
  const cls = getClassConfig(card.class);
  const community = isCommunity(card.rarity);
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-[6] text-center pointer-events-none ${compact ? "px-1 pb-1 pt-4" : "px-2 pb-1.5 pt-6"}`}
      style={{ background: community ? "linear-gradient(180deg, transparent, rgba(8,40,52,0.92) 45%, rgba(40,30,8,0.95))" : "linear-gradient(180deg, transparent, rgba(6,8,20,0.9) 50%)" }}
    >
      <p className={`font-battle leading-tight truncate ${compact ? "text-[11px]" : "text-[12px]"} ${locked ? "text-gray-500" : community ? "text-amber-100" : "text-white"}`} style={{ textShadow: "0 1px 2px #000" }}>{card.name}</p>
      <div className={`flex items-center justify-center gap-1.5 ${compact ? "mt-0.5" : "mt-1"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cls.icon} alt="" aria-hidden className={compact ? "w-3 h-3 object-contain" : "w-3.5 h-3.5 object-contain"} />
        <span className={`font-bold uppercase tracking-wide truncate ${compact ? "text-[8px]" : "text-[9px]"}`} style={{ color: cls.color }}>{cls.label}</span>
        {!locked && <span className={`font-black rounded px-1 bg-black/70 ${compact ? "text-[8px]" : "text-[9px]"}`} style={{ color: levelColor }}>Lv.{level}</span>}
      </div>
    </div>
  );
}
