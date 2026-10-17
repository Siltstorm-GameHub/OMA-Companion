"use client";

// ============================================
// Interaktiver Kampf — Vollbild-Zug-für-Zug-Steuerung
// ============================================
// Eigenes Vollbild-Fenster (fixed inset-0) im selben Arena-Look wie
// BattleScreen.tsx (die reine Wiedergabekomponente für fertige Replays).
// Zeigt den aktuellen LiveBattle-Zustand (Polling) im OMA-Gems-Layout
// (Empires-&-Puzzles-Stil): Gegner oben, Match-3-Brett in der Mitte, eigene
// Helden darunter. Jeder Zug auf dem Brett lässt alle eigenen Helden gemeinsam
// angreifen; voll aufgeladene Helden lösen ihr Ultimate per Klick aus.
//
// Reine Präsentations-/Steuerungskomponente — die eigentliche Kampflogik
// läuft ausschließlich serverseitig (lib/gems/live-battle.ts).

import BattleFigure from "@/components/te-character/BattleFigure";
import type { TeCharacterConfig } from "@/lib/te-character";
import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { BellOff, ChevronLeft, Loader2, Swords, Volume2 } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getClassConfig, LEVEL_BORDER } from "./BattleCardView";
import BoardMatch3 from "./BoardMatch3";
import { enemySlotForColumn, pickEnemyForColumn, type BoardGrid, type SpecialGrid, type SwapMove } from "@/lib/battle-engine/board-match3";
import { BOARD_COLS } from "@/lib/battle-engine/constants";
import type { ActiveStatModifier, TeamId, UnitClass } from "@/lib/battle-engine/types";
import {
  isSoundMuted,
  playDamageSoundFor,
  playDefeatSound,
  playHealSound,
  playShieldSound,
  playUltimateSoundFor,
  playVictorySound,
  setSoundMuted,
} from "@/lib/gems/sound";
import ErrorNotice from "./ErrorNotice";
import { BRAND_LOGO } from "@/lib/brand";
import { CAMPAIGN_CHAPTER_BACKGROUND } from "@/lib/gems/campaign-levels";
import UltimateCutsceneOverlay from "./UltimateCutsceneOverlay";
import GemsResultScreen, { type GemsReward } from "./GemsResultScreen";

/** Kampf-Hintergrund: die klassische Arena (arena-bg.jpg) für Turniere —
 *  Kampagnen-Kämpfe (mode "CAMPAIGN_...") zeigen
 *  stattdessen das zum aktuellen Kapitel passende Hintergrundbild (aktuell
 *  nur Kapitel 1, siehe CAMPAIGN_CHAPTER_BACKGROUND), statt der generischen
 *  Arena — das ist der eigene Look der Kampagne. */
function getArenaBackgroundStyle(mode: string | undefined): CSSProperties {
  const backgroundUrl = mode?.startsWith("CAMPAIGN_") ? CAMPAIGN_CHAPTER_BACKGROUND : "/gems-assets/arena-bg.jpg";
  return {
    backgroundColor: "#04061a",
    backgroundImage: [
      "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(239,68,68,0.18), transparent 70%)",
      "radial-gradient(ellipse 70% 45% at 50% 92%, rgba(20,184,166,0.18), transparent 70%)",
      "linear-gradient(180deg, rgba(13,15,19,0.55) 0%, rgba(13,15,19,0.25) 35%, rgba(13,15,19,0.25) 65%, rgba(13,15,19,0.55) 100%)",
      `url(${backgroundUrl})`,
    ].join(", "),
    backgroundSize: "auto, auto, auto, cover",
    backgroundPosition: "center",
  };
}

interface LiveUnit {
  instanceId: string;
  teamId: TeamId;
  name: string;
  class: UnitClass;
  level: number;
  currentHp: number;
  maxHp: number;
  rage: number;
  ultimateCost: number;
  isAlive: boolean;
  imageUrl?: string | null;
  avatarBadgeUrl?: string | null;
  teCharacter?: TeCharacterConfig | null;
  statModifiers: ActiveStatModifier[];
}

/** Ein neu eingetroffener Kampfeffekt (Schaden/Heilung/Schild) für die
 *  Flug-Zahlen + den Treffer-Flash auf der betroffenen Heldenkarte — abgeleitet
 *  aus neuen Log-Einträgen zwischen zwei Snapshots (siehe logLength unten). */
interface FloatingEffect {
  id: string;
  unitId: string;
  kind: "damage" | "crit" | "heal" | "shield";
  text: string;
  /** Nur bei OMA Gems: gesetzt, wenn dieser Angriff aus einem Match-3-Match mit
   *  mehr als 3 Steinen entstanden ist (siehe matchBonusPercent im Log-Eintrag) —
   *  zeigt einen zusätzlichen "Match-Bonus"-Hinweis an der Flug-Zahl an. */
  bonusPercent?: number;
  /** Klasse des AUSFÜHRENDEN Helden (nicht des Ziels) — steuert Ring-Farbe und
   *  Sound-Archetyp (Tank-Wucht vs. DPS-Schnitt), siehe UnitCard unten und
   *  playDamageSoundFor in lib/gems/sound.ts. */
  casterClass?: UnitClass;
}

interface LiveSnapshot {
  id: string;
  mode: string;
  status: "active" | "finished";
  round: number;
  units: LiveUnit[];
  upcoming: string[];
  recentLog: { type: string; [key: string]: unknown }[];
  /** Gesamtzahl aller Log-Einträge seit Kampfbeginn — dient dem Client dazu,
   *  zwischen zwei Snapshots zuverlässig NEUE Einträge zu erkennen (siehe
   *  FloatingEffect-Spawning in LiveBattleView). */
  logLength: number;
  awaiting: {
    unitId: string;
    teamId: TeamId;
    controlledByPlayerId: string;
    board: { grid: BoardGrid; specials: SpecialGrid; moveBudget: number; appliedSwaps: SwapMove[] } | null;
  } | null;
  playerAId: string;
  resultBattleId: string | null;
  winner: "A" | "B" | "DRAW" | null;
  /** Nur bei einem gewonnenen Kampagnen-Kampf gesetzt — Sterne-Ergebnis für die
   *  Animation im Kampfende-Screen (siehe computeStars in campaign.ts). */
  campaignResult: { levelId: string; stars: 1 | 2 | 3; starsGained: number; coinsAwarded: number } | null;
}

function hpBarColor(pct: number): string {
  if (pct > 0.5) return "#10b981";
  if (pct > 0.2) return "#f59e0b";
  return "#ef4444";
}

/** Belohnung für den OMA-Gems-Ergebnisbildschirm (siehe GemsResultScreen) —
 *  Kampagne zeigt Sterne, Turniere (Belohnung erst bei Turnierende) keinen Block. */
function computeGemsReward(snapshot: LiveSnapshot): GemsReward {
  if (snapshot.campaignResult) {
    return {
      kind: "stars",
      stars: snapshot.campaignResult.stars,
      starsGained: snapshot.campaignResult.starsGained,
      coinsAwarded: snapshot.campaignResult.coinsAwarded,
    };
  }
  return { kind: "none" };
}

