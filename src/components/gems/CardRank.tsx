"use client";

// ============================================
// OMA Gems — Rang einer Karte (siehe lib/gems/card-ranks.ts)
// ============================================
// RankBadge: kleine Plakette auf Karten-Kacheln (Rang, vor dem ersten Rang der Fortschritt x/5).
// RankMiniBar: schmaler Balken am Rand einer Kachel.
// RankProgress: Rang, Titel, Bonus und Fortschritt zum nächsten Rang in der Detailansicht.
// RankProgressCard: Karte im Kampfende-Screen mit animiertem Balken und Aufstiegs-Effekt.
// Fortschritt wird in XP gezählt (je gematchtem Gem der Klasse, siehe battleXp in card-ranks.ts).

import { motion, useReducedMotion } from "motion/react";
import {
  formatXp,
  MAX_RANK,
  nextRankProgress,
  RANK_THRESHOLDS,
  rankBonusPercent,
  rankForXp,
  rankTitle,
  withRankBonus,
} from "@/lib/gems/card-ranks";
import { getClassConfig, type UnitClassKey } from "@/lib/gems/class-config";
import { Star } from "@/components/icons";
import HeroFigure from "./HeroFigure";
import HeroBackdrop from "./HeroBackdrop";
import type { HeroLook } from "@/lib/gems/hero/look";

