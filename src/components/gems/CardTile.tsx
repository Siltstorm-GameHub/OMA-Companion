"use client";

// ============================================
// Kompakte Sammlungs-Kachel (Clash-Royale-artige Kartenübersicht)
// ============================================
// Dichtes Raster mit kleinen, klar unterscheidbaren Kacheln statt der vollen
// Flip-Karte pro Eintrag. Antippen öffnet die volle Detailansicht
// (BattleCardView) in einem Modal.

import { Lock } from "@/components/icons";
import { getClassConfig, LEVEL_BORDER, type BattleCardData } from "./BattleCardView";
import { CardPlate, CommunityRibbon, isCommunity, rarityFrame } from "./CardPlate";
import TeCharacter from "@/components/te-character/TeCharacter";
import CardBackdrop from "./CardBackdrop";
import { RankBadge } from "./CardRank";
import { TE_CROP_FIGURE, poseAnim } from "@/lib/te-character";

export default function CardTile({
  card,
  locked = false,
  isNew = false,
  winsInLineup,
  onClick,
}: {
  /** Siege in der Startaufstellung — zeigt den Rang (nur eigene Karten). */
  winsInLineup?: number;
  card: BattleCardData;
  locked?: boolean;
  /** Kürzlich erhalten — zeigt ein "NEU"-Ribbon in der oberen linken Ecke. */
  isNew?: boolean;
  onClick: () => void;
}) {
  const classConfig = getClassConfig(card.class);
  const borderColor = locked ? "rgba(255,255,255,0.1)" : LEVEL_BORDER[1];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-full text-left"
      aria-label={`${card.name} — Details ansehen`}
    >
      <div className="relative w-full">
      <div
        className="card-cut-sm relative w-full aspect-[3/4] overflow-hidden"
        style={{
          background: locked
            ? "rgba(255,255,255,0.03)"
            : `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
          boxShadow: rarityFrame(card.rarity, borderColor, { locked }),
          opacity: locked ? 0.5 : 1,
          filter: locked ? "grayscale(0.9)" : undefined,
        }}
      >
        {card.teCharacter?.bg && <div className={`absolute inset-x-0 bottom-12 overflow-hidden ${isCommunity(card.rarity) ? "top-6" : "top-3"}`}><CardBackdrop config={card.teCharacter} /></div>}
        <div className={`absolute inset-x-0 bottom-12 flex items-center justify-center ${isCommunity(card.rarity) ? "top-6" : "top-3"}`}>
          {card.teCharacter ? (
            <TeCharacter config={card.teCharacter} anim={poseAnim(card.teCharacter)} dir="down" crop={TE_CROP_FIGURE} scale={8} className="h-full w-auto max-w-full object-contain" title={card.name} />
          ) : card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : locked ? (
            <Lock className="w-6 h-6 opacity-50" />
          ) : (
            <img src={classConfig.icon} alt="" aria-hidden className="w-8 h-8 object-contain" style={{ opacity: 0.65 }} />
          )}
        </div>

        {/* Namensschild (Name, Klasse) und Community-Band */}
        {isCommunity(card.rarity) && <CommunityRibbon />}
        {!locked && winsInLineup != null && <RankBadge wins={winsInLineup} />}
        <CardPlate card={card} locked={locked} />
        {!locked && isNew && (
          <span
            className="absolute -left-6 top-2.5 z-[7] w-20 text-center text-[8px] font-black uppercase tracking-widest text-black py-0.5 shadow-md"
            style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)", transform: "rotate(-45deg)" }}
          >
            Neu
          </span>
        )}
      </div>
      </div>
    </button>
  );
}