function describeLogEntry(entry: LiveSnapshot["recentLog"][number], nameOf: (id: string) => string): string | null {
  switch (entry.type) {
    case "action":
      return `${nameOf(entry.actorId as string)} setzt ${entry.skillName as string} ein.`;
    case "damage": {
      const bonus = entry.matchBonusPercent != null ? `, +${entry.matchBonusPercent as number}% Match-Bonus` : "";
      return `${nameOf(entry.targetId as string)} erleidet ${entry.amount as number} Schaden${entry.isCrit ? " (kritisch!)" : ""}${bonus}.`;
    }
    case "heal": {
      const bonus = entry.matchBonusPercent != null ? `, +${entry.matchBonusPercent as number}% Match-Bonus` : "";
      return `${nameOf(entry.targetId as string)} wird um ${entry.amount as number} HP geheilt${bonus}.`;
    }
    case "death":
      return `${nameOf(entry.unitId as string)} wurde besiegt.`;
    // "roundStart" erscheint nicht mehr im Text-Log — die Runde steht jetzt
    // auffällig oben rechts (siehe Kopfzeile), eine zusätzliche "— Runde X —"-
    // Zeile im ohnehin knappen Log-Bereich war redundant.
    default:
      return null;
  }
}

const EFFECT_COLOR: Record<FloatingEffect["kind"], string> = {
  damage: "#f87171",
  crit: "#fb923c",
  heal: "#34d399",
  shield: "#7dd3fc",
};

/** Ein Lichtstrahl von zerstörten OMA-Gems-Steinen zu einem Helden der
 *  entsprechenden Klasse (siehe handleGemsDestroyed in LiveBattleBody).
 *  Koordinaten sind Viewport-relativ (getBoundingClientRect), passend zur
 *  `position: fixed`-Darstellung in GemBeamOverlay. */
