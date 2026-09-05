"use client";

// ============================================
// Kompakte Sammlungs-Kachel (Clash-Royale-artige Kartenübersicht)
// ============================================
// Dichtes Raster mit kleinen, klar unterscheidbaren Kacheln statt der vollen
// Flip-Karte pro Eintrag — Level-Rahmenfarbe (siehe LEVEL_BORDER) und
// Duplikat-Zähler sitzen direkt auf der Kachel. Antippen öffnet die volle
// Detailansicht (BattleCardView + Upgrade) in einem Modal.

import { Lock, ArrowUp, Zap } from "lucide-react";
import { getClassConfig, LEVEL_BORDER, LEVEL_FRAME_IMAGE, type BattleCardData } from "./BattleCardView";
import { tableValueForLevel, type UpgradeTable } from "@/lib/battle-cards/upgrade-config";
import CoinIcon from "@/components/CoinIcon";

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
        <ArrowUp className="w-3 h-3 shrink-0" strokeWidth={3} />
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
      <Zap className="w-2.5 h-2.5 shrink-0 relative" style={{ color: hasEnoughDuplicates ? "#fef3c7" : "#bfdbfe" }} />
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
  const ClassIcon = classConfig.icon;
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
      <p
        className={`font-battle text-[11px] truncate w-full text-center mt-2 ${locked ? "text-gray-600" : "text-white"}`}
      >
        {card.name}
      </p>
    </button>
  );
}
