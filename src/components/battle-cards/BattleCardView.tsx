"use client";

// ============================================
// Battle-Card — Vorder-/Rückseite mit Tap-Flip
// ============================================
// Layout nach PROJECT_CONTEXT.md: Vorderseite = Name/Sterne, Artwork,
// Klasse+Titel, Flavor-Text, Stat-Kacheln, Passiv-Icons. Rückseite (Tap) =
// volle Skill-Details (Passiv+/-, Aktiv, Ultimate je mit Rage-Kosten).
// Noch kein Artwork vorhanden (siehe Kontext-Dokument) — Klassen-Icon als
// Platzhalter im Artwork-Fenster.

import { useState } from "react";
import { motion } from "motion/react";
import { Shield, Swords, HeartPulse, ThumbsUp, ThumbsDown, Zap, Flame, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BattleCardSkill {
  name: string;
  description: string;
  cost?: number;
}

export interface BattleCardData {
  name: string;
  title: string;
  class: "TANK" | "DAMAGE_DEALER" | "SUPPORT";
  rarity: "STANDARD" | "COMMUNITY";
  flavorText: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  activityTier?: "GHOST" | "NPC" | "GAMER" | "LEGENDE" | "OLD_MASTER" | null;
  passivePositive: BattleCardSkill;
  passiveNegative: BattleCardSkill;
  activeSkill: BattleCardSkill;
  ultimateSkill: BattleCardSkill;
  level?: number;
  imageUrl?: string | null;
  /** Echtes Discord-Profilbild als kleines Badge — nur gesetzt, wenn imageUrl ein
   *  individuelles Artwork ist (siehe card-view.ts toCardData). */
  avatarBadgeUrl?: string | null;
}

export const CLASS_CONFIG: Record<BattleCardData["class"], { label: string; color: string; icon: LucideIcon }> = {
  TANK: { label: "Tank", color: "#14b8a6", icon: Shield },
  DAMAGE_DEALER: { label: "Damage Dealer", color: "#ef4444", icon: Swords },
  SUPPORT: { label: "Support", color: "#8b5cf6", icon: HeartPulse },
};

export const LEVEL_BORDER: Record<number, string> = {
  1: "#71717a", // grau
  2: "#b45309", // bronze
  3: "#a1a1aa", // silber
  4: "#f59e0b", // gold
  5: "#a855f7", // prismatisch (Basiston, Glow ergänzt Regenbogen-Effekt)
};

// Reserviert genug Höhe für den maximal langen Beschreibungstext (siehe
// CARD_FLAVOR_TEXT_MAX_LENGTH = 100 Zeichen, lib/battle-cards/card-content.ts),
// auch auf schmalen Karten (2-spaltiges Mobil-Grid). Kürzere Texte lassen
// hier einfach mehr Leerraum statt die Karte zu verkleinern.
const FLAVOR_TEXT_MIN_HEIGHT = "65px";

const ACTIVITY_TIER_ICON: Record<NonNullable<BattleCardData["activityTier"]>, string> = {
  GHOST: "💤",
  NPC: "🎮",
  GAMER: "🎖",
  LEGENDE: "🔥",
  OLD_MASTER: "👑",
};

function LevelStars({ level }: { level: number }) {
  const filled = Math.max(0, level - 1);
  return (
    <div className="flex gap-0.5" aria-label={`Stufe ${level}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="text-[10px] leading-none"
          style={{ color: i < filled ? LEVEL_BORDER[level] : "rgba(255,255,255,0.15)" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface rounded-md px-2 py-1 flex-1 text-center">
      <p className="text-[9px] text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

function SkillRow({
  icon: Icon,
  iconColor,
  skill,
}: {
  icon: LucideIcon;
  iconColor: string;
  skill: BattleCardSkill;
}) {
  return (
    <div className="flex gap-2">
      <div
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5"
        style={{ background: `${iconColor}22`, color: iconColor }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-white truncate">{skill.name}</p>
          {typeof skill.cost === "number" && (
            <span className="text-[9px] font-medium text-amber-400 tabular-nums shrink-0">{skill.cost} Rage</span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 leading-snug">{skill.description}</p>
      </div>
    </div>
  );
}

export default function BattleCardView({ card, dimmed = false }: { card: BattleCardData; dimmed?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const level = card.level ?? 1;
  const classConfig = CLASS_CONFIG[card.class];
  const ClassIcon = classConfig.icon;
  const borderColor = LEVEL_BORDER[level] ?? LEVEL_BORDER[1];

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="block w-full max-w-[240px] text-left cursor-pointer"
      style={{ perspective: 1200, opacity: dimmed ? 0.45 : 1, filter: dimmed ? "grayscale(0.85)" : undefined }}
      aria-label={`${card.name} — Tippen zum Umdrehen`}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative w-full aspect-[1/2]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ── Vorderseite ── */}
        <div
          className="card-cut absolute inset-0 surface-elevated p-2 flex flex-col gap-1.5"
          style={{
            backfaceVisibility: "hidden",
            boxShadow: `var(--shadow-card), 0 0 0 1.5px ${borderColor}`,
          }}
        >
          <div className="flex items-start justify-between gap-1 shrink-0">
            <div className="min-w-0">
              <p className="text-[13px] font-black text-white leading-tight truncate">{card.name}</p>
              <LevelStars level={level} />
            </div>
            {card.rarity === "COMMUNITY" && card.activityTier && (
              <span className="shrink-0 text-[11px]" title={card.activityTier}>
                {card.activityTier === "OLD_MASTER" ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    Old Master
                  </span>
                ) : (
                  ACTIVITY_TIER_ICON[card.activityTier]
                )}
              </span>
            )}
          </div>

          <div
            className="rounded-lg flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${classConfig.color}22, rgba(255,255,255,0.02))` }}
          >
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain" />
            ) : (
              <ClassIcon className="w-12 h-12" style={{ color: classConfig.color, opacity: 0.5 }} />
            )}
            {card.avatarBadgeUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.avatarBadgeUrl}
                alt=""
                title="Echtes Profilbild"
                className="absolute bottom-1 right-1 w-6 h-6 rounded-full object-cover"
                style={{ border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ClassIcon className="w-3 h-3 shrink-0" style={{ color: classConfig.color }} />
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: `${classConfig.color}22`, color: classConfig.color }}
            >
              {classConfig.label}
            </span>
            <span className="text-[11px] text-gray-400 truncate">{card.title}</span>
          </div>

          <div className="shrink-0" style={{ minHeight: FLAVOR_TEXT_MIN_HEIGHT }}>
            {card.flavorText && (
              <p className="text-[10px] text-gray-500 italic leading-snug">{card.flavorText}</p>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <StatTile label="HP" value={card.baseHp} />
            <StatTile label="ATK" value={card.baseAttack} />
            <StatTile label="SPD" value={card.speed} />
          </div>

          <div className="flex items-center justify-center gap-3 pt-0.5 border-t border-white/[0.06] shrink-0">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400" title={card.passivePositive.name}>
              <ThumbsUp className="w-3 h-3" /> {card.passivePositive.name}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-rose-400" title={card.passiveNegative.name}>
              <ThumbsDown className="w-3 h-3" /> {card.passiveNegative.name}
            </span>
          </div>
        </div>

        {/* ── Rückseite ── */}
        <div
          className="card-cut absolute inset-0 surface-elevated p-3 flex flex-col gap-2 overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: `var(--shadow-card), 0 0 0 1.5px ${borderColor}`,
          }}
        >
          <div className="flex items-center justify-between shrink-0">
            <p className="text-[11px] font-bold text-white uppercase tracking-wide">{card.name}</p>
            <RotateCcw className="w-3 h-3 text-gray-600" />
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1 -mr-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <SkillRow icon={ThumbsUp} iconColor="#34d399" skill={card.passivePositive} />
            <SkillRow icon={ThumbsDown} iconColor="#fb7185" skill={card.passiveNegative} />
            <SkillRow icon={Zap} iconColor="#60a5fa" skill={card.activeSkill} />
            <SkillRow icon={Flame} iconColor="#fbbf24" skill={card.ultimateSkill} />
          </div>
        </div>
      </motion.div>
    </button>
  );
}
