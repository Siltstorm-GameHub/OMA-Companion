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
import HeroFigure from "./HeroFigure";
import HeroBackdrop from "./HeroBackdrop";
import { RankBadge, RankMiniBar } from "./CardRank";
import { rankForXp, rankFrameColor } from "@/lib/gems/card-ranks";

export default function CardTile({
  card,
  locked = false,
  isNew = false,
  xp,
  selected = false,
  selectionIndex,
  dimmed = false,
  ariaLabel,
  onClick,
}: {
  /** XP aus der Startaufstellung — zeigt Rang und Fortschritt (nur eigene Karten). */
  xp?: number;
  card: BattleCardData;
  locked?: boolean;
  /** Kürzlich erhalten — zeigt ein "NEU"-Ribbon in der oberen linken Ecke. */
  isNew?: boolean;
  /** Auswahl-Modus (Startaufstellung): markiert die Kachel mit Rahmen und Reihenfolge-Nummer. */
  selected?: boolean;
  selectionIndex?: number;
  /** Abgeblendet, z. B. wenn keine weitere Karte mehr gewählt werden kann. */
  dimmed?: boolean;
  /** Ersetzt das Standard-Label „Details ansehen“ (im Auswahl-Modus: „… auswählen“). */
  ariaLabel?: string;
  onClick: () => void;
}) {
  const classConfig = getClassConfig(card.class);
  // Meilenstein-Ränge (Veteran ab 3, Meister ab 5) bekommen einen eigenen Rahmen.
  const rankFrame = !locked && xp != null ? rankFrameColor(rankForXp(xp)) : null;
  const borderColor = locked ? "rgba(255,255,255,0.1)" : (rankFrame ?? LEVEL_BORDER[1]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-full text-left"
      aria-label={ariaLabel ?? `${card.name} — Details ansehen`}
      aria-pressed={ariaLabel ? selected : undefined}
    >
      <div className={`relative w-full transition-opacity ${dimmed ? "opacity-45" : ""}`}>
        {selected && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-0.5 z-[11] rounded-lg ring-2 ring-teal-400 shadow-[0_0_14px_rgba(20,184,166,0.55)]"
            />
            {selectionIndex != null && (
              <span
                aria-hidden
                className="pointer-events-none absolute -top-1.5 -left-1.5 z-[12] flex h-5 w-5 items-center justify-center rounded-full bg-teal-400 text-[11px] font-black text-black"
              >
                {selectionIndex}
              </span>
            )}
          </>
        )}
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
        {card.heroLook && <HeroBackdrop id={card.heroLook.backdrop} />}
        <div className={`absolute inset-x-0 bottom-12 flex items-center justify-center ${isCommunity(card.rarity) ? "top-6" : "top-3"}`}>
          {card.heroLook ? (
            <HeroFigure look={card.heroLook} title={card.name} className="h-full w-auto max-w-full" />
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
        {!locked && xp != null && <RankBadge xp={xp} />}
        <CardPlate card={card} locked={locked} />
        {!locked && xp != null && <RankMiniBar xp={xp} />}
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
