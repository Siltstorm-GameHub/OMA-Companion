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
import { ThumbsDown, Flame, RotateCcw } from "@/components/icons";
import type { LucideIcon } from "lucide-react";
import { CLASS_CONFIG, getClassConfig } from "@/lib/battle-cards/class-config";
import { MOBA_ICON } from "@/lib/battle-cards/moba-icons";
import MobaIcon from "./MobaIcon";
import TeCharacter from "@/components/te-character/TeCharacter";
import CardBackdrop from "./CardBackdrop";
import { TE_CROP_FIGURE, poseAnim, type TeCharacterConfig, type TeDir } from "@/lib/te-character";

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
  /** Charakter des Mitglieds (Community-Karte) — hat als Hauptmotiv Vorrang vor imageUrl. */
  teCharacter?: TeCharacterConfig | null;
  /** Echtes Discord-Profilbild als kleines Badge — nur gesetzt, wenn imageUrl ein
   *  individuelles Artwork ist (siehe card-view.ts toCardData). */
  avatarBadgeUrl?: string | null;
}

export { CLASS_CONFIG, getClassConfig };

export const LEVEL_BORDER: Record<number, string> = {
  1: "#71717a", // grau
  2: "#b45309", // bronze
  3: "#a1a1aa", // silber
  4: "#f59e0b", // gold
  5: "#a855f7", // prismatisch (Basiston, Glow ergänzt Regenbogen-Effekt)
};

/** MOBA-Style-Kartenrahmen (echte Alpha-Transparenz, KEIN Schwarz-Hintergrund/
 *  screen-Blend wie die frühere Canva-Rahmen-Serie) — ein Rahmen für alle
 *  Stufen, die Rarität zeigt sich stattdessen über LEVEL_BORDER als Farb-Glow
 *  (siehe cardFaceShadow) + LevelStars. */
export const MOBA_CARD_FRAME_IMAGE = "/battle-cards/moba/card-frame.png";

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
    <div className="rounded-md px-2 py-1 flex-1 text-center bg-black/30 border border-[color:var(--moba-accent-line)]">
      <p className="text-[9px] text-[color:var(--moba-ink-dim)] uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black tabular-nums text-[color:var(--moba-accent)]">{value}</p>
    </div>
  );
}

