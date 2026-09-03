"use client";

// ============================================
// Kompakte Sammlungs-Kachel (Clash-Royale-artige Kartenübersicht)
// ============================================
// Dichtes Raster mit kleinen, klar unterscheidbaren Kacheln statt der vollen
// Flip-Karte pro Eintrag — Level-Rahmenfarbe (siehe LEVEL_BORDER) und
// Duplikat-Zähler sitzen direkt auf der Kachel. Antippen öffnet die volle
// Detailansicht (BattleCardView + Upgrade) in einem Modal.

import { Lock, ArrowUpCircle } from "lucide-react";
import { getClassConfig, LEVEL_BORDER, LEVEL_FRAME_IMAGE, type BattleCardData } from "./BattleCardView";
import { tableValueForLevel, type UpgradeTable } from "@/lib/battle-cards/upgrade-config";
import CoinIcon from "@/components/CoinIcon";

/** Ein-Zeilen-Upgrade-Hinweis direkt unter der Kachel — spart das Öffnen des
 *  Detail-Modals (DuplicateProgress dort), um zu sehen, ob ein Upgrade schon
 *  möglich ist bzw. wie viele Duplikate dafür noch fehlen. */
function CardUpgradeHint({
  card,
  level,
  duplicates,
  coins,
  duplicateThresholds,
  upgradeCosts,
}: {
  card: BattleCardData;
  level: number;
  duplicates: number;
  coins: number;
  duplicateThresholds: UpgradeTable;
  upgradeCosts: UpgradeTable;
}) {
  if (level >= 5) {
    return <p className="text-[9px] font-bold text-amber-400 text-center leading-none h-[11px]">★ Max. Stufe</p>;
  }

  const needed = tableValueForLevel(duplicateThresholds, card.rarity, level)!;
  const cost = tableValueForLevel(upgradeCosts, card.rarity, level)!;
  const hasEnoughDuplicates = duplicates >= needed;
  const hasEnoughCoins = coins >= cost;

  if (hasEnoughDuplicates && hasEnoughCoins) {
    return (
      <p className="flex items-center justify-center gap-0.5 text-[9px] font-bold text-emerald-400 leading-none h-[11px]">
        <ArrowUpCircle className="w-2.5 h-2.5 shrink-0" /> {cost}
        <CoinIcon size={8} />
      </p>
    );
  }
  if (hasEnoughDuplicates) {
    return (
      <p className="flex items-center justify-center gap-0.5 text-[9px] font-semibold text-gray-500 leading-none h-[11px]">
        {cost}
        <CoinIcon size={8} /> nötig
      </p>
    );
  }
  return (
    <p className="text-[9px] font-semibold text-gray-500 text-center leading-none h-[11px]">
      Noch {needed - duplicates}× nötig
    </p>
  );
}

export default function CardTile({
  card,
  level,
  duplicates,
  locked = false,
  isNew = false,
  coins,
  duplicateThresholds,
  upgradeCosts,
  onClick,
}: {
  card: BattleCardData;
  level: number;
  duplicates?: number;
  locked?: boolean;
  /** Kürzlich erhalten — zeigt ein "NEU"-Ribbon in der oberen linken Ecke. */
  isNew?: boolean;
  /** Nur bei eigenen (nicht locked) Karten gesetzt — zusammen mit duplicates/
   *  duplicateThresholds/upgradeCosts blendet das den Upgrade-Hinweis unter
   *  der Kachel ein (siehe CardUpgradeHint). */
  coins?: number;
  duplicateThresholds?: UpgradeTable;
  upgradeCosts?: UpgradeTable;
  onClick: () => void;
}) {
  const classConfig = getClassConfig(card.class);
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
          // Der Farbring entfällt für unlocked Karten — das Rahmen-Artwork (LEVEL_FRAME_IMAGE,
          // per screen-Blend darübergelegt) übernimmt jetzt die Rand-Darstellung.
          boxShadow: locked
            ? `0 0 0 1.5px ${borderColor}`
            : `0 4px 14px rgba(0,0,0,0.55)${level >= 5 ? `, 0 0 16px ${borderColor}66` : ""}`,
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={LEVEL_FRAME_IMAGE[level] ?? LEVEL_FRAME_IMAGE[1]}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "fill", mixBlendMode: "screen" }}
          />
        )}

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
      <p className={`font-battle text-[11px] truncate w-full text-center ${locked ? "text-gray-600" : "text-white"}`}>
        {card.name}
      </p>
      {!locked &&
        typeof duplicates === "number" &&
        coins !== undefined &&
        duplicateThresholds &&
        upgradeCosts && (
          <CardUpgradeHint
            card={card}
            level={level}
            duplicates={duplicates}
            coins={coins}
            duplicateThresholds={duplicateThresholds}
            upgradeCosts={upgradeCosts}
          />
        )}
    </button>
  );
}
