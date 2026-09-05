"use client";

// ============================================
// Interaktiver Kampf — Vollbild-Zug-für-Zug-Steuerung
// ============================================
// Eigenes Vollbild-Fenster (fixed inset-0) im selben Arena-Look wie
// BattleScreen.tsx (die reine Wiedergabekomponente für fertige Replays).
// Zeigt den aktuellen LiveBattle-Zustand (Polling) und lässt den Spieler,
// sobald seine Einheit an der Reihe ist, die Aktion (Normalangriff/Aktiv/
// Ultimate) und — falls nötig — das Ziel wählen (Glow: rot Gegner, grün
// Verbündete). "Als nächstes dran" zeigt die kommenden 5 Einheiten mit
// Porträt + Rahmenfarbe (blau eigen, rot gegnerisch) — bei OMA Gems
// (boardMode) stattdessen "Nächste Gegner-Angriffe" (nur Gegner-Slots, siehe
// upcomingDisplay): eigene Zug-Slots sind dort bedeutungslos, da alle
// eigenen Helden ohnehin gemeinsam per Match angreifen statt einzeln der
// Reihe nach. Auto-Kampf überlässt die eigenen Entscheidungen der KI.
//
// Reine Präsentations-/Steuerungskomponente — die eigentliche Kampflogik
// läuft ausschließlich serverseitig (lib/battle-cards/live-battle.ts).

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Zap, Swords, Bot, ChevronRight, ChevronLeft, Timer, Volume2, VolumeX, Trophy, Skull, Handshake, Star } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { getClassConfig, LEVEL_BORDER } from "./BattleCardView";
import BoardMatch3 from "./BoardMatch3";
import type { BoardGrid, SwapMove } from "@/lib/battle-engine/board-match3";
import type { ActionType, ActiveStatModifier, TeamId, UnitClass } from "@/lib/battle-engine/types";
import {
  isSoundMuted,
  playDamageSoundFor,
  playDefeatSound,
  playHealSound,
  playShieldSound,
  playUltimateSoundFor,
  playVictorySound,
  setSoundMuted,
} from "@/lib/battle-cards/sound";
import ErrorNotice from "./ErrorNotice";
import { BRAND_LOGO } from "@/lib/brand";
import { CAMPAIGN_CHAPTER_BACKGROUND } from "@/lib/battle-cards/campaign-levels";
import VictoryChestReveal, { type ChestPrize } from "./VictoryChestReveal";
import UltimateCutsceneOverlay from "./UltimateCutsceneOverlay";

/** Kampf-Hintergrund: die klassische Arena (arena-bg.jpg) für OMA Duels,
 *  OMA Gems (Nicht-Kampagne) und PvP — Kampagnen-Kämpfe (mode "CAMPAIGN_...") zeigen
 *  stattdessen das zum aktuellen Kapitel passende Hintergrundbild (aktuell
 *  nur Kapitel 1, siehe CAMPAIGN_CHAPTER_BACKGROUND), statt der generischen
 *  Arena — das ist der eigene Look der Kampagne. */
function getArenaBackgroundStyle(mode: string | undefined): CSSProperties {
  const backgroundUrl = mode?.startsWith("CAMPAIGN_") ? CAMPAIGN_CHAPTER_BACKGROUND : "/battle-cards/arena-bg.jpg";
  return {
    backgroundColor: "#12151a",
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
  statModifiers: ActiveStatModifier[];
}

interface AvailableAction {
  actionType: ActionType;
  name: string;
  description: string;
  cost: number;
  targetKind: "enemy" | "ally" | "none";
  estimate: { kind: "damage" | "heal"; min: number; max: number } | null;
}

function EstimateBadge({ estimate }: { estimate: AvailableAction["estimate"] }) {
  if (!estimate) return null;
  const isDamage = estimate.kind === "damage";
  const label = estimate.min === estimate.max ? `${estimate.min}` : `${estimate.min}–${estimate.max}`;
  return (
    <span className={`text-[10px] font-bold tabular-nums shrink-0 ${isDamage ? "text-rose-400" : "text-emerald-400"}`}>
      {isDamage ? "−" : "+"}
      {label} HP
    </span>
  );
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
   *  playDamageSoundFor in lib/battle-cards/sound.ts. */
  casterClass?: UnitClass;
}

interface LiveSnapshot {
  id: string;
  mode: string;
  /** true bei allen OMA-Gems-Kämpfen — blendet den Auto-Kampf-Umschalter aus. */
  boardMode: boolean;
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
    actions: AvailableAction[];
    candidateTargetsByAction: Partial<Record<ActionType, string[]>>;
    deadline: number | null;
    board: { grid: BoardGrid; moveBudget: number; appliedSwaps: SwapMove[] } | null;
  } | null;
  autoA: boolean;
  autoB: boolean;
  playerAId: string;
  playerBId: string | null;
  resultBattleId: string | null;
  winner: "A" | "B" | "DRAW" | null;
  chestPrize: ChestPrize | null;
  /** Nur bei einem gewonnenen Kampagnen-Kampf gesetzt — Sterne-Ergebnis für die
   *  Animation im Kampfende-Screen (siehe computeStars in campaign.ts). */
  campaignResult: { levelId: string; stars: 1 | 2 | 3; starsGained: number; coinsAwarded: number } | null;
}

