"use client";

// ============================================
// Kompakte Sammlungs-Kachel (Clash-Royale-artige Kartenübersicht)
// ============================================
// Dichtes Raster mit kleinen, klar unterscheidbaren Kacheln statt der vollen
// Flip-Karte pro Eintrag — Level-Rahmenfarbe (siehe LEVEL_BORDER) und
// Duplikat-Zähler sitzen direkt auf der Kachel. Antippen öffnet die volle
// Detailansicht (BattleCardView + Upgrade) in einem Modal.

import { getClassConfig, LEVEL_BORDER, MOBA_CARD_FRAME_IMAGE, type BattleCardData } from "./BattleCardView";
import { tableValueForLevel, type UpgradeTable } from "@/lib/battle-cards/upgrade-config";
import CoinIcon from "@/components/CoinIcon";
import MobaIcon from "./MobaIcon";
import TeCharacter from "@/components/te-character/TeCharacter";
import { TE_CROP_FIGURE } from "@/lib/te-character";

/** Clash-Royale-artiges Upgrade-Badge — ragt über den unteren Rand des
 *  Kartenbilds statt als separate Textzeile unter der Kachel zu stehen (siehe
 *  CardTile). Grün + Pulsieren, sobald ein Upgrade sofort möglich ist (Duplikate
 *  UND Münzen reichen); sonst ein blauer "Tropfen"-Badge mit dem
 *  Duplikat-Fortschritt, wie die Elixier-/Fortschritts-Badges in Clash Royale. */
function CardUpgradeBadge({
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
    return (
      <span
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 text-[9px] font-black leading-none px-2 py-1 rounded-full text-black whitespace-nowrap"
        style={{
          background: "linear-gradient(180deg, #fde68a, #f59e0b)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        ★ MAX
      </span>
    );
  }

  const needed = tableValueForLevel(duplicateThresholds, card.rarity, level)!;
  const cost = tableValueForLevel(upgradeCosts, card.rarity, level)!;
  const hasEnoughDuplicates = duplicates >= needed;
  const hasEnoughCoins = coins >= cost;
  const pct = Math.min(100, Math.round((duplicates / needed) * 100));

  if (hasEnoughDuplicates && hasEnoughCoins) {
    return (
      <span
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 text-[10px] font-black leading-none px-2.5 py-1 rounded-full text-black whitespace-nowrap animate-pulse"
        style={{
          background: "linear-gradient(180deg, #6ee7b7, #10b981)",
          boxShadow: "0 0 10px rgba(16,185,129,0.7), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <MobaIcon name="chevronUp" className="w-3 h-3 shrink-0" />
        {cost}
        <CoinIcon size={9} />
      </span>
    );
  }

  // Nicht bereit: blaues "Tropfen"-Badge mit Fortschrittsring-Optik (Balken im
  // Hintergrund des Badges statt separatem Balken) — Duplikate reichen zwar
  // ggf. schon (dann grau/Münzen fehlen), sonst zeigt es den X/Y-Fortschritt.
  return (
    <span
      className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 text-[9px] font-bold leading-none px-2 py-1 rounded-full text-white whitespace-nowrap overflow-hidden"
      style={{
        background: "#1e293b",
        boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <span
        className="absolute inset-y-0 left-0 transition-all"
        style={{ width: `${pct}%`, background: hasEnoughDuplicates ? "#f59e0b" : "#3b82f6" }}
      />
      <MobaIcon name="attack" className="w-2.5 h-2.5 shrink-0 relative" />
      <span className="relative inline-flex items-center gap-0.5">
        {hasEnoughDuplicates ? (
          <>
            {cost}
            <CoinIcon size={8} />
          </>
        ) : (
          `${duplicates}/${needed}`
        )}
      </span>
    </span>
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
  const borderColor = locked ? "rgba(255,255,255,0.1)" : LEVEL_BORDER[level] ?? LEVEL_BORDER[1];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-full text-left"
      aria-label={`${card.name} — Details ansehen`}
    >
      {/* Äußerer Wrapper OHNE overflow-hidden — das Upgrade-Badge hängt bewusst
          über den unteren Kartenrand hinaus (Clash-Royale-Optik) und würde vom
          card-cut-sm-Zuschnitt der Kunst-Box sonst abgeschnitten. */}
      <div className="relative w-full">
      <div
        className="card-cut-sm relative w-full aspect-[3/4] overflow-hidden"
        style={{
          background: locked
            ? "rgba(255,255,255,0.03)"
            : `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
          // MOBA-Skin: ein Rahmen-Asset für alle Stufen (s. BattleCardView) — die
          // Rarität zeigt sich über einen stufenfarbigen Glow statt über je ein
          // eigenes Rahmenbild pro Stufe.
          boxShadow: locked
            ? `0 0 0 1.5px ${borderColor}`
            : `0 4px 14px rgba(0,0,0,0.55), 0 0 ${level >= 5 ? 16 : 8}px ${borderColor}66`,
          opacity: locked ? 0.5 : 1,
          filter: locked ? "grayscale(0.9)" : undefined,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {card.rarity === "STANDARD" && card.teCharacter ? (
            <TeCharacter config={card.teCharacter} anim="idle" dir="down" crop={TE_CROP_FIGURE} scale={3} className="max-h-full w-auto" title={card.name} />
          ) : card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : locked ? (
            <MobaIcon name="lock" className="w-6 h-6 opacity-50" />
          ) : (
            <img src={classConfig.icon} alt="" aria-hidden className="w-8 h-8 object-contain" style={{ opacity: 0.65 }} />
          )}
        </div>

        {!locked && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={MOBA_CARD_FRAME_IMAGE}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "fill" }}
          />
        )}

        {/* Namensschild als Teil der Karte selbst (Verlaufs-Banner über dem
            unteren Artwork-Rand) statt separater Textzeile darunter — die
            Karte soll wie EIN Objekt wirken, nicht wie Bild + schwebender
            Titel. Level-Chip liegt darüber, damit beides nebeneinander lesbar
            bleibt. */}
        <div className="absolute inset-x-0 bottom-0 z-[6] pt-5 pb-1 px-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
          <p className={`font-battle text-[10px] leading-tight truncate text-center ${locked ? "text-gray-500" : "text-white"}`}>
            {card.name}
          </p>
        </div>
        {!locked && (
          <span
            className="absolute bottom-1 left-1 z-[7] text-[9px] font-black leading-none px-1.5 py-1 rounded-md bg-black/70 backdrop-blur-sm"
            style={{ color: borderColor }}
          >
            Lv.{level}
          </span>
        )}
        {!locked && typeof duplicates === "number" && (
          <span className="absolute top-1 right-1 z-[7] text-[9px] font-bold leading-none px-1.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-violet-300">
            ×{duplicates}
          </span>
        )}
        {!locked && isNew && (
          <span
            className="absolute -left-6 top-2.5 z-[7] w-20 text-center text-[8px] font-black uppercase tracking-widest text-black py-0.5 shadow-md"
            style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)", transform: "rotate(-45deg)" }}
          >
            Neu
          </span>
        )}
      </div>
      {!locked &&
        typeof duplicates === "number" &&
        coins !== undefined &&
        duplicateThresholds &&
        upgradeCosts && (
          <CardUpgradeBadge
            card={card}
            level={level}
            duplicates={duplicates}
            coins={coins}
            duplicateThresholds={duplicateThresholds}
            upgradeCosts={upgradeCosts}
          />
        )}
      </div>
    </button>
  );
}