function ProgressBar({
  share,
  label,
  className = "h-1.5",
  barClassName = "bg-amber-400",
}: {
  share: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const percent = Math.round(share * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`rounded-full bg-white/[0.06] overflow-hidden ${className}`}
    >
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function RankBadge({ xp, className = "top-1 right-1" }: { xp: number; className?: string }) {
  const rank = rankForXp(xp);
  if (rank === 0) {
    // Noch kein Rang: dezent anzeigen, wie weit es bis Rang 1 ist („2/5“).
    const first = RANK_THRESHOLDS[0];
    return (
      <span
        className={`absolute z-[8] rounded-md bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-gray-400 tabular-nums pointer-events-none ${className}`}
        title={`Noch kein Rang — ${Math.floor(xp)} von ${first} XP bis Rang 1`}
        aria-label={`Noch kein Rang, ${Math.floor(xp)} von ${first} XP bis Rang 1`}
      >
        {Math.floor(xp)}/{first} XP
      </span>
    );
  }
  const bonus = rankBonusPercent(rank);
  const title = rankTitle(rank);
  return (
    <span
      className={`absolute z-[8] flex items-center gap-0.5 rounded-md bg-black/75 px-1 py-0.5 text-[11px] font-bold text-amber-300 tabular-nums pointer-events-none ${className}`}
      title={`Rang ${rank}${title ? ` · ${title}` : ""} · +${bonus} % Leben und Angriff`}
      aria-label={`Rang ${rank}${title ? `, ${title}` : ""}, plus ${bonus} Prozent Leben und Angriff`}
    >
      <Star className="w-2.5 h-2.5" fill="currentColor" />
      {rank}
    </span>
  );
}

/** Schmaler Fortschrittsbalken zum nächsten Rang am unteren Rand einer Karten-Kachel. */
export function RankMiniBar({ xp }: { xp: number }) {
  const progress = nextRankProgress(xp);
  const label = progress
    ? `Noch ${formatXp(progress.xpNeeded)} XP bis Rang ${progress.nextRank}`
    : "Höchster Rang erreicht";
  return (
    <div className="absolute inset-x-0 bottom-0 z-[9] pointer-events-none" title={label}>
      <ProgressBar share={progress?.share ?? 1} label={label} className="h-1 rounded-none bg-black/60" />
    </div>
  );
}

/** Rang, Titel, Bonus und Fortschritt in der Detailansicht. Mit `baseHp`/`baseAttack` auch die Werte
 *  mit dem aktuellen und dem nächsten Rang-Bonus. */
export function RankProgress({ xp, baseHp, baseAttack }: { xp: number; baseHp?: number; baseAttack?: number }) {
  const rank = rankForXp(xp);
  const progress = nextRankProgress(xp);
  const bonus = rankBonusPercent(rank);
  const title = rankTitle(rank);
  const label = progress
    ? `Noch ${formatXp(progress.xpNeeded)} XP bis Rang ${progress.nextRank}`
    : "Höchster Rang erreicht";
  const showStats = baseHp != null && baseAttack != null;
  const now = showStats ? withRankBonus({ baseHp, baseAttack }, rank) : null;
  const next = showStats && progress ? withRankBonus({ baseHp, baseAttack }, progress.nextRank) : null;
  return (
    <div className="w-full glass rounded-xl px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 font-semibold text-white">
          {Array.from({ length: MAX_RANK }, (_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < rank ? "text-amber-400" : "text-gray-700"}`} fill="currentColor" />
          ))}
          <span className="ml-1">Rang {rank}</span>
        </span>
        <span className="text-gray-400">{bonus > 0 ? `+${bonus} % Leben und Angriff` : "noch kein Bonus"}</span>
      </div>
      {title && (
        <p className="text-[11px] font-semibold text-amber-300">
          Titel: {title}
        </p>
      )}
      {now && (
        <p className="text-[11px] text-gray-300 tabular-nums">
          Leben {now.baseHp} · Angriff {now.baseAttack}
          {next && (
            <span className="text-gray-500">
              {" "}
              → Rang {progress!.nextRank}: {next.baseHp} / {next.baseAttack}
            </span>
          )}
        </p>
      )}
      {progress ? (
        <>
          <ProgressBar share={progress.share} label={label} />
          <p className="text-[11px] text-gray-500">
            {formatXp(xp)} XP · {label} (2 XP je gematchtem Gem der Klasse, Niederlage halb, makelloser Sieg +50 — in der Startaufstellung).
          </p>
        </>
      ) : (
        <p className="text-[11px] text-gray-500">Höchster Rang erreicht.</p>
      )}
    </div>
  );
}

/** Karte im Kampfende-Screen: Bild, XP-Gewinn und Balken, der von vorher nach nachher läuft.
 *  Bei einem Aufstieg füllt sich der Balken, die Karte leuchtet und der neue Rang springt auf. */
export function RankProgressCard({
  name,
  unitClass,
  imageUrl,
  heroLook,
  xpBefore,
  xpAfter,
  gems,
  flawless,
  delay = 0.7,
}: {
  name: string;
  unitClass: UnitClassKey;
  imageUrl: string | null;
  /** Cartoon-Held wie in Kampf und Sammlung; ohne ihn (alte Ergebnisse) das Bild bzw. Klassen-Icon. */
  heroLook?: HeroLook;
  xpBefore: number;
  xpAfter: number;
  /** Gematchte Gems der Klasse der Karte in diesem Kampf. */
  gems: number;
  flawless: boolean;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const rankBefore = rankForXp(xpBefore);
  const rankAfter = rankForXp(xpAfter);
  const leveledUp = rankAfter > rankBefore;
  const from = nextRankProgress(xpBefore);
  const to = nextRankProgress(xpAfter);
  const startShare = from?.share ?? 1;
  const endShare = leveledUp ? 1 : (to?.share ?? 1);
  const gained = xpAfter - xpBefore;
  const classConfig = getClassConfig(unitClass);
  const caption = leveledUp
    ? `${name} erreicht Rang ${rankAfter}`
    : to
      ? `${name}: noch ${formatXp(to.xpNeeded)} XP bis Rang ${to.nextRank}`
      : `${name}: höchster Rang`;
  return (
    <motion.li
      className="relative flex flex-col items-center gap-1 min-w-0"
      aria-label={`${caption}, ${formatXp(gained)} XP bei ${gems} gematchten Gems${flawless ? ", makelloser Sieg" : ""}`}
      animate={leveledUp && !reduceMotion ? { scale: [1, 1.08, 1] } : undefined}
      transition={{ duration: 0.5, delay: delay + 0.9 }}
    >
      <div
        className="relative w-full aspect-[3/4] overflow-hidden rounded-lg"
        style={{
          background: `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
          boxShadow: leveledUp
            ? "0 0 0 2px #fbbf24, 0 0 14px rgba(251,191,36,0.55)"
            : "0 0 0 1px rgba(255,255,255,0.12)",
        }}
      >
        {heroLook ? (
          <>
            <HeroBackdrop id={heroLook.backdrop} />
            <div className="absolute inset-x-0 top-1 bottom-2 flex items-center justify-center">
              <HeroFigure look={heroLook} title={name} className="h-full w-auto max-w-full" />
            </div>
          </>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={classConfig.icon} alt="" aria-hidden className="absolute inset-0 m-auto w-6 h-6 object-contain opacity-70" />
        )}
        <div
          role="progressbar"
          aria-label={caption}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(endShare * 100)}
          className="absolute inset-x-0 bottom-0 h-1 bg-black/60"
        >
          <motion.div
            className={`h-full ${leveledUp ? "bg-teal-300" : "bg-amber-400"}`}
            initial={{ width: `${Math.round(startShare * 100)}%` }}
            animate={{ width: `${Math.round(endShare * 100)}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.9, delay, ease: "easeOut" }}
          />
        </div>
        {leveledUp && (
          <motion.span
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-amber-300 font-black text-lg"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", delay: delay + 0.9, stiffness: 260, damping: 14 }}
            aria-hidden
          >
            <Star className="w-4 h-4 mr-0.5" fill="currentColor" />
            {rankAfter}
          </motion.span>
        )}
      </div>
      <span className="text-[10px] font-semibold text-gray-300 truncate max-w-full" aria-hidden>
        {name}
      </span>
      <span className={`text-[11px] font-bold tabular-nums ${flawless ? "text-teal-300" : "text-gray-400"}`} aria-hidden>
        +{formatXp(gained)} XP
        {flawless ? " ✦" : ""}
      </span>
      <span className="text-[10px] text-gray-500 tabular-nums -mt-0.5" aria-hidden>
        {gems} Gems
      </span>
    </motion.li>
  );
}