function SkillRow({
  icon,
  iconColor,
  skill,
}: {
  /** MOBA-Icon-Pfad (string) für Skills mit Kit-Entsprechung, sonst als
   *  Ausnahme ein Lucide-Icon (z.B. Flame/ThumbsDown — kein Kit-Äquivalent). */
  icon: string | LucideIcon;
  iconColor: string;
  skill: BattleCardSkill;
}) {
  const Icon = typeof icon === "string" ? null : icon;
  return (
    <div className="flex gap-2">
      <div
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5"
        style={{ background: `${iconColor}22`, color: iconColor }}
      >
        {Icon ? <Icon className="w-3.5 h-3.5" /> : <img src={icon as string} alt="" aria-hidden className="w-3.5 h-3.5 object-contain" />}
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

export default function BattleCardView({
  card,
  dimmed = false,
  hidePassives = false,
  characterDir = "down",
}: {
  card: BattleCardData;
  /** Blickrichtung des Charakters im Kartenmotiv (Editor: zum Prüfen aller Details drehbar). */
  characterDir?: TeDir;
  dimmed?: boolean;
  /** OMA Duels: Passiv-Fähigkeiten feuern dort nie (keine Initiative-Runden-
   *  Trigger wie battleStart/turnStart/roundEnd), ihre Anzeige wäre also
   *  irreführend — blendet sie auf Vorder- UND Rückseite aus, ohne die
   *  gemeinsame Komponente für den alten PVE-Modus (wo Passive real wirken)
   *  anzufassen. */
  hidePassives?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  // true = Karte schrumpft gerade auf Breite 0 (danach wird die Seite getauscht)
  const [closing, setClosing] = useState(false);
  const startFlip = () => { if (!closing) setClosing(true); };
  // Fällt auf das Klassen-Icon zurück, falls das Artwork nicht lädt (Netzwerk-
  // Hänger/Timeout), statt die Karte dauerhaft leer zu lassen.
  const [imgFailed, setImgFailed] = useState(false);
  const level = card.level ?? 1;
  const classConfig = getClassConfig(card.class);
  const borderColor = LEVEL_BORDER[level] ?? LEVEL_BORDER[1];
  // Höchststufe (prismatisch) bekommt zusätzlich einen stärkeren Glow + wiederkehrenden
  // Lichtsweep, damit sie sich auch in der vollen Flip-Karte (nicht nur der
  // CardTile-Kachel, siehe dortiges level>=5-Glow) als Top-Tier absetzt.
  const isMaxLevel = level >= 5;
  // MOBA-Skin: ein Rahmen-Asset für alle Stufen (s.o.), die Rarität zeigt sich
  // über einen stufenfarbigen Glow statt über 5 unterschiedliche Rahmenbilder.
  const cardFaceShadow = `var(--shadow-card), 0 0 ${isMaxLevel ? 22 : 12}px ${borderColor}66`;

  return (
    // Umdrehen ohne 3D: die Karte schrumpft in der Breite auf 0, tauscht dann die Seite und wächst wieder.
    // Die frühere 3D-Drehung (perspective + preserve-3d + backface-visibility) ließ die Rückseite je nach
    // Browser/Umgebung neben ihren Platz springen — ohne 3D-Kontext kann nichts verrutschen. Größe und Position
    // hängen am (nicht animierten) äußeren Block; es ist bewusst kein <button> (Browser zentrieren dessen Inhalt).
    <div
      role="button"
      tabIndex={0}
      onClick={startFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startFlip(); }
      }}
      className="relative block w-full max-w-[240px] shrink-0 grow-0 text-left cursor-pointer"
      // Feste Kartengröße (1:2) am äußeren Block: Vorder- und Rückseite liegen nur absolut darin und können die Höhe nie beeinflussen,
      // auch nicht in Flex-/Grid-Umgebungen (Modal, Editor) oder wenn eine Seite gerade ausgeblendet ist.
      style={{ opacity: dimmed ? 0.45 : 1, filter: dimmed ? "grayscale(0.85)" : undefined, aspectRatio: "1 / 2" }}
      aria-label={`${card.name} — Tippen zum Umdrehen`}
    >
      {/* Grundbreite für Container, die sich nach dem Inhalt richten (Flex mit items-center, Grid mit auto): beide
          Kartenseiten liegen absolut und geben dem Rahmen sonst keine Breite (früher lieferte das ein <button>). Ein
          Bild (ersetztes Element) mit max-width:100% ist "komprimierbar" — es dehnt den Container nie über seine
          Breite hinaus, gibt aber die 240 px als Wunschbreite vor. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden
        draggable={false}
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        className="block pointer-events-none"
        style={{ width: 240, maxWidth: "100%", height: 0 }}
      />
      <motion.div
        animate={{ scaleX: closing ? 0 : 1 }}
        transition={{ duration: 0.14, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (closing) { setFlipped((f) => !f); setClosing(false); }
        }}
        className="absolute inset-0"
        style={{ transformOrigin: "50% 50%" }}
      >
        {/* ── Vorderseite ── */}
        <div
          className="card-cut moba-panel absolute inset-0 px-3.5 pt-9 pb-11 flex flex-col gap-2 overflow-hidden"
          style={{
            display: flipped ? "none" : undefined,
            boxShadow: cardFaceShadow,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MOBA_CARD_FRAME_IMAGE}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ objectFit: "fill" }}
          />
          {isMaxLevel && (
            <motion.div
              className="absolute inset-y-0 left-0 w-1/4 pointer-events-none z-10"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", skewX: -20 }}
              initial={{ x: "-220%" }}
              animate={{ x: "520%" }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
            />
          )}
          {/* Name+Sterne zentriert statt linksbündig — die Rahmen-Ornamentik (Canva-Artwork)
              reicht an den Ecken tief in die Karte hinein (bei x=5-10% bis zu 35% der Höhe),
              zur horizontalen Mitte hin aber nur ~2-6%. Zentrierter Text bleibt so unterhalb
              der Ornamentik statt darunter/dahinter zu verschwinden. */}
          <div className="flex flex-col items-center text-center gap-0.5 shrink-0">
            <p className="font-battle text-[13px] text-white leading-tight truncate max-w-full">{card.name}</p>
            <LevelStars level={level} />
          </div>

          <div
            className="rounded-lg flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${classConfig.color}22, rgba(255,255,255,0.02))` }}
          >
            <CardBackdrop config={card.teCharacter} />
            {card.teCharacter ? (
              <TeCharacter config={card.teCharacter} anim={poseAnim(card.teCharacter)} dir={characterDir} crop={TE_CROP_FIGURE} scale={4} className="max-h-full w-auto" title={card.name} />
            ) : card.imageUrl && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-full object-contain"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <img src={classConfig.icon} alt="" aria-hidden className="w-12 h-12 object-contain" style={{ opacity: 0.6 }} />
            )}
            {/* Aktivitäts-Badge zieht in die Artwork-Box um — dort bereits ausreichend von
                der Rahmen-Ornamentik entfernt, statt am äußeren Karten-Eck zu kollidieren. */}
            {card.rarity === "COMMUNITY" && card.activityTier && (
              <span className="absolute top-1 right-1 text-[11px]" title={card.activityTier}>
                {card.activityTier === "OLD_MASTER" ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide bg-amber-400/15 text-amber-300 border border-amber-400/30 backdrop-blur-sm">
                    Old Master
                  </span>
                ) : (
                  <span className="px-1 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">{ACTIVITY_TIER_ICON[card.activityTier]}</span>
                )}
              </span>
            )}
            {card.avatarBadgeUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.avatarBadgeUrl}
                alt=""
                title="Echtes Profilbild"
                className="absolute bottom-1.5 left-1.5 w-10 h-10 rounded-full object-cover z-[1]"
                style={{ border: `2px solid ${classConfig.color}`, boxShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
              />
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 shrink-0">
            <img src={classConfig.icon} alt="" aria-hidden className="w-3 h-3 shrink-0 object-contain" />
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
              <p className="text-[10px] text-gray-500 italic leading-snug text-center">{card.flavorText}</p>
            )}
          </div>

          {/* Stat-Kacheln als schmalere, zentrierte Gruppe statt volle Kartenbreite — die
              äußeren Ecken der Kacheln würden sonst in die tiefer reichende Eck-Ornamentik
              unten links/rechts hineinragen. */}
          <div className="flex gap-1 shrink-0 max-w-[62%] mx-auto w-full">
            <StatTile label="HP" value={card.baseHp} />
            <StatTile label="ATK" value={card.baseAttack} />
            <StatTile label="SPD" value={card.speed} />
          </div>

          {!hidePassives && (
            <div className="flex items-center justify-center gap-3 pt-0.5 border-t border-white/[0.06] shrink-0">
              <span className="flex items-center gap-1 text-[10px] text-emerald-400" title={card.passivePositive.name}>
                <MobaIcon name="like" className="w-3 h-3" /> {card.passivePositive.name}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-rose-400" title={card.passiveNegative.name}>
                <ThumbsDown className="w-3 h-3" /> {card.passiveNegative.name}
              </span>
            </div>
          )}
        </div>

        {/* ── Rückseite ── */}
        <div
          className="card-cut moba-panel absolute inset-0 px-4 pt-9 pb-6 flex flex-col gap-2 overflow-hidden"
          style={{
            display: flipped ? undefined : "none",
            boxShadow: cardFaceShadow,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MOBA_CARD_FRAME_IMAGE}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ objectFit: "fill" }}
          />
          <div className="relative flex items-center justify-center shrink-0">
            <p className="font-battle text-[11px] text-white uppercase tracking-wide truncate max-w-[80%]">{card.name}</p>
            <RotateCcw className="absolute right-0 w-3 h-3 text-gray-600" />
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1 -mr-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {!hidePassives && (
              <>
                <SkillRow icon={MOBA_ICON.like} iconColor="#34d399" skill={card.passivePositive} />
                <SkillRow icon={ThumbsDown} iconColor="#fb7185" skill={card.passiveNegative} />
              </>
            )}
            <SkillRow icon={MOBA_ICON.attack} iconColor="#60a5fa" skill={card.activeSkill} />
            <SkillRow icon={Flame} iconColor="#fbbf24" skill={card.ultimateSkill} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
