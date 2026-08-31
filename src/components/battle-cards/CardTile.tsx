"use client";

// ============================================
// Kompakte Sammlungs-Kachel (Clash-Royale-artige Kartenübersicht)
// ============================================
// Dichtes Raster mit kleinen, klar unterscheidbaren Kacheln statt der vollen
// Flip-Karte pro Eintrag — Level-Rahmenfarbe (siehe LEVEL_BORDER) und
// Duplikat-Zähler sitzen direkt auf der Kachel. Antippen öffnet die volle
// Detailansicht (BattleCardView + Upgrade) in einem Modal.

import { Lock } from "lucide-react";
import { CLASS_CONFIG, LEVEL_BORDER, type BattleCardData } from "./BattleCardView";

export default function CardTile({
  card,
  level,
  duplicates,
  locked = false,
  isNew = false,
  onClick,
}: {
  card: BattleCardData;
  level: number;
  duplicates?: number;
  locked?: boolean;
  /** Kürzlich erhalten — zeigt ein "NEU"-Ribbon in der oberen linken Ecke. */
  isNew?: boolean;
  onClick: () => void;
}) {
  const classConfig = CLASS_CONFIG[card.class];
  const ClassIcon = classConfig.icon;
  const borderColor = locked ? "rgba(255,255,255,0.1)" : LEVEL_BORDER[level] ?? LEVEL_BORDER[1];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-full text-left"
      aria-label={`${card.name} — Details ansehen`}
    >
      <div
        className="card-cut-sm relative w-full aspect-[3/4] overflow-hidden"
        style={{
          background: locked
            ? "rgba(255,255,255,0.03)"
            : `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
          boxShadow: locked
            ? `0 0 0 1.5px ${borderColor}`
            : `0 0 0 2px ${borderColor}, 0 4px 14px rgba(0,0,0,0.55)${level >= 5 ? `, 0 0 16px ${borderColor}66` : ""}`,
          opacity: locked ? 0.5 : 1,
          filter: locked ? "grayscale(0.9)" : undefined,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : locked ? (
            <Lock className="w-6 h-6 text-gray-600" />
          ) : (
            <ClassIcon className="w-8 h-8" style={{ color: classConfig.color, opacity: 0.55 }} />
          )}
        </div>

        {!locked && (
          <span
            className="absolute bottom-1 left-1 text-[9px] font-black leading-none px-1.5 py-1 rounded-md bg-black/70 backdrop-blur-sm"
            style={{ color: borderColor }}
          >
            Lv.{level}
          </span>
        )}
        {!locked && typeof duplicates === "number" && (
          <span className="absolute top-1 right-1 text-[9px] font-bold leading-none px-1.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-violet-300">
            ×{duplicates}
          </span>
        )}
        {!locked && isNew && (
          <span
            className="absolute -left-6 top-2.5 w-20 text-center text-[8px] font-black uppercase tracking-widest text-black py-0.5 shadow-md"
            style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)", transform: "rotate(-45deg)" }}
          >
            Neu
          </span>
        )}
      </div>
      <p className={`text-[11px] font-semibold truncate w-full text-center ${locked ? "text-gray-600" : "text-white"}`}>
        {card.name}
      </p>
    </button>
  );
}