function hpBarColor(pct: number): string {
  if (pct > 0.5) return "#10b981";
  if (pct > 0.2) return "#f59e0b";
  return "#ef4444";
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
    case "roundStart":
      return `— Runde ${entry.round as number} —`;
    default:
      return null;
  }
}

function ActionIcon({ actionType, className }: { actionType: ActionType; className?: string }) {
  if (actionType === "ultimate") return <Zap className={className} />;
  if (actionType === "active") return <Bot className={className} />;
  return <Swords className={className} />;
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

function GemBeamOverlay({ beams }: { beams: GemBeam[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }}>
      <AnimatePresence>
        {beams.map((beam) => {
          const color = getClassConfig(beam.cls).color;
          return (
            <motion.div
              key={beam.id}
              initial={{ left: beam.fromX, top: beam.fromY, opacity: 0, scale: 0.4 }}
              animate={{ left: beam.toX, top: beam.toY, opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: GEM_BEAM_DURATION_MS / 1000, ease: "easeIn" }}
              className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 12px 4px ${color}, 0 0 24px 8px ${color}88`,
              }}
            />
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

function UnitCard({
  unit,
  isActing,
  glow,
  ultimateReady,
  effects,
  isAttacking,
  onClick,
  onUltimateClick,
  cardRef,
}: {
  unit: LiveUnit;
  isActing: boolean;
  glow: "enemy" | "ally" | null;
  /** Rage-Balken voll UND puzzleMode aktiv — Karte ist per Klick sofort auslösbar
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
  onClick?: () => void;
  onUltimateClick?: () => void;
  /** DOM-Ref auf die Karte — bei OMA Gems das Angriffsziel des Gems-Lichtstrahls
   *  (siehe handleGemsDestroyed in LiveBattleBody). */
  cardRef?: (el: HTMLButtonElement | null) => void;
}) {
  const config = getClassConfig(unit.class);
  const Icon = config.icon;
  const hpPct = unit.maxHp > 0 ? Math.max(0, unit.currentHp / unit.maxHp) : 0;
  const borderColor = LEVEL_BORDER[unit.level] ?? LEVEL_BORDER[1];
  const canPickTarget = !!glow && !!onClick && unit.isAlive;
  const canFireUltimate = !glow && !!ultimateReady && !!onUltimateClick && unit.isAlive;
  const clickable = canPickTarget || canFireUltimate;
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
    if (canPickTarget) onClick?.();
    else if (canFireUltimate) onUltimateClick?.();
  }

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={handleClick}
      className={`w-20 sm:w-28 shrink-0 text-left relative ${isHit ? "hit-shake" : ""} ${isAttacking ? "attack-lunge" : ""}`}
      style={{ opacity: unit.isAlive ? 1 : 0.35, filter: unit.isAlive ? "none" : "grayscale(1)", cursor: clickable ? "pointer" : "default" }}
    >
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
          public/battle-cards/vfx/README.md) — dasselbe Bild wie im Kampf-
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
              maskImage: "url(/battle-cards/vfx/slash.png)",
              WebkitMaskImage: "url(/battle-cards/vfx/slash.png)",
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
              maskImage: "url(/battle-cards/vfx/magic-bolt.png)",
              WebkitMaskImage: "url(/battle-cards/vfx/magic-bolt.png)",
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
      {glow === "enemy" && !isActing && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-rose-500 text-white whitespace-nowrap">
          Ziel
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
        {(isActing || glow || canFireUltimate) && (
          <div
            className={`absolute inset-0 rounded-full pointer-events-none ${canFireUltimate && !isActing ? "animate-pulse" : ""}`}
            style={{
              background: isActing
                ? "radial-gradient(closest-side, rgba(20,184,166,0.35), transparent 70%)"
                : glow === "enemy"
                  ? "radial-gradient(closest-side, rgba(239,68,68,0.35), transparent 70%)"
                  : glow === "ally"
                    ? "radial-gradient(closest-side, rgba(34,197,94,0.35), transparent 70%)"
                    : "radial-gradient(closest-side, rgba(251,191,36,0.35), transparent 70%)",
            }}
          />
        )}
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={unit.imageUrl ?? undefined}
            alt={unit.name}
            className="max-w-full max-h-full object-contain relative"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))" }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className="w-5 h-5 sm:w-7 sm:h-7 relative" style={{ color: config.color, opacity: 0.55 }} />
        )}
        <div
          className={`absolute inset-0 rounded-md pointer-events-none ${canFireUltimate && !glow ? "animate-pulse" : ""}`}
          style={{
            boxShadow: isAttacking
              ? "0 0 0 2px #f97316, 0 0 16px rgba(249,115,22,0.75)"
              : glow === "enemy"
                ? "0 0 0 2px #ef4444, 0 0 14px rgba(239,68,68,0.6)"
                : glow === "ally"
                  ? "0 0 0 2px #22c55e, 0 0 14px rgba(34,197,94,0.6)"
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
            className="absolute bottom-full left-0 mb-1 z-40 w-40 rounded-lg bg-[#14171f] border border-white/10 shadow-xl px-2 py-1.5 space-y-1"
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
        {Math.max(0, unit.currentHp)}/{unit.maxHp}
      </p>
      <div className="flex items-center gap-1 mt-0.5" title={`Rage: ${Math.round(unit.rage)}/100`}>
        <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-sky-400 shrink-0" />
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
  const [selectedAction, setSelectedAction] = useState<AvailableAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0); // erzwingt einen Re-Render pro Sekunde für den Countdown
  const [mounted, setMounted] = useState(false);
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
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted);
  // Splash-Art für den Lade-Zustand (siehe public/battle-cards/splash.png) —
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
    else router.push("/battle-cards?tab=community");
  }

  async function fetchSnapshot() {
    try {
      const res = await fetch(`/api/battle-cards/live/${liveBattleId}`);
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

  // Ein einziger Sekunden-Takt erledigt beides: den Countdown live halten UND —
  // sobald das Zug-Timeout abläuft — genau einen Fetch auslösen, der den
  // Server dazu bringt, die KI-Entscheidung zu übernehmen (siehe
  // getLiveBattleSnapshot in live-battle.ts). Ist gerade NICHT die eigene
  // Entscheidung dran, wird ohnehin jede Sekunde neu geladen (Gegner-Status).
  useEffect(() => {
    if (snapshot?.status === "finished") return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const isMyDecision = !!snapshot?.awaiting && snapshot.awaiting.controlledByPlayerId === viewerId;
      const deadline = snapshot?.awaiting?.deadline;
      const timedOut = typeof deadline === "number" && Date.now() >= deadline;
      if (!isMyDecision || timedOut) fetchSnapshot();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.status, snapshot?.awaiting?.unitId, snapshot?.awaiting?.deadline, viewerId]);

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

  async function submitAction(actionType: ActionType, targetId?: string, boardSwaps?: SwapMove[]) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/battle-cards/live/${liveBattleId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, targetId, boardSwaps }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      setSnapshot(data);
      setSelectedAction(null);
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
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/battle-cards/live/${liveBattleId}/ultimate`, {
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
      setBusy(false);
    }
  }

  /** Fire-and-forget: sichert den Fortschritt der laufenden Match-3-Mini-
   *  Session serverseitig (siehe saveBoardProgress in live-battle.ts), damit
   *  ein Reload mitten im Zug ihn nicht verwirft. Setzt bewusst NICHT `busy`
   *  — das Brett soll dadurch nicht gesperrt werden, Fehler werden still
   *  ignoriert (reiner Komfort, keine spielentscheidende Aktion). */
  function saveBoardProgress(boardSwaps: SwapMove[]) {
    fetch(`/api/battle-cards/live/${liveBattleId}/board-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swaps: boardSwaps }),
    }).catch(() => {});
  }

  async function toggleAuto(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/battle-cards/live/${liveBattleId}/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
        return;
      }
      setSnapshot(data);
      setSelectedAction(null);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(false);
    }
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
            onClick={handleExit}
            className="flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white transition-colors px-2 py-1.5 rounded-md bg-black/30"
          >
            <ChevronLeft className="w-4 h-4" /> Zurück
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSoundMuted}
              className="flex items-center justify-center text-gray-300 hover:text-white transition-colors w-8 h-8 rounded-md bg-black/30"
              aria-label={soundMuted ? "Ton einschalten" : "Ton ausschalten"}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {snapshot && (
              <span className="text-[11px] text-gray-400 bg-black/30 px-2.5 py-1 rounded-md">Runde {snapshot.round}</span>
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
                  src="/battle-cards/splash.png"
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
              <span className="font-battle text-base text-white uppercase tracking-wide">Battle Cards</span>
            </div>
            <div className="relative flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
              <p className="font-battle text-[11px] text-gray-300 uppercase tracking-widest">Kampf wird geladen…</p>
            </div>
          </div>
        ) : (
          <LiveBattleBody
            snapshot={snapshot}
            viewerId={viewerId}
            busy={busy}
            selectedAction={selectedAction}
            setSelectedAction={setSelectedAction}
            submitAction={submitAction}
            submitUltimate={submitUltimate}
            toggleAuto={toggleAuto}
            effects={effects}
            attackingUnitIds={attackingUnitIds}
            saveBoardProgress={saveBoardProgress}
            ultimateCutscene={ultimateCutscene}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

function LiveBattleBody({
  snapshot,
  viewerId,
  busy,
  selectedAction,
  setSelectedAction,
  submitAction,
  submitUltimate,
  toggleAuto,
  effects,
  attackingUnitIds,
  saveBoardProgress,
  ultimateCutscene,
}: {
  snapshot: LiveSnapshot;
  viewerId: string;
  busy: boolean;
  selectedAction: AvailableAction | null;
  setSelectedAction: (a: AvailableAction | null) => void;
  submitAction: (actionType: ActionType, targetId?: string, boardSwaps?: SwapMove[]) => void;
  submitUltimate: (casterId: string) => void;
  toggleAuto: (on: boolean) => void;
  effects: FloatingEffect[];
  attackingUnitIds: Set<string>;
  saveBoardProgress: (boardSwaps: SwapMove[]) => void;
  ultimateCutscene: { name: string; class: UnitClass; skillName: string } | null;
}) {
  const myTeam: TeamId | null = viewerId === snapshot.playerAId ? "A" : viewerId === snapshot.playerBId ? "B" : null;
  const opponentTeam: TeamId = myTeam === "A" ? "B" : "A";
  const isMyDecision = !!snapshot.awaiting && snapshot.awaiting.controlledByPlayerId === viewerId;
  const myAuto = myTeam === "A" ? snapshot.autoA : snapshot.autoB;
  const deadline = snapshot.awaiting?.deadline ?? null;
  const remainingSeconds = deadline !== null ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null;
  // OMA Gems (jeder Match-3-Brett-Modus: Puzzle-PvE, Kampagne, Gems-PvP, Turnier —
  // siehe boardMode in live-battle.ts) — nur dort zeigt der Server ein Brett im
  // Snapshot UND sind Heldenkarten mit vollem Rage-Balken per Klick sofort
  // auslösbar (siehe ultimateReadyFor unten). Vorher fälschlich per
  // `mode.includes("PUZZLE")` erkannt, was Kampagne/Gems-PvP/Turnier NICHT
  // erfasste (deren Mode-Strings enthalten "PUZZLE" nicht) — dort ließ sich das
  // Ultimate dadurch nie per Klick auslösen.
  const isPuzzleMode = snapshot.boardMode;

  const unitsByTeam = (team: TeamId) => snapshot.units.filter((u) => u.teamId === team);
  const unitById = (id: string) => snapshot.units.find((u) => u.instanceId === id);
  const nameOf = (id: string) => unitById(id)?.name ?? "?";

  // DOM-Positionen der Heldenkarten — für den Gems-Lichtstrahl gebraucht (siehe
  // handleGemsDestroyed unten), um zu wissen, WOHIN die zerstörten Steine
  // optisch fliegen sollen. Reine Refs, kein Re-Render.
  const cardElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const beamIdRef = useRef(0);
  const [beams, setBeams] = useState<GemBeam[]>([]);

  /** OMA Gems: fliegt einen Lichtstrahl von den gerade zerstörten Steinen zu
   *  JEDEM lebenden eigenen Helden der entsprechenden Klasse — macht sichtbar,
   *  welches Match welchen Helden gleich angreifen lässt, statt dass der
   *  Angriff (nach dem Server-Roundtrip) optisch aus dem Nichts kommt. */
  function handleGemsDestroyed(groups: { cls: UnitClass; rects: DOMRect[] }[]) {
    if (!myTeam) return;
    const newBeams: GemBeam[] = [];
    for (const group of groups) {
      const fromX = group.rects.reduce((sum, r) => sum + r.left + r.width / 2, 0) / group.rects.length;
      const fromY = group.rects.reduce((sum, r) => sum + r.top + r.height / 2, 0) / group.rects.length;
      const targets = unitsByTeam(myTeam).filter((u) => u.class === group.cls && u.isAlive);
      for (const target of targets) {
        const el = cardElementsRef.current.get(target.instanceId);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        newBeams.push({
          id: `beam-${beamIdRef.current++}`,
          cls: group.cls,
          fromX,
          fromY,
          toX: rect.left + rect.width / 2,
          toY: rect.top + rect.height / 2,
        });
      }
    }
    if (newBeams.length === 0) return;
    setBeams((prev) => [...prev, ...newBeams]);
    newBeams.forEach((b) => {
      window.setTimeout(() => setBeams((prev) => prev.filter((x) => x.id !== b.id)), GEM_BEAM_DURATION_MS + 80);
    });
  }
  // Bei OMA Gems (boardMode) sind eigene Zug-Slots in der Vorschau bedeutungslos
  // (siehe Kommentar am Render unten) — nur die Gegner-Slots zeigen, wann als
  // Nächstes ein Angriff auf einen selbst zukommt.
  // `ownTurnsBefore`: Anzahl eigener Zug-Slots, die in der rohen Reihenfolge VOR
  // diesem Gegner-Angriff liegen — 0 bedeutet "passiert direkt im Anschluss an
  // deinen nächsten Zug" (der Server löst dazwischenliegende Gegner-Züge sofort
  // mit auf, siehe advance() in interactive.ts), nicht "irgendwann später".
  const upcomingDisplay: { id: string; ownTurnsBefore: number }[] = snapshot.boardMode
    ? (() => {
        const result: { id: string; ownTurnsBefore: number }[] = [];
        let ownCount = 0;
        for (const id of snapshot.upcoming) {
          if (result.length >= 5) break;
          const u = unitById(id);
          if (!u) continue;
          if (u.teamId === opponentTeam) result.push({ id, ownTurnsBefore: ownCount });
          else ownCount++;
        }
        return result;
      })()
    : snapshot.upcoming.map((id) => ({ id, ownTurnsBefore: 0 }));

  const candidates = selectedAction ? (snapshot.awaiting?.candidateTargetsByAction[selectedAction.actionType] ?? []) : [];
  function glowFor(unit: LiveUnit): "enemy" | "ally" | null {
    if (!selectedAction || !candidates.includes(unit.instanceId)) return null;
    return selectedAction.targetKind === "enemy" ? "enemy" : "ally";
  }
  function ultimateReadyFor(unit: LiveUnit): boolean {
    return isPuzzleMode && myTeam !== null && unit.teamId === myTeam && unit.isAlive && unit.rage >= unit.ultimateCost;
  }
  function effectsFor(unit: LiveUnit): FloatingEffect[] {
    return effects.filter((e) => e.unitId === unit.instanceId);
  }

  // Board-Fortschritt für den aktuell wartenden Zug — null = noch nicht bestätigt
  // (Board wird angezeigt), sonst die gesammelten Swaps für die Aktions-Entscheidung.
  // Zurückgesetzt, sobald eine ANDERE Einheit wartet (neuer Zug).
  const [boardSwaps, setBoardSwaps] = useState<SwapMove[] | null>(null);
  const awaitingUnitId = snapshot.awaiting?.unitId ?? null;
  useEffect(() => {
    setBoardSwaps(null);
  }, [awaitingUnitId]);

  // Letztes bekanntes Brett merken (Match-3-Modus) — bleibt sichtbar (deaktiviert),
  // solange der Gegner am Zug ist, statt beim Zugwechsel durch einen reinen
  // Text-Platzhalter ersetzt zu werden.
  const [lastBoard, setLastBoard] = useState<{ grid: BoardGrid; moveBudget: number } | null>(null);
  useEffect(() => {
    if (snapshot.awaiting?.board) {
      setLastBoard({ grid: snapshot.awaiting.board.grid, moveBudget: snapshot.awaiting.board.moveBudget });
    }
  }, [snapshot.awaiting?.board]);

  // Gems-PvP-Sieges-Kiste: einmal eingesammelt, bleibt die Öffnen-Animation für
  // den Rest dieser Kampf-Ansicht ausgeblendet (Snapshot wird weiter gepollt).
  const [chestDismissed, setChestDismissed] = useState(false);

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

  function handleActionClick(action: AvailableAction) {
    if (action.targetKind === "none") {
      submitAction(action.actionType, undefined, boardSwaps ?? undefined);
    } else {
      setSelectedAction(action);
    }
  }

  function handleUnitClick(unit: LiveUnit) {
    if (selectedAction) {
      if (!candidates.includes(unit.instanceId)) return;
      submitAction(selectedAction.actionType, unit.instanceId, boardSwaps ?? undefined);
      return;
    }
    if (ultimateReadyFor(unit)) submitUltimate(unit.instanceId);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative z-10 px-3">
      <GemBeamOverlay beams={beams} />
      {snapshot.status === "finished" && snapshot.chestPrize && !chestDismissed && (
        <VictoryChestReveal prize={snapshot.chestPrize} onClose={() => setChestDismissed(true)} />
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
      {/* Auto-Kampf + Als nächstes dran — oberhalb der Helden. Bei OMA Gems
          (boardMode) ist die klassische Zugreihenfolge für den Spieler
          bedeutungslos (alle eigenen Helden greifen ohnehin gemeinsam per
          Match an, nie einzeln der Reihe nach) — hier zählt stattdessen, WANN
          als Nächstes ein Gegner angreift, daher gefiltert auf reine
          Gegner-Slots und umbenannt (siehe upcoming-Puffergröße in
          live-battle.ts). */}
      <div className="shrink-0 pt-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          {upcomingDisplay.length > 0 ? (
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
              {snapshot.boardMode ? "Nächste Gegner-Angriffe" : "Als nächstes dran"}
            </span>
          ) : (
            <span />
          )}
          {snapshot.status !== "finished" && myTeam && !snapshot.boardMode && (
            <button
              type="button"
              onClick={() => toggleAuto(!myAuto)}
              disabled={busy}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors disabled:opacity-40 shrink-0 ${
                myAuto ? "bg-violet-500/20 text-violet-300" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
              }`}
            >
              <Bot className="w-3 h-3" /> Auto {myAuto ? "an" : "aus"}
            </button>
          )}
        </div>
        {upcomingDisplay.length > 0 && (
          // py-1.5 gibt dem Rahmen (boxShadow, ragt ~3px über den Kreis hinaus) Platz,
          // bei boardMode zusätzlich Raum für das "sofort"/"in X"-Badge unterhalb jedes
          // Kreises — sonst schneidet overflow-x-auto (erzwingt overflow-y: auto) ab.
          <div className={`flex items-center gap-2 overflow-x-auto ${snapshot.boardMode ? "pt-1.5 pb-3" : "py-1.5"}`}>
            {upcomingDisplay.map(({ id, ownTurnsBefore }, i) => {
              const u = unitById(id);
              if (!u) return null;
              const isMine = myTeam !== null && u.teamId === myTeam;
              const ringColor = isMine ? "#3b82f6" : "#ef4444";
              const config = getClassConfig(u.class);
              const Icon = config.icon;
              return (
                <div key={`${id}-${i}`} className="relative shrink-0" style={{ opacity: 1 - i * 0.08 }}>
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden"
                    style={{ boxShadow: `0 0 0 3px ${ringColor}` }}
                    title={u.name}
                  >
                    {u.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.imageUrl} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: `${config.color}33` }}>
                        <Icon className="w-6 h-6" style={{ color: config.color }} />
                      </div>
                    )}
                  </div>
                  {snapshot.boardMode && (
                    <span
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 text-[7px] sm:text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: ownTurnsBefore === 0 ? "#f97316" : "#3f3f46", color: ownTurnsBefore === 0 ? "#000" : "#d4d4d8" }}
                    >
                      {ownTurnsBefore === 0 ? "sofort" : `in ${ownTurnsBefore}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Kampffeld — füllt den Freiraum, Helden werden ans untere Ende gesetzt
          (direkt über der Entscheidung), statt in der Mitte zu schweben. */}
      <div className="flex-1 flex flex-col justify-end gap-3 min-h-0 py-2">
        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
          {unitsByTeam(opponentTeam).map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              isActing={snapshot.awaiting?.unitId === u.instanceId}
              glow={glowFor(u)}
              effects={effectsFor(u)}
              isAttacking={attackingUnitIds.has(u.instanceId)}
              onClick={() => handleUnitClick(u)}
            />
          ))}
        </div>
        <div className="border-t border-white/10 mx-6" />
        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
          {unitsByTeam(myTeam ?? "A").map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              // Bei OMA Gems (boardMode) greifen ohnehin immer alle eigenen
              // Helden gemeinsam per Match an — "Am Zug" für eine einzelne
              // Einheit wäre hier irreführend, da es keine echte Einzel-Zug-
              // Aktion mehr gibt (siehe applyBoardRage in interactive.ts).
              isActing={!snapshot.boardMode && snapshot.awaiting?.unitId === u.instanceId}
              glow={glowFor(u)}
              ultimateReady={ultimateReadyFor(u)}
              effects={effectsFor(u)}
              isAttacking={attackingUnitIds.has(u.instanceId)}
              onClick={() => handleUnitClick(u)}
              onUltimateClick={() => handleUnitClick(u)}
              cardRef={(el) => {
                if (el) cardElementsRef.current.set(u.instanceId, el);
                else cardElementsRef.current.delete(u.instanceId);
              }}
            />
          ))}
        </div>
      </div>

      {/* Entscheidung — direkt unter den Helden */}
      <div className="shrink-0 space-y-1.5">
        {snapshot.status === "finished" ? (
          <div
            className="flex items-center gap-3 rounded-xl p-3 overflow-hidden relative"
            style={{
              background:
                snapshot.winner === null
                  ? "linear-gradient(135deg, #27272a 0%, #18181b 100%)"
                  : snapshot.winner === myTeam
                    ? "linear-gradient(135deg, #78350f 0%, #451a03 100%)"
                    : "linear-gradient(135deg, #3f1224 0%, #1c0a12 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{
                background:
                  snapshot.winner === null
                    ? "radial-gradient(circle at 35% 28%, #9ca3af, #4b5563)"
                    : snapshot.winner === myTeam
                      ? "radial-gradient(circle at 35% 28%, #fde68a, #d97706)"
                      : "radial-gradient(circle at 35% 28%, #fca5a5, #b91c1c)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              {snapshot.winner === null ? (
                <Handshake className="w-5 h-5 text-black/70" strokeWidth={2.2} />
              ) : snapshot.winner === myTeam ? (
                <Trophy className="w-5 h-5 text-black/70" strokeWidth={2.2} />
              ) : (
                <Skull className="w-5 h-5 text-black/70" strokeWidth={2.2} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-battle text-base text-white uppercase tracking-wide">
                {snapshot.winner === null ? "Unentschieden" : snapshot.winner === myTeam ? "Sieg!" : "Niederlage"}
              </p>
              {snapshot.campaignResult ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((n) => {
                      const earned = n <= snapshot.campaignResult!.stars;
                      const isNew = earned && n > snapshot.campaignResult!.stars - snapshot.campaignResult!.starsGained;
                      return (
                        <Star
                          key={n}
                          className={`w-4 h-4 animate-number-pop ${earned ? "text-amber-400" : "text-gray-700"} ${isNew ? "drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : ""}`}
                          style={{ animationDelay: `${n * 140}ms` }}
                          fill={earned ? "currentColor" : "none"}
                        />
                      );
                    })}
                  </div>
                  {snapshot.campaignResult.starsGained > 0 && (
                    <span
                      className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 animate-number-pop"
                      style={{ animationDelay: "560ms" }}
                    >
                      +{snapshot.campaignResult.starsGained} Stern{snapshot.campaignResult.starsGained === 1 ? "" : "e"}
                      {snapshot.campaignResult.coinsAwarded > 0 && (
                        <span className="flex items-center gap-0.5 text-gray-400 font-normal">
                          (+{snapshot.campaignResult.coinsAwarded} <CoinIcon size={11} />)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Kampf beendet.</p>
              )}
            </div>
            {snapshot.resultBattleId && (
              <Link
                href={`/battle-cards/battles/${snapshot.resultBattleId}`}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/15 transition-colors shrink-0"
              >
                Zum Ergebnis <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : isMyDecision && snapshot.awaiting ? (
          // Feste Höhe (unabhängig von 1-3 verfügbaren Aktionen bzw. Ziel-Auswahl-
          // Ansicht) — sonst verschieben sich die Helden darüber je nach Rage-Stand
          // von Zug zu Zug, weil dieses Panel mal höher, mal niedriger wäre.
          <div className="glass rounded-xl p-2.5 h-[212px] lg:h-[300px] overflow-y-auto flex flex-col">
            {snapshot.awaiting.board && boardSwaps === null ? (
              <BoardMatch3
                turnId={snapshot.awaiting.unitId}
                grid={snapshot.awaiting.board.grid}
                moveBudget={snapshot.awaiting.board.moveBudget}
                disabled={busy}
                initialSwaps={snapshot.awaiting.board.appliedSwaps}
                // OMA Gems: kein Zwischenschritt "Aktion wählen" — sobald das Zug-
                // Budget aufgebraucht ist, läuft der reguläre Zug automatisch (wie
                // bei der KI, siehe interactive.ts); der Spieler greift ausschließlich
                // per Ultimate-Klick auf eine voll aufgeladene Heldenkarte an. Der
                // hier übergebene actionType wird serverseitig für boardMode-Züge
                // ignoriert (Platzhalter).
                onConfirm={(swaps) => submitAction("normalAttack", undefined, swaps)}
                onProgress={saveBoardProgress}
                onGemsDestroyed={handleGemsDestroyed}
              />
            ) : selectedAction ? (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <ActionIcon actionType={selectedAction.actionType} className="w-4 h-4 text-teal-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white">{selectedAction.name}</p>
                      <EstimateBadge estimate={selectedAction.estimate} />
                    </div>
                    <p className="text-[11px] text-gray-400">{selectedAction.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-teal-300">Markierte Karte antippen, um das Ziel zu wählen.</p>
                  <button
                    type="button"
                    onClick={() => setSelectedAction(null)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                  >
                    ← Zurück
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">Du bist am Zug — wähle eine Aktion.</p>
                  {remainingSeconds !== null && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 tabular-nums shrink-0">
                      <Timer className="w-3 h-3" /> {remainingSeconds}s
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {snapshot.awaiting.actions.map((action) => (
                    <button
                      key={action.actionType}
                      type="button"
                      onClick={() => handleActionClick(action)}
                      disabled={busy}
                      className="w-full flex items-start gap-2 text-left px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                    >
                      <ActionIcon actionType={action.actionType} className="w-3.5 h-3.5 text-teal-300 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-semibold text-white">{action.name}</p>
                          {action.cost > 0 && (
                            <span className="text-[10px] font-semibold text-amber-400 tabular-nums shrink-0">{action.cost} Rage</span>
                          )}
                          <EstimateBadge estimate={action.estimate} />
                        </div>
                        <p className="text-[10px] text-gray-400 leading-snug truncate">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : snapshot.boardMode && lastBoard ? (
          // Brett bleibt sichtbar (nur deaktiviert), solange der Gegner am Zug ist —
          // verschwindet nicht mehr hinter einem reinen Text-Platzhalter.
          <div className="glass rounded-xl p-2.5 h-[212px] lg:h-[300px] overflow-y-auto flex flex-col gap-1.5">
            <BoardMatch3
              grid={lastBoard.grid}
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
            {myAuto
              ? "Auto-Kampf aktiv — deine Züge laufen automatisch."
              : !snapshot.awaiting
                ? "Kampf läuft automatisch weiter…"
                : remainingSeconds !== null
                  ? `Gegner ist am Zug… (${remainingSeconds}s)`
                  : "Gegner ist am Zug…"}
          </p>
        )}
      </div>

      {/* Text, was passiert — unterhalb der Entscheidung */}
      <div className="shrink-0 surface rounded-md px-3 py-1.5 mt-1.5 mb-[max(0.5rem,env(safe-area-inset-bottom))] h-[52px] flex flex-col justify-end overflow-hidden bg-black/30">
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