interface GemBeam {
  id: string;
  cls: UnitClass;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

const GEM_BEAM_DURATION_MS = 420;
/** Dauer des Einschlag-Effekts (Ring + Funken) nach der Ankunft des Geschosses. */
const GEM_IMPACT_MS = 380;

function GemBeamOverlay({ beams }: { beams: GemBeam[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }}>
      <AnimatePresence>
        {beams.map((beam) => {
          const color = getClassConfig(beam.cls).color;
          const flight = GEM_BEAM_DURATION_MS / 1000;
          return (
            <motion.div key={beam.id} exit={{ opacity: 0 }}>
              {/* Geschoss mit Schweif — fährt senkrecht nach oben. */}
              <motion.div
                initial={{ left: beam.fromX, top: beam.fromY, opacity: 0, scale: 0.4 }}
                animate={{ left: beam.toX, top: beam.toY, opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.7] }}
                transition={{ duration: flight, ease: "easeIn", times: [0, 0.15, 0.85, 1] }}
                className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 12px 4px ${color}, 0 0 24px 8px ${color}88` }}
              >
                <span
                  className="absolute left-1/2 top-full -translate-x-1/2 w-1.5 h-8 rounded-full"
                  style={{ background: `linear-gradient(to bottom, ${color}, transparent)`, opacity: 0.85 }}
                />
              </motion.div>
              {/* Einschlag: Lichtblitz + expandierender Ring an der Ankunftsstelle. */}
              <motion.div
                className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full"
                style={{ left: beam.toX, top: beam.toY, background: `radial-gradient(circle, #fff 0%, ${color} 40%, transparent 70%)` }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0], scale: [0.2, 1.1, 1.5] }}
                transition={{ delay: flight, duration: GEM_IMPACT_MS / 1000, ease: "easeOut" }}
              />
              <motion.div
                className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full"
                style={{ left: beam.toX, top: beam.toY, border: `2px solid ${color}`, boxShadow: `0 0 10px 2px ${color}` }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.2, 2.2] }}
                transition={{ delay: flight, duration: GEM_IMPACT_MS / 1000, ease: "easeOut" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

const STAT_LABEL: Record<ActiveStatModifier["stat"], string> = {
  attack: "Angriff",
  defense: "Verteidigung",
  speed: "Speed",
};

function formatModifierValue(m: ActiveStatModifier): string {
  const sign = m.amount >= 0 ? "+" : "";
  return m.mode === "percent" ? `${sign}${Math.round(m.amount * 100)}%` : `${sign}${m.amount}`;
}

function formatModifierDuration(m: ActiveStatModifier): string {
  if (m.remainingRounds === "battle") return "bis Kampfende";
  return `noch ${m.remainingRounds} ${m.remainingRounds === 1 ? "Runde" : "Runden"}`;
}

/** Reihe von Heldenkarten, auf dasselbe 7-Spalten-Raster wie das Brett gelegt — jede Karte steht über/
 *  unter den Spalten ihres Slots (siehe enemySlotForColumn), damit sichtbar ist,
 *  welcher Gegner von welcher Spalte getroffen wird. */
function SlotRow({ children }: { children: ReactNode }) {
  const kids = Children.toArray(children);
  return (
    <div className="px-2.5">
      <div
        className="grid w-full max-w-[400px] lg:max-w-[480px] mx-auto px-1"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))` }}
      >
        {kids.map((kid, slot) => {
          const cols = Array.from({ length: BOARD_COLS }, (_, c) => c).filter((c) => enemySlotForColumn(c, kids.length) === slot);
          const start = cols.length > 0 ? cols[0] : 0;
          return (
            <div key={slot} className="flex justify-center" style={{ gridColumn: `${start + 1} / span ${Math.max(1, cols.length)}` }}>
              {kid}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnitCard({
  unit,
  isActing,
  ultimateReady,
  effects,
  isAttacking,
  countdown,
  impactFlash,
  displayHp,
  isVictory,
  onUltimateClick,
  cardRef,
}: {
  unit: LiveUnit;
  isActing: boolean;
  /** Rage-Balken voll — Karte ist per Klick sofort auslösbar
   *  (Empires-&-Puzzles-Stil, siehe applyUltimateInterrupt), unabhängig davon, ob
   *  diese Einheit laut Zugreihenfolge gerade selbst am Zug ist. */
  ultimateReady?: boolean;
  /** Gerade eingetroffene Kampfeffekte für DIESE Einheit — Flug-Zahlen +
   *  Treffer-Flash bei Schaden (siehe FloatingEffect/LiveBattleView). */
  effects?: FloatingEffect[];
  /** Diese Einheit hat GERADE (letzte ~550ms) einen Schadens-Angriff ausgeführt
   *  — macht auch Angriffe sichtbar, die ohne eigene Zug-Handlung passieren
   *  (match-ausgelöste Angriffe bei OMA Gems, siehe applyBoardRage). */
  isAttacking?: boolean;
  /** OMA Gems (nur Gegner): Anzahl deiner Züge, bis dieser Gegner angreift
   *  (1 = nach deinem nächsten Zug) — Empires-&-Puzzles-Countdown, abgeleitet
   *  aus der Zugreihenfolge (snapshot.upcoming). */
  countdown?: number;
  /** Ein Gem-Geschoss ist GERADE bei dieser Karte eingeschlagen — sofortiger
   *  Treffer-Flash, noch bevor der Server-Schaden im Log ankommt. */
  impactFlash?: boolean;
  /** Angezeigte HP statt `unit.currentHp` — lässt die Lebensanzeige Treffer für
   *  Treffer sinken, solange der Server-Stand (OMA Gems) noch zurückgehalten wird. */
  displayHp?: number;
  /** Kampf ist beendet UND diese Einheit steht im Gewinner-Team (siehe snapshot.winner
   *  in LiveBattleBody) — spielt die Victory-Animation statt Idle, falls vorhanden. */
  isVictory?: boolean;
  onUltimateClick?: () => void;
  /** DOM-Ref auf die Karte — bei OMA Gems das Angriffsziel des Gems-Lichtstrahls
   *  (siehe handleGemsDestroyed in LiveBattleBody). */
  cardRef?: (el: HTMLButtonElement | null) => void;
}) {
  const config = getClassConfig(unit.class);
  const shownHp = displayHp ?? unit.currentHp;
  const hpPct = unit.maxHp > 0 ? Math.max(0, shownHp / unit.maxHp) : 0;
  const borderColor = LEVEL_BORDER[unit.level] ?? LEVEL_BORDER[1];
  const canFireUltimate = !!ultimateReady && !!onUltimateClick && unit.isAlive;
  const clickable = canFireUltimate;
  const isHit = (effects ?? []).some((e) => e.kind === "damage" || e.kind === "crit");
  // Monster-Artwork existiert nicht für jeden Gegner (siehe puzzle-monsters.ts/
  // campaign-monsters.ts: imageUrl ist schon gesetzt, auch bevor die Datei
  // vorliegt) — bei einem 404 fällt die Karte automatisch auf das Klassen-Icon
  // zurück, statt ein kaputtes Bild-Icon zu zeigen.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!unit.imageUrl && !imageFailed;
  // Buff/Debuff-Icons: ein Badge pro betroffenem Stat (nicht pro Modifier —
  // mehrere Effekte auf denselben Stat sind selten und werden im Tooltip
  // ohnehin einzeln aufgeführt). Tippen öffnet Details (Betrag, Restdauer,
  // Quelle) — bewusst NICHT die native `disabled`-Eigenschaft am äußeren
  // <button> genutzt (s.u.), sonst würden deaktivierte Karten (der
  // Normalfall, wenn gerade kein Ziel gewählt wird) auch dieses Badge
  // unklickbar machen (disabled-Buttons blockieren Pointer-Events auf
  // Kind-Elementen).
  const [modifiersOpen, setModifiersOpen] = useState(false);
  const modifierStats = Array.from(new Set(unit.statModifiers.map((m) => m.stat)));

  function handleClick() {
    if (canFireUltimate) onUltimateClick?.();
  }

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={handleClick}
      className={`w-20 sm:w-28 shrink-0 text-left relative ${isHit || impactFlash ? "hit-shake" : ""} ${isAttacking ? "attack-lunge" : ""}`}
      style={{
        opacity: unit.isAlive ? 1 : 0.35,
        filter: unit.isAlive ? (impactFlash ? "brightness(1.7) saturate(1.3)" : "none") : "grayscale(1)",
        transition: "filter 120ms ease-out",
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {countdown !== undefined && unit.isAlive && (
        <span
          className={`absolute -top-1.5 -left-1.5 z-30 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-lg ${countdown === 1 ? "animate-pulse" : ""}`}
          style={{
            background: countdown === 1 ? "#f97316" : "#27272a",
            color: countdown === 1 ? "#000" : "#e4e4e7",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.6)",
          }}
          title={countdown === 1 ? "Greift nach deinem nächsten Zug an" : `Greift in ${countdown} Zügen an`}
        >
          <Swords className="w-3 h-3" strokeWidth={2.5} />
          {countdown}
        </span>
      )}
      {/* Archetyp-Treffer-Ring: farbiger Ring-Flash in der Farbe der Klasse des
          AUSFÜHRENDEN Helden (nicht des getroffenen Ziels) — macht sichtbar, WER
          zuschlägt, nicht nur dass etwas passiert. Gleiche Archetyp-Matrix wie
          SkillEffectOverlay in BattleScreen.tsx. */}
      {(effects ?? [])
        .filter((e) => (e.kind === "damage" || e.kind === "crit") && e.casterClass)
        .map((eff) => (
          <span
            key={`ring-${eff.id}`}
            className="archetype-hit-ring absolute inset-0 rounded-full pointer-events-none z-30"
            style={{ ["--ring-color" as string]: getClassConfig(eff.casterClass!).color }}
          />
        ))}
      {/* Echte Sprite-Overlays (Kenney Particle Pack, CC0, siehe
          public/gems-assets/vfx/README.md) — dasselbe Bild wie im Kampf-
          Replay (BattleScreen.tsx), per mask-image in die Klassenfarbe
          eingefärbt. Bisher gab's im Live-Kampf nur den Ring-Flash oben, kein
          Sprite — das war die eigentliche Lücke, die "keine sichtbare
          Änderung" verursacht hat. */}
      {(effects ?? [])
        .filter((e) => (e.kind === "damage" || e.kind === "crit") && e.casterClass === "DAMAGE_DEALER")
        .map((eff) => (
          <motion.span
            key={`slash-${eff.id}`}
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: getClassConfig("DAMAGE_DEALER").color,
              maskImage: "url(/gems-assets/vfx/slash.png)",
              WebkitMaskImage: "url(/gems-assets/vfx/slash.png)",
              maskSize: "180% 180%",
              WebkitMaskSize: "180% 180%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
            initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
            animate={{ opacity: [0, 1, 0], rotate: -30, scale: 1.15 }}
            transition={{ duration: eff.kind === "crit" ? 0.4 : 0.32, ease: "easeOut" }}
          />
        ))}
      {(effects ?? [])
        .filter((e) => (e.kind === "damage" || e.kind === "crit") && e.casterClass === "SUPPORT")
        .map((eff) => (
          <motion.span
            key={`magic-${eff.id}`}
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: getClassConfig("SUPPORT").color,
              maskImage: "url(/gems-assets/vfx/magic-bolt.png)",
              WebkitMaskImage: "url(/gems-assets/vfx/magic-bolt.png)",
              maskSize: "70% 70%",
              WebkitMaskSize: "70% 70%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
            initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], scale: 1, rotate: eff.kind === "crit" ? 300 : 200 }}
            transition={{ duration: eff.kind === "crit" ? 0.42 : 0.34, ease: "easeOut" }}
          />
        ))}
      {(effects ?? []).length > 0 && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
          {(effects ?? []).map((eff, i) => (
            <span
              key={eff.id}
              className="value-delta-pop text-xs sm:text-sm font-black whitespace-nowrap"
              style={{
                color: EFFECT_COLOR[eff.kind],
                textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                animationDelay: `${i * 90}ms`,
              }}
            >
              {eff.text}
              {eff.kind === "crit" && " !"}
              {eff.bonusPercent != null && (
                <span style={{ color: "#f59e0b" }}> ⚡+{eff.bonusPercent}%</span>
              )}
            </span>
          ))}
        </div>
      )}
      {isActing && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-500 text-black whitespace-nowrap">
          Am Zug
        </span>
      )}
      {canFireUltimate && !isActing && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-400 text-black whitespace-nowrap animate-pulse">
          Ultimate bereit
        </span>
      )}
      {isAttacking && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-orange-500 text-white whitespace-nowrap">
          Angriff!
        </span>
      )}

      <div className="w-full aspect-square mb-0.5 flex items-center justify-center relative rounded-md overflow-hidden">
        {/* Klassen-getönte Plate IMMER als Hintergrund — sonst schwebt freigestellte
            Monster-Kunst (transparenter Hintergrund) im schwarzen Void, während echte
            Spieler-Karten (die ihren Hintergrund selbst mitbringen) diese Plate ohnehin
            komplett überdecken. Einheitliches Porträt-Format unabhängig von der Quelle. */}
        <div className="absolute inset-0" style={{ background: `${config.color}22` }} />
        {isAttacking && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(closest-side, rgba(249,115,22,0.55), transparent 70%)" }}
          />
        )}
        {(isActing || canFireUltimate) && (
          <div
            className={`absolute inset-0 rounded-full pointer-events-none ${canFireUltimate && !isActing ? "animate-pulse" : ""}`}
            style={{
              background: isActing
                ? "radial-gradient(closest-side, rgba(20,184,166,0.35), transparent 70%)"
                : "radial-gradient(closest-side, rgba(251,191,36,0.35), transparent 70%)",
            }}
          />
        )}
        {unit.teCharacter ? (
          <BattleFigure
            config={unit.teCharacter}
            unitClass={unit.class}
            team={unit.teamId}
            attacking={!!isAttacking}
            blocking={(effects ?? []).some((e) => e.kind === "shield")}
            alive={unit.isAlive}
            victory={isVictory}
            title={unit.name}
          />
        ) : showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={unit.imageUrl!}
            alt={unit.name}
            className="max-w-full max-h-full object-contain relative"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))" }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.icon} alt="" aria-hidden className="w-5 h-5 sm:w-7 sm:h-7 relative object-contain" style={{ opacity: 0.55 }} />
        )}
        <div
          className={`absolute inset-0 rounded-md pointer-events-none ${canFireUltimate ? "animate-pulse" : ""}`}
          style={{
            boxShadow: isAttacking
              ? "0 0 0 2px #f97316, 0 0 16px rgba(249,115,22,0.75)"
              : canFireUltimate
                ? "0 0 0 2px #fbbf24, 0 0 14px rgba(251,191,36,0.6)"
                : `0 0 0 1px ${borderColor}`,
          }}
        />
        {modifierStats.length > 0 && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setModifiersOpen((v) => !v);
            }}
            className="absolute bottom-0.5 left-0.5 z-10 flex gap-0.5"
          >
            {modifierStats.map((stat) => {
              const netAmount = unit.statModifiers.filter((m) => m.stat === stat).reduce((sum, m) => sum + m.amount, 0);
              const positive = netAmount >= 0;
              return (
                <span
                  key={stat}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] leading-none font-black"
                  style={{
                    background: positive ? "#34d399" : "#f87171",
                    color: "#000",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {positive ? "▲" : "▼"}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {modifiersOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.stopPropagation();
              setModifiersOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full left-0 mb-1 z-40 w-40 rounded-lg glass-heavy shadow-xl px-2 py-1.5 space-y-1"
          >
            {unit.statModifiers.map((m, i) => (
              <div key={i} className="text-[10px] leading-snug">
                <p className="font-semibold" style={{ color: m.amount >= 0 ? "#34d399" : "#f87171" }}>
                  {STAT_LABEL[m.stat]} {formatModifierValue(m)}
                </p>
                <p className="text-gray-500">
                  {formatModifierDuration(m)} · {m.sourceName}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <p
        className="text-[9px] sm:text-[10px] font-semibold text-white text-center truncate mb-0.5"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
      >
        {unit.name}
      </p>
      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${hpPct * 100}%`, background: hpBarColor(hpPct) }} />
      </div>
      <p
        className="hidden sm:block text-[9px] text-gray-400 text-center tabular-nums mt-0.5"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
      >
        {Math.max(0, Math.round(shownHp))}/{unit.maxHp}
      </p>
      <div className="flex items-center gap-1 mt-0.5" title={`Rage: ${Math.round(unit.rage)}/100`}>
        <Swords className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
        <div className="flex-1 h-1 rounded-full bg-black/40 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${Math.min(100, unit.rage)}%`, background: "#60a5fa" }} />
        </div>
      </div>
    </button>
  );
}

export default function LiveBattleView({
  liveBattleId,
  viewerId,
  onExit,
}: {
  liveBattleId: string;
  viewerId: string;
  /** Fehlt dieser Handler, navigiert der eingebaute Zurück-Button zur Community-Übersicht. */
  onExit?: () => void;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Eigener Busy-Schalter fürs Ultimate statt des gemeinsamen `busy` — sonst
  // verschluckt ein Ultimate-Klick, der zufällig während einer NOCH laufenden
  // normalen Zug-Anfrage (submitMove, z.B. direkt nach einem Match-3-Swap)
  // eintrifft, den Klick lautlos (early return, kein Fehler sichtbar): der
  // Held wirkt "manchmal erst beim 2. Klick bereit". Ultimate läuft serverseitig
  // ohnehin unabhängig vom Zug (siehe applyUltimateInterrupt), sollte also auch
  // clientseitig nicht an denselben Schalter gekoppelt sein.
  const [ultimateBusy, setUltimateBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [effects, setEffects] = useState<FloatingEffect[]>([]);
  // Wer GERADE angreift (kurzzeitig, siehe unten) — macht Angriffe des Gegners
  // (insbesondere match-ausgelöste Angriffe bei OMA Gems, die sonst ohne jede
  // eigene Zug-Handlung "einfach passieren") sichtbar: der angreifende Held
  // bekommt selbst einen kurzen Lunge/Glow-Effekt, nicht nur das getroffene Ziel.
  const [attackingUnitIds, setAttackingUnitIds] = useState<Set<string>>(new Set());
  // Ultimate-Cutscene (siehe UltimateCutsceneOverlay) — bringt denselben
  // klassen-eigenen Vollbild-Moment wie im Kampf-Replay auch in den Live-Kampf,
  // statt dass ein Ultimate dort nur am Sound erkennbar ist.
  const [ultimateCutscene, setUltimateCutscene] = useState<{ name: string; class: UnitClass; skillName: string } | null>(null);
  const lastLogLengthRef = useRef<number | null>(null);
  // OMA Gems: der Zug geht schon zu Animationsbeginn an den Server, die Antwort
  // wird aber bis zum Animationsende zurückgehalten (sonst würde das Brett/die
  // Ansicht mitten in der Animation umspringen). `pendingHp` liefert der Ansicht
  // in der Zwischenzeit die Ziel-HP, damit die Lebensanzeige Treffer für Treffer
  // sinkt (siehe hpDisplayFor in LiveBattleBody).
  const gemsHoldRef = useRef(false);
  const pendingSnapshotRef = useRef<LiveSnapshot | null>(null);
  const [pendingHp, setPendingHp] = useState<Map<string, number> | null>(null);
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted);
  // Splash-Art für den Lade-Zustand (siehe public/gems-assets/splash.png) —
  // fehlt die Datei (noch nicht hochgeladen), fällt die Ansicht einfach auf
  // den reinen Spinner zurück (onError-Pattern, wie beim Logo/Hintergrund).
  const [splashFailed, setSplashFailed] = useState(false);
  function toggleSoundMuted() {
    setSoundMutedState((prev) => {
      const next = !prev;
      setSoundMuted(next);
      return next;
    });
  }

  // Portal auf document.body (wie MobileTopBar.tsx) — sonst kann eine Ahnen-
  // Komponente mit eigenem Stacking-Context (transform/opacity/filter) den
  // eigentlich höheren z-index dieses Overlays einsperren, wodurch die fixe
  // Top-/Bottom-Navigation der App trotzdem darüber gemalt wird.
  useEffect(() => {
    setMounted(true);
  }, []);

  function handleExit() {
    if (onExit) onExit();
    else router.push("/gems");
  }

  async function fetchSnapshot() {
    try {
      const res = await fetch(`/api/gems/live/${liveBattleId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kampf konnte nicht geladen werden.");
        return;
      }
      setSnapshot(data);
    } catch {
      // nächster Poll versucht es erneut
    }
  }

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBattleId]);

  // Ist gerade NICHT der eigene Zug dran (Monster am Zug), wird jede Sekunde neu geladen.
  useEffect(() => {
    if (snapshot?.status === "finished") return;

    const interval = setInterval(() => {
      const isMyDecision = !!snapshot?.awaiting && snapshot.awaiting.controlledByPlayerId === viewerId;
      if (!isMyDecision) fetchSnapshot();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.status, snapshot?.awaiting?.unitId, viewerId]);

  // Kampfeffekte (Flug-Zahlen + Treffer-Flash): vergleicht logLength mit dem
  // zuletzt gesehenen Stand, um neue Log-Einträge seit dem letzten Snapshot zu
  // erkennen — recentLog ist nur ein Fenster der letzten 12 Einträge, logLength
  // macht den Vergleich trotzdem zuverlässig (siehe live-battle.ts). Beim
  // allerersten Snapshot wird nichts animiert (sonst würde die gesamte
  // bisherige Kampfhistorie auf einen Schlag "aufblitzen").
  useEffect(() => {
    if (!snapshot) return;
    if (lastLogLengthRef.current === null) {
      lastLogLengthRef.current = snapshot.logLength;
      return;
    }
    const newCount = snapshot.logLength - lastLogLengthRef.current;
    lastLogLengthRef.current = snapshot.logLength;
    if (newCount <= 0) return;

    const newEntries = snapshot.recentLog.slice(-Math.min(newCount, snapshot.recentLog.length));

    // Mehrere Aktionen können in EINER Server-Antwort aufgelöst werden — z.B.
    // der eigene match-ausgelöste Angriff UND direkt im Anschluss (ohne
    // eigene Zug-Handlung) ein oder mehrere Gegner-Züge, bevor der Server
    // wieder auf die eigene Entscheidung pausiert (siehe advance() in
    // interactive.ts). Ohne Staffelung würden alle Flug-Zahlen/Angriffs-
    // Indikatoren gleichzeitig aufblitzen und der Gegner-Angriff ginge im
    // eigenen unter.
    //
    // Wellen werden NACH TEAM gebildet, nicht pro Aktion: mehrere Einheiten
    // DESSELBEN Teams (z.B. bei OMA Gems mehrere gleichzeitig ausgelöste
    // Angriffe derselben Klasse) landen gemeinsam in einer Welle und wirken
    // dadurch wie EIN gemeinsamer Angriffszug. Erst ein Team-Wechsel (eigenes
    // Team -> gegnerisches Team oder umgekehrt) startet eine neue Welle mit
    // spürbar größerem Abstand (TEAM_SWITCH_DELAY_MS) — sonst wirkt es, als
    // würden eigene und gegnerische Helden gleichzeitig angreifen, und es ist
    // nicht erkennbar, wer wen trifft.
    const SAME_TEAM_DELAY_MS = 60; // minimaler Versatz innerhalb derselben Welle (Zahlen/Sounds nicht exakt deckungsgleich)
    const TEAM_SWITCH_DELAY_MS = 750;
    const unitTeamById = new Map(snapshot.units.map((u) => [u.instanceId, u.teamId]));
    const unitClassById = new Map(snapshot.units.map((u) => [u.instanceId, u.class]));
    const unitNameById = new Map(snapshot.units.map((u) => [u.instanceId, u.name]));

    type Wave = {
      team: TeamId | null;
      effects: FloatingEffect[];
      attackerIds: Set<string>;
      sounds: (() => void)[];
      /** Ultimate-Cutscene für diese Welle (siehe UltimateCutsceneOverlay) —
       *  bringt den vollflächigen, klassen-eigenen Look, den es bisher nur im
       *  Kampf-Replay (BattleScreen.tsx) gab, auch in den Live-Kampf. */
      ultimate?: { name: string; class: UnitClass; skillName: string };
    };
    const waves: Wave[] = [{ team: null, effects: [], attackerIds: new Set(), sounds: [] }];
    const currentWave = () => waves[waves.length - 1];

    for (const entry of newEntries) {
      if (entry.type === "action") {
        const actorTeam = unitTeamById.get(entry.actorId as string) ?? null;
        const wave = currentWave();
        const hasContent = wave.effects.length > 0 || wave.attackerIds.size > 0 || wave.sounds.length > 0;
        if (wave.team === null) {
          wave.team = actorTeam;
        } else if (actorTeam !== null && actorTeam !== wave.team) {
          waves.push({ team: actorTeam, effects: [], attackerIds: new Set(), sounds: [] });
        } else if (hasContent) {
          // Gleiches Team, aber schon Inhalt in dieser Welle (z.B. zwei
          // aufeinanderfolgende Log-Einträge desselben Zugs) — bleibt in
          // derselben Welle, damit es weiterhin als EIN gemeinsamer Angriff wirkt.
        }
        if (entry.actionType === "ultimate") {
          const casterClass = unitClassById.get(entry.actorId as string);
          currentWave().sounds.push(() => playUltimateSoundFor(casterClass));
          if (casterClass) {
            currentWave().ultimate = {
              name: unitNameById.get(entry.actorId as string) ?? "?",
              class: casterClass,
              skillName: entry.skillName as string,
            };
          }
        }
        continue;
      }
      if (entry.type === "damage") {
        const casterClass = entry.sourceId ? unitClassById.get(entry.sourceId as string) : undefined;
        currentWave().effects.push({
          id: `${Date.now()}-${Math.random()}`,
          unitId: entry.targetId as string,
          kind: entry.isCrit ? "crit" : "damage",
          text: `-${entry.amount as number}`,
          bonusPercent: entry.matchBonusPercent as number | undefined,
          casterClass,
        });
        if (entry.sourceId && entry.sourceId !== entry.targetId) currentWave().attackerIds.add(entry.sourceId as string);
        currentWave().sounds.push(() => playDamageSoundFor(casterClass, !!entry.isCrit));
      } else if (entry.type === "heal") {
        currentWave().effects.push({
          id: `${Date.now()}-${Math.random()}`,
          unitId: entry.targetId as string,
          kind: "heal",
          text: `+${entry.amount as number}`,
          bonusPercent: entry.matchBonusPercent as number | undefined,
        });
        currentWave().sounds.push(playHealSound);
      } else if (entry.type === "shieldApplied") {
        currentWave().effects.push({
          id: `${Date.now()}-${Math.random()}`,
          unitId: entry.targetId as string,
          kind: "shield",
          text: `+${entry.amount as number}`,
        });
        currentWave().sounds.push(playShieldSound);
      }
    }

    // Kumulierte Verzögerung statt fixem i*Konstante: der große Sprung passiert
    // NUR beim Team-Wechsel, innerhalb desselben Teams bleibt es fast simultan.
    let cumulativeDelay = 0;
    let previousTeam: TeamId | null = null;
    waves.forEach((wave) => {
      if (wave.effects.length === 0 && wave.attackerIds.size === 0 && wave.sounds.length === 0) return;
      if (previousTeam !== null && wave.team !== null && wave.team !== previousTeam) {
        cumulativeDelay += TEAM_SWITCH_DELAY_MS;
      } else if (previousTeam !== null) {
        cumulativeDelay += SAME_TEAM_DELAY_MS;
      }
      previousTeam = wave.team ?? previousTeam;
      const delay = cumulativeDelay;
      window.setTimeout(() => {
        wave.sounds.forEach((play) => play());
        if (wave.attackerIds.size > 0) {
          setAttackingUnitIds((prev) => new Set([...prev, ...wave.attackerIds]));
          window.setTimeout(() => {
            setAttackingUnitIds((prev) => {
              const next = new Set(prev);
              wave.attackerIds.forEach((id) => next.delete(id));
              return next;
            });
          }, 550);
        }
        if (wave.effects.length > 0) {
          setEffects((prev) => [...prev, ...wave.effects]);
          wave.effects.forEach((eff) => {
            window.setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== eff.id)), 1300);
          });
        }
        if (wave.ultimate) {
          setUltimateCutscene(wave.ultimate);
          window.setTimeout(() => setUltimateCutscene(null), 1700);
        }
      }, delay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.logLength]);

  /** Setzt einen Server-Snapshot — während einer laufenden Gems-Animation nur
   *  vorgemerkt (siehe gemsHoldRef), sonst direkt übernommen. */
  function applySnapshot(data: LiveSnapshot) {
    if (gemsHoldRef.current) {
      pendingSnapshotRef.current = data;
      setPendingHp(new Map(data.units.map((u) => [u.instanceId, u.currentHp])));
    } else {
      setSnapshot(data);
    }
  }

  function beginGemsHold() {
    gemsHoldRef.current = true;
    pendingSnapshotRef.current = null;
    setPendingHp(null);
  }

  function endGemsHold() {
    gemsHoldRef.current = false;
    const pending = pendingSnapshotRef.current;
    pendingSnapshotRef.current = null;
    setPendingHp(null);
    if (pending) setSnapshot(pending);
  }

  async function submitMove(boardSwaps: SwapMove[]) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/gems/live/${liveBattleId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardSwaps }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Zug fehlgeschlagen.");
        return;
      }
      applySnapshot(data);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  /** Löst ein Ultimate SOFORT aus (Empires-&-Puzzles-Stil, per Klick auf eine
   *  Heldenkarte mit vollem Rage-Balken) — unabhängig davon, ob `casterId`
   *  laut Zugreihenfolge gerade selbst am Zug ist (siehe applyUltimateInterrupt). */
  async function submitUltimate(casterId: string) {
    if (ultimateBusy) return;
    setUltimateBusy(true);
    try {
      const res = await fetch(`/api/gems/live/${liveBattleId}/ultimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ultimate fehlgeschlagen.");
        return;
      }
      setSnapshot(data);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setUltimateBusy(false);
    }
  }

  /** Fire-and-forget: sichert den Fortschritt der laufenden Match-3-Mini-
   *  Session serverseitig (siehe saveBoardProgress in live-battle.ts), damit
   *  ein Reload mitten im Zug ihn nicht verwirft. Setzt bewusst NICHT `busy`
   *  — das Brett soll dadurch nicht gesperrt werden, Fehler werden still
   *  ignoriert (reiner Komfort, keine spielentscheidende Aktion). */
  function saveBoardProgress(boardSwaps: SwapMove[]) {
    fetch(`/api/gems/live/${liveBattleId}/board-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swaps: boardSwaps }),
    }).catch(() => {});
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ ...getArenaBackgroundStyle(snapshot?.mode), zIndex: 9999 }}>
      {/* Auf großen Bildschirmen bleibt der (mobil-first gebaute) Kampfscreen eine
          zentrierte, moderat breite Spalte statt über die volle Bildschirmbreite
          zu strecken — die Arena-Hintergrund füllt weiterhin den ganzen Viewport. */}
      <div className="flex-1 flex flex-col min-h-0 w-full lg:max-w-2xl xl:max-w-3xl mx-auto">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => (!snapshot || snapshot.status === "finished" ? handleExit() : setShowLeaveConfirm(true))}
            className="glass flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" /> Zurück
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSoundMuted}
              className="glass flex items-center justify-center text-gray-300 hover:text-white transition-colors w-8 h-8 rounded-lg"
              aria-label={soundMuted ? "Ton einschalten" : "Ton ausschalten"}
            >
              {soundMuted ? <BellOff className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {snapshot && (
              <span
                className="glass font-display text-sm font-bold text-teal-300 px-3 py-1.5 rounded-lg"
              >
                Runde {snapshot.round}
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <ErrorNotice message={error} size="lg" />
          </div>
        ) : !snapshot ? (
          <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden pb-10">
            {!splashFailed && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/gems-assets/splash.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setSplashFailed(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
              </>
            )}
            <div className="absolute top-6 left-0 right-0 flex items-center justify-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND_LOGO} alt="OMA" className="h-8 w-auto object-contain" />
              <span className="font-display text-base font-bold text-white">OMA Gems</span>
            </div>
            <div className="relative flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
              <p className="text-xs text-gray-300">Kampf wird geladen…</p>
            </div>
          </div>
        ) : (
          <LiveBattleBody
            snapshot={snapshot}
            viewerId={viewerId}
            busy={busy}
            submitMove={submitMove}
            submitUltimate={submitUltimate}
            effects={effects}
            attackingUnitIds={attackingUnitIds}
            saveBoardProgress={saveBoardProgress}
            beginGemsHold={beginGemsHold}
            endGemsHold={endGemsHold}
            pendingHp={pendingHp}
            ultimateCutscene={ultimateCutscene}
            ultimateBusy={ultimateBusy}
            onExit={handleExit}
          />
        )}
      </div>

      <Modal open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} title="Kampf verlassen?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Dein Kampf bleibt gespeichert — du kannst ihn später an derselben Stelle fortsetzen.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>Weiterspielen</Button>
            <Button
              onClick={() => {
                setShowLeaveConfirm(false);
                handleExit();
              }}
            >
              Verlassen
            </Button>
          </div>
        </div>
      </Modal>
    </div>,
    document.body
  );
}

function LiveBattleBody({
  snapshot,
  viewerId,
  busy,
  submitMove,
  submitUltimate,
  effects,
  attackingUnitIds,
  saveBoardProgress,
  beginGemsHold,
  endGemsHold,
  pendingHp,
  ultimateCutscene,
  ultimateBusy,
  onExit,
}: {
  snapshot: LiveSnapshot;
  viewerId: string;
  busy: boolean;
  submitMove: (boardSwaps: SwapMove[]) => void;
  submitUltimate: (casterId: string) => void;
  effects: FloatingEffect[];
  attackingUnitIds: Set<string>;
  saveBoardProgress: (boardSwaps: SwapMove[]) => void;
  beginGemsHold: () => void;
  endGemsHold: () => void;
  pendingHp: Map<string, number> | null;
  ultimateCutscene: { name: string; class: UnitClass; skillName: string } | null;
  ultimateBusy: boolean;
  onExit: () => void;
}) {
  const myTeam: TeamId | null = viewerId === snapshot.playerAId ? "A" : null;
  const opponentTeam: TeamId = "B";
  const isMyDecision = !!snapshot.awaiting && snapshot.awaiting.controlledByPlayerId === viewerId;

  const unitsByTeam = (team: TeamId) => snapshot.units.filter((u) => u.teamId === team);
  const unitById = (id: string) => snapshot.units.find((u) => u.instanceId === id);
  const nameOf = (id: string) => unitById(id)?.name ?? "?";

  // DOM-Positionen der Heldenkarten — für den Gems-Lichtstrahl gebraucht (siehe
  // handleGemsDestroyed unten), um zu wissen, WOHIN die zerstörten Steine
  // optisch fliegen sollen. Reine Refs, kein Re-Render.
  const cardElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const beamIdRef = useRef(0);
  const [beams, setBeams] = useState<GemBeam[]>([]);
  const [impactIds, setImpactIds] = useState<Set<string>>(new Set());
  // Treffer-Verfolgung je Gegner für die Lebensanzeige: `total` = Steine dieses
  // Zugs, die ihn treffen (aus den Spalten, vorab bekannt), `hits` = bereits
  // eingeschlagene Geschosse. Angezeigte HP = Start-HP minus Schaden × hits/total,
  // wobei der Gesamtschaden aus dem (zurückgehaltenen) Server-Stand kommt.
  const [hitTrack, setHitTrack] = useState<Map<string, { hits: number; total: number }>>(new Map());

  /** OMA Gems (Empires-&-Puzzles-Stil): jeder zerstörte Stein fährt in seiner
   *  Spalte senkrecht nach oben und trifft den Gegner, der über dieser Spalte
   *  steht (dieselbe Regel wie der Server, siehe pickEnemyForColumn/
   *  applyBoardRage — nur wird hier der Lebend-Zustand VOR dem Zug benutzt). */
  /** Zugbeginn: Server-Antwort zurückhalten und je Gegner zählen, wie viele
   *  Steine dieses Zuges ihn treffen werden (gleiche Spalten-Regel wie der Server). */
  function handleMoveStart(columns: number[]) {
    beginGemsHold();
    const enemies = unitsByTeam(opponentTeam);
    const alive = enemies.map((u) => u.isAlive);
    const next = new Map<string, { hits: number; total: number }>();
    for (const column of columns) {
      const slot = pickEnemyForColumn(column, alive);
      if (slot < 0) continue;
      const id = enemies[slot].instanceId;
      next.set(id, { hits: 0, total: (next.get(id)?.total ?? 0) + 1 });
    }
    setHitTrack(next);
  }

  function handleAnimationEnd() {
    setHitTrack(new Map());
    endGemsHold();
  }

  /** Angezeigte HP eines Gegners während einer Gems-Animation (sonst undefined). */
  function hpDisplayFor(unit: LiveUnit): number | undefined {
    const track = hitTrack.get(unit.instanceId);
    if (!track || track.total === 0) return undefined;
    const target = pendingHp?.get(unit.instanceId) ?? unit.currentHp;
    return unit.currentHp - (unit.currentHp - target) * Math.min(1, track.hits / track.total);
  }

  function handleGemsDestroyed(tiles: { cls: UnitClass; rect: DOMRect; column: number }[]) {
    if (!myTeam) return;
    const enemies = unitsByTeam(opponentTeam);
    const alive = enemies.map((u) => u.isAlive);
    const newBeams: GemBeam[] = [];
    const impactedIds = new Set<string>();
    const hitEnemyIds: string[] = [];
    for (const tile of tiles) {
      const slot = pickEnemyForColumn(tile.column, alive);
      if (slot < 0) continue;
      const enemyId = enemies[slot].instanceId;
      const el = cardElementsRef.current.get(enemyId);
      if (!el) continue;
      impactedIds.add(enemyId);
      hitEnemyIds.push(enemyId);
      const target = el.getBoundingClientRect();
      const fromX = tile.rect.left + tile.rect.width / 2;
      newBeams.push({
        id: `beam-${beamIdRef.current++}`,
        cls: tile.cls,
        fromX,
        fromY: tile.rect.top + tile.rect.height / 2,
        // Senkrecht nach oben; nur innerhalb der Kartenbreite halten, falls die
        // Spalte am Rand des Slots liegt.
        toX: Math.min(Math.max(fromX, target.left + 8), target.right - 8),
        toY: target.top + target.height / 2,
      });
    }
    if (newBeams.length === 0) return;
    setBeams((prev) => [...prev, ...newBeams]);
    // Treffer-Flash auf den getroffenen Gegnerkarten im Moment des Einschlags.
    window.setTimeout(() => {
      setImpactIds((prev) => new Set([...prev, ...impactedIds]));
      // Jeder eingeschlagene Stein zählt als Treffer → Lebensanzeige sinkt.
      setHitTrack((prev) => {
        const next = new Map(prev);
        for (const id of hitEnemyIds) {
          const t = next.get(id);
          if (t) next.set(id, { ...t, hits: t.hits + 1 });
        }
        return next;
      });
    }, GEM_BEAM_DURATION_MS);
    window.setTimeout(
      () => setImpactIds((prev) => new Set([...prev].filter((id) => !impactedIds.has(id)))),
      GEM_BEAM_DURATION_MS + 260
    );
    newBeams.forEach((b) => {
      window.setTimeout(() => setBeams((prev) => prev.filter((x) => x.id !== b.id)), GEM_BEAM_DURATION_MS + GEM_IMPACT_MS + 80);
    });
  }
  // Empires-&-Puzzles-Countdown je Gegner: Anzahl DEINER Züge bis zu seinem
  // nächsten Angriff (1 = nach deinem nächsten Zug) — erste Nennung je Gegner in
  // der Zugreihenfolge, eigene Zug-Slots davor zählen mit.
  const enemyCountdown = new Map<string, number>();
  {
    let ownCount = 0;
    for (const id of snapshot.upcoming) {
      const u = unitById(id);
      if (!u) continue;
      if (u.teamId === opponentTeam) {
        if (!enemyCountdown.has(id)) enemyCountdown.set(id, ownCount + 1);
      } else ownCount++;
    }
  }

  function ultimateReadyFor(unit: LiveUnit): boolean {
    return (
      !ultimateBusy &&
      myTeam !== null &&
      unit.teamId === myTeam &&
      unit.isAlive &&
      unit.rage >= unit.ultimateCost
    );
  }
  function effectsFor(unit: LiveUnit): FloatingEffect[] {
    return effects.filter((e) => e.unitId === unit.instanceId);
  }

  // Letztes bekanntes Brett merken (Match-3-Modus) — bleibt sichtbar (deaktiviert),
  // solange der Gegner am Zug ist, statt beim Zugwechsel durch einen reinen
  // Text-Platzhalter ersetzt zu werden.
  const [lastBoard, setLastBoard] = useState<{ grid: BoardGrid; specials: SpecialGrid; moveBudget: number } | null>(
    null
  );
  useEffect(() => {
    if (snapshot.awaiting?.board) {
      setLastBoard({
        grid: snapshot.awaiting.board.grid,
        specials: snapshot.awaiting.board.specials,
        moveBudget: snapshot.awaiting.board.moveBudget,
      });
    }
  }, [snapshot.awaiting?.board]);


  // Sieg-/Niederlage-Sound genau einmal abspielen, sobald der Kampf endet — der
  // Ref verhindert ein erneutes Abspielen bei Re-Renders, solange der Kampf
  // "finished" bleibt (Snapshot wird weiter gepollt).
  const finishedSoundPlayedRef = useRef(false);
  useEffect(() => {
    if (snapshot.status !== "finished") {
      finishedSoundPlayedRef.current = false;
      return;
    }
    if (finishedSoundPlayedRef.current) return;
    finishedSoundPlayedRef.current = true;
    if (snapshot.winner === myTeam) playVictorySound();
    else if (snapshot.winner !== null) playDefeatSound();
  }, [snapshot.status, snapshot.winner, myTeam]);

  function handleUnitClick(unit: LiveUnit) {
    if (ultimateReadyFor(unit)) submitUltimate(unit.instanceId);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative z-10 px-3">
      <GemBeamOverlay beams={beams} />
      {/* Kampfende: direkt der Vollbild-Ergebnisbildschirm. */}
      {snapshot.status === "finished" && (
        <GemsResultScreen
          outcome={snapshot.winner === null ? "draw" : snapshot.winner === myTeam ? "win" : "loss"}
          reward={computeGemsReward(snapshot)}
          onExit={onExit}
        />
      )}
      <AnimatePresence>
        {ultimateCutscene && (
          <UltimateCutsceneOverlay
            actorName={ultimateCutscene.name}
            actorClass={ultimateCutscene.class}
            skillName={ultimateCutscene.skillName}
            fixed
          />
        )}
      </AnimatePresence>
      {/* Kampffeld — Gegner oben, das Brett in der Mitte (siehe Entscheidungs-Panel),
          die eigenen Helden UNTER dem Brett. */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 py-2 justify-center">
        <SlotRow>
          {unitsByTeam(opponentTeam).map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              isActing={snapshot.awaiting?.unitId === u.instanceId}
              effects={effectsFor(u)}
              isAttacking={attackingUnitIds.has(u.instanceId)}
              isVictory={snapshot.status === "finished" && snapshot.winner === u.teamId && u.isAlive}
              countdown={enemyCountdown.get(u.instanceId)}
              impactFlash={impactIds.has(u.instanceId)}
              displayHp={hpDisplayFor(u)}
              cardRef={(el) => {
                if (el) cardElementsRef.current.set(u.instanceId, el);
                else cardElementsRef.current.delete(u.instanceId);
              }}
            />
          ))}
        </SlotRow>
      </div>

      {/* Entscheidung — direkt unter den Helden */}
      <div className="shrink-0 space-y-1.5">
        {snapshot.status === "finished" ? (
          // Der Vollbild-Ergebnisbildschirm (GemsResultScreen, s.o.) übernimmt die Anzeige.
          null
        ) : isMyDecision && snapshot.awaiting?.board ? (
          <div className="glass rounded-xl p-2.5 flex flex-col">
              <BoardMatch3
                // Rundennummer mit in den Turn-Key aufnehmen: bleibt nur noch EINE
                // eigene Einheit übrig, ist sie in jeder Runde die einzige, die für
                // uns am Zug ist — unitId allein änderte sich dann über mehrere
                // aufeinanderfolgende eigene Züge hinweg NIE, wodurch BoardMatch3s
                // interner Zug-Budget-Reset (useEffect auf turnId) ausblieb und das
                // Brett dauerhaft gesperrt blieb (kein Swap mehr möglich, Kampf nicht
                // abschließbar). Jede Einheit bekommt pro Runde höchstens einen Zug,
                // daher ist unitId+round zusammen immer eindeutig pro echtem Zug.
                turnId={`${snapshot.awaiting.unitId}-${snapshot.round}`}
                grid={snapshot.awaiting.board.grid}
                specials={snapshot.awaiting.board.specials}
                moveBudget={snapshot.awaiting.board.moveBudget}
                disabled={busy}
                initialSwaps={snapshot.awaiting.board.appliedSwaps}
                // Sobald das Zug-Budget aufgebraucht ist, wird der Zug abgeschickt —
                // zusätzlich greift der Spieler nur per Ultimate-Klick an.
                onConfirm={(swaps, meta) => {
                  handleMoveStart(meta.columns);
                  submitMove(swaps);
                }}
                onAnimationEnd={handleAnimationEnd}
                onProgress={saveBoardProgress}
                onGemsDestroyed={handleGemsDestroyed}
              />
          </div>
        ) : lastBoard ? (
          // Brett bleibt sichtbar (nur deaktiviert), solange der Gegner am Zug ist —
          // verschwindet nicht mehr hinter einem reinen Text-Platzhalter.
          <div className="glass rounded-xl p-2.5 flex flex-col gap-1.5">
            <BoardMatch3
              grid={lastBoard.grid}
              specials={lastBoard.specials}
              moveBudget={lastBoard.moveBudget}
              disabled
              initialSwaps={[]}
              onConfirm={() => {}}
            />
            <p className="text-[11px] text-gray-500 text-center shrink-0">
              {!snapshot.awaiting ? "Kampf läuft automatisch weiter…" : "Gegner ist am Zug…"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-1">
            {!snapshot.awaiting ? "Kampf läuft automatisch weiter…" : "Gegner ist am Zug…"}
          </p>
        )}
      </div>

      <div className="shrink-0 pt-2">
          <SlotRow>
          {unitsByTeam(myTeam ?? "A").map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              // Alle eigenen Helden greifen gemeinsam per Match an — "Am Zug" für
              // eine einzelne Einheit wäre irreführend (siehe applyBoardRage in interactive.ts).
              isActing={false}
              ultimateReady={ultimateReadyFor(u)}
              effects={effectsFor(u)}
              isAttacking={attackingUnitIds.has(u.instanceId)}
              isVictory={snapshot.status === "finished" && snapshot.winner === u.teamId && u.isAlive}
              onUltimateClick={() => handleUnitClick(u)}
              cardRef={(el) => {
                if (el) cardElementsRef.current.set(u.instanceId, el);
                else cardElementsRef.current.delete(u.instanceId);
              }}
            />
          ))}
        </SlotRow>
        </div>

      {/* Text, was passiert — unterhalb der Entscheidung */}
      <div className="glass shrink-0 rounded-lg px-3 py-1.5 mt-1.5 mb-[max(0.5rem,env(safe-area-inset-bottom))] h-[52px] flex flex-col justify-end overflow-hidden bg-black/30">
        {snapshot.recentLog
          .map((e) => describeLogEntry(e, nameOf))
          .filter((line): line is string => !!line)
          .slice(-2)
          .map((line, i) => (
            <p key={i} className="text-[11px] text-gray-300 leading-snug truncate">
              {line}
            </p>
          ))}
      </div>
    </div>
  );
}
