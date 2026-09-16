"use client";

// ============================================
// OMA Duels (Yu-Gi-Oh-artiges Live-PvP) — Vollbild-Spielbrett
// ============================================
// Echte Yu-Gi-Oh-Phasenstruktur: Hauptphase 1 -> Kampfphase -> Hauptphase 2 ->
// Zugende (30s-Schachuhr über den GESAMTEN Zug, siehe DUEL_TURN_TIMEOUT_MS).
// Jede Aktion (Beschwören, Stellung wechseln, Taktik-Karte spielen, ein
// Angriff, eine Phase weiterschalten) ist ein EIGENER Server-Request, der
// sofort aufgelöst wird — kein lokal gesammelter Zug-Entwurf mehr wie in der
// Vorversion. Nur ein Normalangriff pro Einheit (kein separater Skill-Knopf
// mehr), Ultimate bleibt erhalten, wird aber erst angezeigt, sobald genug
// Rage vorhanden ist.
//
// Zeigt echte Kartenbilder auf dem Feld/in der Hand, verdeckte Kartenrücken
// für die gegnerische Hand/Fallen, Treffer-Feedback (fliegende Zahlen, kurzer
// Impact-Flash) und Sound.
//
// Reine Präsentations-/Steuerungskomponente — die eigentliche Kampflogik läuft
// ausschließlich serverseitig (lib/battle-cards/duel-live-battle.ts).

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wind, X } from "lucide-react";
import MobaIcon from "./MobaIcon";
import { MOBA_ICON } from "@/lib/battle-cards/moba-icons";
import { getClassConfig, type BattleCardData } from "./BattleCardView";
import CardTile from "./CardTile";
import TacticCardTile from "./TacticCardTile";
import StatBadges from "./StatBadges";
import ErrorNotice from "./ErrorNotice";
import { DUEL_TURN_TIMEOUT_MS } from "@/lib/battle-engine/duel-constants";
import { scaleStatsForLevel } from "@/lib/battle-engine/stats";
import {
  isSoundMuted,
  playCardRevealSound,
  playDamageSoundFor,
  playDefeatSound,
  playHealSound,
  playShieldSound,
  playUltimateSoundFor,
  playVictorySound,
  setSoundMuted,
} from "@/lib/battle-cards/sound";
import type { UnitClass } from "@/lib/battle-engine/types";

type TeamId = "A" | "B";
type DuelAttackType = "normalAttack" | "ultimate";
type DuelStance = "attack" | "defense";
type DuelPhase = "main1" | "battle" | "main2";

interface LiveDuelUnit {
  instanceId: string;
  slotIndex: number;
  name: string;
  class: UnitClass;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  rage: number;
  ultimateCost: number;
  isAlive: boolean;
  imageUrl?: string | null;
  stance: DuelStance;
  ultimateSkillName: string;
  ultimateSkillDescription: string;
  summonedThisTurn: boolean;
  attackedThisTurn: boolean;
  stanceLockedThisTurn: boolean;
}

interface LiveDuelHandCard {
  cardId: string;
  kind: "unit" | "tactic";
  name: string;
  imageUrl?: string | null;
  unitClass?: UnitClass;
  unitCard?: BattleCardData;
  tacticKind?: "INSTANT" | "TRAP";
  tacticDescription?: string;
  requiresTarget?: "enemy" | "ally";
}

interface LiveDuelPlayer {
  lifePoints: number;
  field: (LiveDuelUnit | null)[];
  deckCount: number;
  graveyardCount: number;
  trapCount: number;
  hand: LiveDuelHandCard[] | null;
  handCount: number;
}

interface DuelLogEntry {
  type: string;
  round?: number;
  sourceId?: string;
  targetId?: string;
  actorId?: string;
  actionType?: string;
  amount?: number;
  isCrit?: boolean;
  attackerUnitId?: string;
  defenderUnitId?: string;
  attackerTeam?: TeamId;
  defendingTeam?: TeamId;
  winnerUnitId?: string;
  loserUnitId?: string;
  damagedTeam?: TeamId;
  remainingLp?: number;
  unitId?: string;
  winner?: TeamId | "DRAW";
  team?: TeamId;
  slotIndex?: number;
  stance?: DuelStance;
  mode?: "instant" | "setFaceDown";
}

interface LiveDuelSnapshot {
  id: string;
  status: "active" | "finished";
  round: number;
  turnDeadline: number;
  viewerTeam: TeamId;
  activeTeam: TeamId;
  phase: DuelPhase;
  normalSummonUsed: boolean;
  tacticPlayedThisTurn: boolean;
  self: LiveDuelPlayer;
  opponent: LiveDuelPlayer;
  log: DuelLogEntry[];
  winner: TeamId | "DRAW" | null;
  resultBattleId: string | null;
}

type DuelAction =
  | { type: "summon"; handCardId: string; slotIndex: number; stance: DuelStance }
  | { type: "changeStance"; slotIndex: number; stance: DuelStance }
  | { type: "playTactic"; handCardId: string; mode: "instant" | "setFaceDown"; targetSlotIndex?: number }
  | { type: "declareAttack"; slotIndex: number; attackType: DuelAttackType; targetSlotIndex: number }
  | { type: "advancePhase" }
  | { type: "endTurn" };

interface FloatingEffect {
  id: string;
  side: "self" | "opponent";
  anchor: { kind: "slot"; slotIndex: number } | { kind: "lp" };
  text: string;
  tone: "damage" | "crit" | "heal" | "shield" | "info";
}

/** Großer, kurzer Reveal-Effekt in Bildschirmmitte für aktivierte Items/
 *  Fallen — deutlich auffälliger als die kleinen fliegenden Zahlen, damit
 *  "eine Taktikkarte wurde gerade eingesetzt" nicht im Kampfgeschehen
 *  untergeht. Bei eigenen Items kennen wir Name/Bild (aus der Hand, siehe
 *  confirmTactic); bei gegnerischen Items und JEDER ausgelösten Falle (auch
 *  der eigenen — welche Karte es war, verrät der Server nicht mehr, sobald
 *  sie verdeckt liegt) bleibt es bewusst ein anonymer Karten-Rücken-Reveal. */
interface CardRevealEffect {
  id: string;
  kind: "INSTANT" | "TRAP";
  side: "self" | "opponent";
  name?: string;
  imageUrl?: string | null;
}

const START_LP = 4000;
const TURN_SECONDS = Math.round(DUEL_TURN_TIMEOUT_MS / 1000);

// ---------- Hand-Fächer (Hover/Tap zum Fokussieren, Ziehen zum Spielen) ----------
const HAND_ANGLE_STEP = 7; // Grad pro Karten-Abstand von der Mitte
const HAND_MAX_ANGLE = 18; // Deckelt die Drehung bei großen Händen
const HAND_CARD_WIDTH = 92; // px
const HAND_OVERLAP = 40; // px negative Marge zwischen Karten (Fächer-Überlappung)
/** Wie weit sich Karten am Rand des Fächers nach unten wegdrehen (px pro Abstands-Einheit). */
const HAND_ARC_DROP = 5;
/** Mindest-Bewegung in px, ab der ein Pointer-Down als Ziehen statt als Tippen gilt. */
const DRAG_THRESHOLD = 8;

const PHASE_LABEL: Record<DuelPhase, string> = {
  main1: "Hauptphase 1",
  battle: "Kampfphase",
  main2: "Hauptphase 2",
};
const PHASE_ORDER: DuelPhase[] = ["main1", "battle", "main2"];

function PhaseStepper({ phase }: { phase: DuelPhase }) {
  const currentIndex = PHASE_ORDER.indexOf(phase);
  return (
    <div className="flex items-center gap-1.5">
      {PHASE_ORDER.map((p, i) => {
        const isActive = p === phase;
        const isPast = i < currentIndex;
        return (
          <div
            key={p}
            className={`flex-1 text-center text-[10px] font-semibold py-1.5 rounded-md border ${
              isActive
                ? "border-teal-400 bg-teal-500/15 text-teal-200"
                : isPast
                  ? "border-[color:var(--moba-accent-line-strong)] text-[color:var(--moba-ink)]"
                  : "border-[color:var(--moba-accent-line)] text-[color:var(--moba-ink-dim)]"
            }`}
          >
            {i + 1}. {PHASE_LABEL[p]}
          </div>
        );
      })}
    </div>
  );
}

const ATTACK_LABEL: Record<DuelAttackType, string> = {
  normalAttack: "Angriff",
  ultimate: "Ultimate",
};

/** Tooltip fürs Angriffsfeld — der Normalangriff hat kein Karten-individuelles
 *  Verhalten mehr (kein Skill-Knopf), verdient aber trotzdem eine kurze
 *  Erklärung der echten Yu-Gi-Oh-Kampfregeln, die sonst nirgends im UI
 *  auftauchen: sowohl gegen Angriffs- als auch gegen Verteidigungsstellung
 *  entscheidet ein direkter ATK/DEF-Vergleich statt persistenter HP. */
const NORMAL_ATTACK_DESCRIPTION =
  "Gegen Angriffsstellung: höherer ATK zerstört die andere Einheit, die unterlegene Seite nimmt die Differenz als LP-Schaden (bei Gleichstand werden beide zerstört). Gegen Verteidigung: ATK > DEF zerstört sie ohne Schaden für dich, ATK < DEF prallt ab und DU nimmst die Differenz als Rückschlag.";

const STANCE_LABEL: Record<DuelStance, string> = { attack: "Angriff", defense: "Verteidigung" };
const STANCE_HINT: Record<DuelStance, string> = {
  attack: "Kann angreifen, wird aber bei einem Angriff nach ATK-Vergleich zerstört (nicht nur beschädigt).",
  defense: "Kann selbst nicht angreifen — übersteht Angriffe je nach ATK/DEF unbeschadet oder wird komplett zerstört.",
};

/** Das Ultimate wirkt in OMA Duels über eine feste, klassenabhängige Formel
 *  statt über den freien Karten-Effekt (siehe applyClassUltimate in
 *  duels-live.ts) — die Tooltip-Beschreibung beschreibt daher die Klasse,
 *  nicht die einzelne Karte. Der Kartenname (ultimateSkillName) bleibt davon
 *  unberührt individuell. */
const CLASS_ULTIMATE_DESCRIPTION: Record<UnitClass, string> = {
  TANK: "Rammt mit voller Wucht — Schaden basiert auf der eigenen Verteidigung, danach Schild fürs ganze Team.",
  DAMAGE_DEALER: "Brutaler Burst-Schaden — besiegt er das Ziel, schlägt der Überschuss direkt auf die gegnerischen Lebenspunkte durch.",
  SUPPORT: "Kein Angriff — heilt das gesamte eigene Team und gibt allen zusätzlich Rage.",
};

const TONE_COLOR: Record<FloatingEffect["tone"], string> = {
  damage: "#fb7185",
  crit: "#f43f5e",
  heal: "#34d399",
  shield: "#60a5fa",
  info: "#e5e7eb",
};

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-rose-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LpBar({ lp }: { lp: number }) {
  const pct = Math.max(0, Math.min(100, (lp / START_LP) * 100));
  const critical = lp <= START_LP * 0.25;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 rounded-full bg-black/40 overflow-hidden border border-[color:var(--moba-accent-line)]">
        <div
          className={`h-full rounded-full transition-all ${critical ? "duel-lp-critical" : ""}`}
          style={{
            width: `${pct}%`,
            background: critical ? "#ef4444" : "linear-gradient(90deg, #0d9488, #34d399)",
          }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-14 text-right ${critical ? "text-rose-400" : "text-slate-200"}`}>
        {Math.max(0, lp)} LP
      </span>
    </div>
  );
}

function RadialTimer({ secondsLeft }: { secondsLeft: number }) {
  const pct = Math.max(0, Math.min(1, secondsLeft / TURN_SECONDS));
  const color = secondsLeft <= 5 ? "#f43f5e" : secondsLeft <= 10 ? "#f59e0b" : "#2dd4bf";
  const deg = Math.round(pct * 360);
  return (
    <div
      className="relative w-10 h-10 rounded-full shrink-0"
      style={{ background: `conic-gradient(${color} ${deg}deg, #1e293b ${deg}deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-[#04061a] flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
          {secondsLeft}
        </span>
      </div>
    </div>
  );
}

function CardBack({ tone = "slate" }: { tone?: "slate" | "rose" }) {
  return (
    <div
      className={`w-8 h-11 rounded-md border shrink-0 ${
        tone === "rose" ? "border-rose-500/40 bg-rose-500/10" : "border-[color:var(--moba-accent-line)] bg-black/40"
      }`}
      style={{
        backgroundImage:
          tone === "rose"
            ? "repeating-linear-gradient(45deg, rgba(244,63,94,0.15) 0, rgba(244,63,94,0.15) 3px, transparent 3px, transparent 7px)"
            : "repeating-linear-gradient(45deg, rgba(148,163,184,0.15) 0, rgba(148,163,184,0.15) 3px, transparent 3px, transparent 7px)",
      }}
    />
  );
}

function FloatingLayer({ effects }: { effects: FloatingEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-visible z-20">
      {effects.map((e) => (
        <span
          key={e.id}
          className="duel-float absolute top-0 text-xs font-black whitespace-nowrap"
          style={{ color: TONE_COLOR[e.tone], textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
        >
          {e.text}
        </span>
      ))}
    </div>
  );
}

function UnitSlot({
  unit,
  floating,
  selectable,
  selected,
  dragOver,
  statHighlight,
  flashing,
  lunging,
  onClick,
}: {
  unit: LiveDuelUnit | null;
  floating: FloatingEffect[];
  selectable?: boolean;
  selected?: boolean;
  /** Beim Ziehen einer Karte gerade unter dem Zeigefinger/Mauszeiger — kräftigere
   *  Hervorhebung als das normale `selectable`, damit die Drop-Zone während
   *  des Ziehens eindeutig erkennbar ist. */
  dragOver?: boolean;
  /** Welcher Stat (ATK/DEF) für die gerade laufende Aktion zählt — siehe
   *  StatBadges. Für eigene Einheiten: ATK, sobald sie als Angreifer gewählt
   *  wurden. Für gegnerische Einheiten: abhängig von ihrer eigenen Stellung
   *  (Angriff -> ATK, Verteidigung -> DEF) während der Kampfphase. */
  statHighlight?: "attack" | "defense" | null;
  flashing?: boolean;
  lunging?: boolean;
  onClick?: () => void;
}) {
  if (!unit) {
    return (
      <button
        type="button"
        disabled={!selectable}
        onClick={onClick}
        style={{ height: "clamp(64px, 15vh, 112px)" }}
        className={`relative w-full rounded-lg border border-dashed flex items-center justify-center text-[11px] text-center transition-colors ${
          dragOver
            ? "border-teal-300 bg-teal-400/30 text-teal-100 scale-105"
            : selectable
              ? "border-teal-400 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 cursor-pointer duel-pulse-ring"
              : "border-[color:var(--moba-accent-line)] bg-black/20 text-[color:var(--moba-ink-dim)]"
        }`}
      >
        {selectable ? "Hierhin beschwören" : "Leer"}
      </button>
    );
  }

  const config = getClassConfig(unit.class);
  const ultimateReady = unit.isAlive && unit.rage >= unit.ultimateCost;
  const isDefense = unit.stance === "defense";

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`relative w-full rounded-lg overflow-hidden text-left transition-transform ${
        isDefense
          ? "border-[3px] border-sky-400 duel-defense-glow"
          : selected
            ? "border border-teal-400"
            : ultimateReady
              ? "border border-amber-400 duel-ultimate-glow"
              : "border border-[color:var(--moba-accent-line)]"
      } ${!unit.isAlive ? "opacity-40 grayscale" : ""} ${flashing ? "duel-hit-flash" : ""} ${lunging ? "duel-lunge" : ""}`}
      style={{
        height: "clamp(64px, 15vh, 112px)",
        backgroundImage: unit.imageUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%), url(${unit.imageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: unit.imageUrl ? undefined : "#0a0e2e",
      }}
    >
      <FloatingLayer effects={floating} />
      {isDefense && unit.isAlive ? (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-1 bg-sky-500/80 py-0.5">
          <img src={MOBA_ICON.shield} alt="" aria-hidden className="w-3 h-3 object-contain" />
          <span className="text-[9px] font-black tracking-wide text-white">VERTEIDIGUNG</span>
        </div>
      ) : unit.isAlive ? (
        <span
          className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-sm bg-rose-500/30 text-rose-200"
          title={STANCE_LABEL.attack}
        >
          <img src={MOBA_ICON.sword} alt="" aria-hidden className="w-3 h-3 object-contain" />
        </span>
      ) : null}
      {isDefense && <div className="absolute inset-0 bg-sky-500/10" />}
      {!unit.imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={config.icon} alt="" aria-hidden className="w-8 h-8 opacity-40 object-contain" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-1.5 space-y-1">
        <div className="flex items-center gap-1 min-w-0">
          <img src={config.icon} alt="" aria-hidden className="w-3 h-3 shrink-0 object-contain" />
          <span className="text-[11px] font-semibold text-white truncate drop-shadow">{unit.name}</span>
          <span className="text-[9px] text-slate-300 shrink-0">Lv{unit.level}</span>
        </div>
        <StatBadges attack={unit.attack} defense={unit.defense} highlight={statHighlight} />
        <HpBar current={unit.currentHp} max={unit.maxHp} />
        <div className="h-1 w-full rounded-full bg-black/40 overflow-hidden">
          <div
            className={`h-full rounded-full ${ultimateReady ? "bg-amber-400" : "bg-violet-500"}`}
            style={{ width: `${Math.min(100, (unit.rage / unit.ultimateCost) * 100)}%` }}
          />
        </div>
      </div>
    </button>
  );
}

export default function DuelLiveView({
  liveBattleId,
  viewerId: _viewerId,
  onExit,
}: {
  liveBattleId: string;
  viewerId: string;
  /** Fehlt dieser Handler, navigiert der eingebaute Zurück-/Verlassen-Button zur Community-Übersicht. */
  onExit?: () => void;
}) {
  const router = useRouter();
  function handleExit() {
    if (onExit) onExit();
    else router.push("/battle-cards?tab=community");
  }
  const [snapshot, setSnapshot] = useState<LiveDuelSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [cardReveals, setCardReveals] = useState<CardRevealEffect[]>([]);

  function spawnCardReveal(effect: Omit<CardRevealEffect, "id">) {
    const id = `reveal-${Date.now()}-${Math.random()}`;
    setCardReveals((prev) => [...prev, { ...effect, id }]);
    setTimeout(() => {
      setCardReveals((prev) => prev.filter((e) => e.id !== id));
    }, 1300);
  }
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const [lungeKeys, setLungeKeys] = useState<Set<string>>(new Set());

  // Mobile-Layout: Kampf-Log als Overlay statt im Hauptfluss (spart am meisten
  // Platz), pro Zug nur die Aktions-Buttons der ausgewählten eigenen Einheit
  // statt aller lebenden Einheiten gleichzeitig, und der Dauerhinweis-Text nur
  // auf Nachfrage — siehe UnitSlot/Feld-Rendering und Root-JSX weiter unten.
  const [logOpen, setLogOpen] = useState(false);
  const [unreadLogCount, setUnreadLogCount] = useState(0);
  const [activeSelfSlot, setActiveSelfSlot] = useState<number | null>(null);
  const [hintOpen, setHintOpen] = useState(false);

  // Beschwörung: Karte auswählen -> Stellung wählen -> Ziel-Slot antippen (löst sofort aus).
  const [pendingSummon, setPendingSummon] = useState<{ handCardId: string; stance: DuelStance } | null>(null);
  // Angriff: Einheit + Angriffsart auswählen -> Ziel-Slot antippen (löst sofort aus).
  const [pendingAttack, setPendingAttack] = useState<{ slotIndex: number; attackType: DuelAttackType } | null>(null);
  // Taktik-Karte: Karte auswählen -> Effekt lesen (+ ggf. Ziel wählen) -> explizit bestätigen.
  const [pendingTactic, setPendingTactic] = useState<{
    handCardId: string;
    mode: "instant" | "setFaceDown";
    requiresTarget?: "enemy" | "ally";
    targetSlotIndex?: number;
  } | null>(null);

  const prevSnapshotsRef = useRef<LiveDuelSnapshot[]>([]);
  const lastLogLengthRef = useRef<number>(0);

  // Gefächerte Hand: Hover (Maus) bzw. Tippen (Finger) hebt eine Karte fokussiert
  // hervor; Ziehen (Maus oder Finger, per Pointer-Events — funktioniert für
  // beides gleich) legt Helden-/Taktikkarten direkt aufs Spielfeld.
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [dragCard, setDragCard] = useState<{ card: LiveDuelHandCard; x: number; y: number } | null>(null);
  const [dragHoverSlot, setDragHoverSlot] = useState<number | null>(null);
  const [dragHoverBoard, setDragHoverBoard] = useState(false);
  const dragStartRef = useRef<{ pointerId: number; startX: number; startY: number; card: LiveDuelHandCard; moved: boolean } | null>(
    null
  );
  const selfSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  // Hält die jeweils aktuellen Handler-Closures für den unten EINMALIG (leeres
  // Deps-Array) registrierten Pointer-Listener — der Listener selbst darf sich
  // während eines laufenden Zugs nicht neu registrieren (würde Events mitten im
  // Ziehen verlieren), braucht aber trotzdem immer den aktuellen `snapshot`.
  const latestRef = useRef<{
    handleDrop: (card: LiveDuelHandCard, x: number, y: number) => void;
    selectHandCard: (card: LiveDuelHandCard) => void;
  }>({ handleDrop: () => {}, selectHandCard: () => {} });

  function resetSelection() {
    setPendingSummon(null);
    setPendingAttack(null);
    setPendingTactic(null);
    setActiveSelfSlot(null);
  }

  function toggleSoundMuted() {
    setSoundMutedState((prev) => {
      const next = !prev;
      setSoundMuted(next);
      return next;
    });
  }

  function toggleLog() {
    setLogOpen((prev) => {
      const next = !prev;
      if (next) setUnreadLogCount(0);
      return next;
    });
  }

  function locateUnit(id: string, snapshots: LiveDuelSnapshot[]) {
    for (const snap of snapshots) {
      for (const side of ["self", "opponent"] as const) {
        const unit = snap[side].field.find((u) => u?.instanceId === id);
        if (unit) return { side, unit };
      }
    }
    return null;
  }

  function pulse(key: string, setFn: Dispatch<SetStateAction<Set<string>>>, ms: number) {
    setFn((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setFn((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, ms);
  }

  function processNewLogEntries(newSnapshot: LiveDuelSnapshot) {
    const candidates = [newSnapshot, ...prevSnapshotsRef.current];
    const from = lastLogLengthRef.current;
    const entries = newSnapshot.log.slice(from);
    const spawned: FloatingEffect[] = [];

    for (const entry of entries) {
      switch (entry.type) {
        case "damage": {
          const target = entry.targetId ? locateUnit(entry.targetId, candidates) : null;
          const source = entry.sourceId ? locateUnit(entry.sourceId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-${entry.targetId}-dmg`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: `-${entry.amount}`,
              tone: entry.isCrit ? "crit" : "damage",
            });
            pulse(`${target.side}-${target.unit.slotIndex}`, setFlashKeys, 450);
          }
          if (source) pulse(`${source.side}-${source.unit.slotIndex}`, setLungeKeys, 300);
          playDamageSoundFor(source?.unit.class, !!entry.isCrit);
          break;
        }
        case "heal": {
          const target = entry.targetId ? locateUnit(entry.targetId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-${entry.targetId}-heal`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: `+${entry.amount}`,
              tone: "heal",
            });
          }
          playHealSound();
          break;
        }
        case "shieldApplied": {
          const target = entry.targetId ? locateUnit(entry.targetId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-${entry.targetId}-shield`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: `Schild +${entry.amount}`,
              tone: "shield",
            });
          }
          playShieldSound();
          break;
        }
        case "faceDamage": {
          const source = entry.attackerUnitId ? locateUnit(entry.attackerUnitId, candidates) : null;
          const side: "self" | "opponent" = entry.defendingTeam === newSnapshot.viewerTeam ? "self" : "opponent";
          spawned.push({
            id: `${spawned.length}-face-${entry.round}`,
            side,
            anchor: { kind: "lp" },
            text: `-${entry.amount}`,
            tone: "damage",
          });
          playDamageSoundFor(source?.unit.class, false);
          break;
        }
        case "defenseDestroyed": {
          const attacker = entry.attackerUnitId ? locateUnit(entry.attackerUnitId, candidates) : null;
          const target = entry.defenderUnitId ? locateUnit(entry.defenderUnitId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-${entry.defenderUnitId}-destroyed`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: "Zerstört!",
              tone: "crit",
            });
            pulse(`${target.side}-${target.unit.slotIndex}`, setFlashKeys, 450);
          }
          if (attacker) pulse(`${attacker.side}-${attacker.unit.slotIndex}`, setLungeKeys, 300);
          playDamageSoundFor(target?.unit.class, true);
          break;
        }
        case "defenseReflect": {
          const attacker = entry.attackerUnitId ? locateUnit(entry.attackerUnitId, candidates) : null;
          const side: "self" | "opponent" = entry.attackerTeam === newSnapshot.viewerTeam ? "self" : "opponent";
          spawned.push({
            id: `${spawned.length}-reflect-${entry.round}`,
            side,
            anchor: { kind: "lp" },
            text: `-${entry.amount}`,
            tone: "damage",
          });
          if (attacker) pulse(`${attacker.side}-${attacker.unit.slotIndex}`, setLungeKeys, 300);
          playDamageSoundFor(undefined, false);
          break;
        }
        case "defenseBounce": {
          const attacker = entry.attackerUnitId ? locateUnit(entry.attackerUnitId, candidates) : null;
          const target = entry.defenderUnitId ? locateUnit(entry.defenderUnitId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-${entry.defenderUnitId}-bounce`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: "Geblockt",
              tone: "info",
            });
          }
          if (attacker) pulse(`${attacker.side}-${attacker.unit.slotIndex}`, setLungeKeys, 300);
          playShieldSound();
          break;
        }
        case "attackClash": {
          const winner = entry.winnerUnitId ? locateUnit(entry.winnerUnitId, candidates) : null;
          const loser = entry.loserUnitId ? locateUnit(entry.loserUnitId, candidates) : null;
          if (loser) {
            spawned.push({
              id: `${spawned.length}-${entry.loserUnitId}-clash`,
              side: loser.side,
              anchor: { kind: "slot", slotIndex: loser.unit.slotIndex },
              text: "Zerstört!",
              tone: "crit",
            });
            pulse(`${loser.side}-${loser.unit.slotIndex}`, setFlashKeys, 450);
          }
          if (winner) pulse(`${winner.side}-${winner.unit.slotIndex}`, setLungeKeys, 300);
          const damagedSide: "self" | "opponent" = entry.damagedTeam === newSnapshot.viewerTeam ? "self" : "opponent";
          spawned.push({
            id: `${spawned.length}-clash-lp-${entry.round}`,
            side: damagedSide,
            anchor: { kind: "lp" },
            text: `-${entry.amount}`,
            tone: "damage",
          });
          playDamageSoundFor(loser?.unit.class, true);
          break;
        }
        case "attackClashDraw": {
          for (const id of [entry.attackerUnitId, entry.defenderUnitId]) {
            const unit = id ? locateUnit(id, candidates) : null;
            if (!unit) continue;
            spawned.push({
              id: `${spawned.length}-${id}-clash-draw`,
              side: unit.side,
              anchor: { kind: "slot", slotIndex: unit.unit.slotIndex },
              text: "Zerstört!",
              tone: "crit",
            });
            pulse(`${unit.side}-${unit.unit.slotIndex}`, setFlashKeys, 450);
          }
          playDamageSoundFor(undefined, true);
          break;
        }
        case "lpChange": {
          const side: "self" | "opponent" = entry.team === newSnapshot.viewerTeam ? "self" : "opponent";
          const amount = entry.amount ?? 0;
          spawned.push({
            id: `${spawned.length}-lp-${entry.round}`,
            side,
            anchor: { kind: "lp" },
            text: amount >= 0 ? `+${amount}` : `${amount}`,
            tone: amount >= 0 ? "heal" : "damage",
          });
          if (amount >= 0) playHealSound();
          break;
        }
        case "action":
          if (entry.actionType === "ultimate") {
            const actor = entry.actorId ? locateUnit(entry.actorId, candidates) : null;
            playUltimateSoundFor(actor?.unit.class);
          }
          break;
        case "summon":
          playCardRevealSound();
          break;
        case "tacticPlayed":
          playCardRevealSound();
          // Eigene Instant-Items zeigen wir bereits optimistisch beim Bestätigen
          // (siehe confirmTactic) — hier nur den gegnerischen Fall nachholen,
          // ohne Name/Bild (verdeckte gegnerische Hand kennen wir nicht).
          if (entry.team !== newSnapshot.viewerTeam && entry.mode === "instant") {
            spawnCardReveal({ kind: "INSTANT", side: "opponent" });
          }
          break;
        case "trapTriggered":
          playShieldSound();
          // Welche Karte es war, verrät der Server nicht mehr, sobald sie
          // verdeckt liegt (gilt auch für die eigene Falle) — bewusst ein
          // anonymer Reveal für beide Seiten.
          spawnCardReveal({ kind: "TRAP", side: entry.team === newSnapshot.viewerTeam ? "self" : "opponent" });
          break;
        case "battleEnd":
          if (entry.winner === newSnapshot.viewerTeam) playVictorySound();
          else if (entry.winner !== "DRAW") playDefeatSound();
          break;
        default:
          break;
      }
    }

    if (spawned.length > 0) {
      setFloatingEffects((prev) => [...prev, ...spawned]);
      spawned.forEach((e) => {
        setTimeout(() => {
          setFloatingEffects((prev) => prev.filter((f) => f.id !== e.id));
        }, 1100);
      });
    }

    if (entries.length > 0 && !logOpen) {
      setUnreadLogCount((prev) => prev + entries.length);
    }

    lastLogLengthRef.current = newSnapshot.log.length;
    prevSnapshotsRef.current = [newSnapshot];
  }

  async function fetchSnapshot() {
    try {
      const res = await fetch(`/api/battle-cards/duel/${liveBattleId}`);
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Kampf konnte nicht geladen werden.";
        if (hasLoadedRef.current) setActionError(message);
        else setError(message);
        return;
      }
      hasLoadedRef.current = true;
      processNewLogEntries(data);
      setSnapshot(data);
    } catch {
      // nächster Poll versucht es erneut
    }
  }

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBattleId]);

  useEffect(() => {
    if (snapshot?.status === "finished") return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      fetchSnapshot();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.status, liveBattleId]);

  // Neuer Zug (Runde ODER wer dran ist hat sich geändert) -> Auswahl leeren.
  const lastTurnKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!snapshot) return;
    const turnKey = `${snapshot.round}-${snapshot.activeTeam}`;
    if (turnKey !== lastTurnKeyRef.current) {
      lastTurnKeyRef.current = turnKey;
      resetSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.round, snapshot?.activeTeam]);

  // Global registrierte Pointer-Listener fürs Ziehen aus der Hand — EINMALIG
  // (leeres Deps-Array), damit ein laufendes Ziehen nie durch eine Neu-
  // Registrierung (z.B. durch den 1s-Poll) Events verliert. Liest den aktuellen
  // Zustand über Refs (dragStartRef) bzw. ruft die jeweils aktuellste
  // Handler-Version über latestRef auf, statt veraltete Closures einzufangen.
  useEffect(() => {
    function pointInside(el: HTMLElement | null, x: number, y: number): boolean {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }
    function onMove(e: PointerEvent) {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      const dx = e.clientX - start.startX;
      const dy = e.clientY - start.startY;
      if (!start.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        start.moved = true;
        setFocusedCardId(null);
      }
      if (start.moved) {
        setDragCard({ card: start.card, x: e.clientX, y: e.clientY });
        if (start.card.kind === "unit") {
          const idx = selfSlotRefs.current.findIndex((el) => pointInside(el, e.clientX, e.clientY));
          setDragHoverSlot(idx >= 0 ? idx : null);
        } else {
          setDragHoverBoard(pointInside(boardRef.current, e.clientX, e.clientY));
        }
      }
    }
    function endDrag(e: PointerEvent) {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      if (start.moved) {
        latestRef.current.handleDrop(start.card, e.clientX, e.clientY);
      } else {
        setFocusedCardId((prev) => (prev === start.card.cardId ? null : start.card.cardId));
        latestRef.current.selectHandCard(start.card);
      }
      dragStartRef.current = null;
      setDragCard(null);
      setDragHoverSlot(null);
      setDragHoverBoard(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  // Vor den frühen Returns berechnet (Refs dürfen laut react-hooks/refs nicht
  // während des Renderns mutiert werden — die Synchronisierung unten muss
  // deshalb ein echter Effekt sein, der bei jedem Render neu die aktuellsten
  // Closures einträgt) — null-sicher, damit die Reihenfolge der Hooks über den
  // Ladezustand hinweg stabil bleibt.
  const canAct = !!snapshot && snapshot.activeTeam === snapshot.viewerTeam && snapshot.status !== "finished" && !busy;
  const isMainPhase = !!snapshot && (snapshot.phase === "main1" || snapshot.phase === "main2");

  function selectHandCard(card: LiveDuelHandCard) {
    if (!snapshot || !canAct || !isMainPhase) return;
    if (card.kind === "unit") {
      if (snapshot.normalSummonUsed) return;
      setPendingAttack(null);
      setPendingTactic(null);
      setPendingSummon((prev) => (prev?.handCardId === card.cardId ? null : { handCardId: card.cardId, stance: "attack" }));
    } else {
      if (snapshot.tacticPlayedThisTurn) return;
      setPendingAttack(null);
      setPendingSummon(null);
      // Modus ergibt sich fix aus der Kartenart (Item -> sofort, Falle ->
      // verdeckt) — löst aber NICHT mehr sofort aus: Effekt lesen + ggf. Ziel
      // wählen + explizit bestätigen (siehe Bestätigen-Panel unten).
      const mode: "instant" | "setFaceDown" = card.tacticKind === "TRAP" ? "setFaceDown" : "instant";
      setPendingTactic((prev) =>
        prev?.handCardId === card.cardId ? null : { handCardId: card.cardId, mode, requiresTarget: card.requiresTarget }
      );
    }
  }

  /** Ziehen einer Handkarte auf eine gültige Ablagezone: Helden-Karten direkt
   *  auf einen leeren eigenen Feld-Slot (immer in Angriffsstellung — wer die
   *  Verteidigungsstellung will, tippt die Karte stattdessen an, siehe
   *  selectHandCard/pendingSummon), Taktik-Karten irgendwo auf das Spielfeld
   *  (öffnet denselben Bestätigen-Dialog wie ein Antippen, siehe pendingTactic). */
  function handleDrop(card: LiveDuelHandCard, x: number, y: number) {
    if (!snapshot || !canAct || !isMainPhase) return;
    const pointInside = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    if (card.kind === "unit") {
      if (snapshot.normalSummonUsed) return;
      const slotIndex = selfSlotRefs.current.findIndex((el) => pointInside(el));
      if (slotIndex >= 0 && !snapshot.self.field[slotIndex]) {
        void postAction({ type: "summon", handCardId: card.cardId, slotIndex, stance: "attack" });
      }
    } else {
      if (snapshot.tacticPlayedThisTurn) return;
      if (pointInside(boardRef.current)) {
        const mode: "instant" | "setFaceDown" = card.tacticKind === "TRAP" ? "setFaceDown" : "instant";
        setPendingSummon(null);
        setPendingAttack(null);
        setPendingTactic({ handCardId: card.cardId, mode, requiresTarget: card.requiresTarget });
      }
    }
  }

  function handleCardPointerDown(e: React.PointerEvent, card: LiveDuelHandCard, disabled: boolean) {
    if (disabled || !canAct || !isMainPhase) return;
    dragStartRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, card, moved: false };
  }

  // Hält latestRef aktuell, ohne während des Renderns direkt in die Ref zu
  // schreiben (siehe Kommentar oben) — läuft nach jedem Commit.
  useEffect(() => {
    latestRef.current = { handleDrop, selectHandCard };
  });

  async function postAction(action: DuelAction) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/battle-cards/duel/${liveBattleId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(typeof data.error === "string" ? data.error : "Aktion fehlgeschlagen.");
        return;
      }
      processNewLogEntries(data);
      setSnapshot(data);
      resetSelection();
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-[#04061a] flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-3">
          <ErrorNotice message={error} size="lg" />
          <button onClick={handleExit} className="w-full rounded-lg bg-black/30 border border-[color:var(--moba-accent-line)] hover:bg-white/[0.06] text-[color:var(--moba-ink)] text-sm py-2">
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="fixed inset-0 z-50 bg-[#04061a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  const secondsLeft = Math.max(0, Math.ceil((snapshot.turnDeadline - Date.now()) / 1000));
  const isMyTurn = snapshot.activeTeam === snapshot.viewerTeam;
  const finished = snapshot.status === "finished";
  const won = snapshot.winner === snapshot.viewerTeam;
  const drew = snapshot.winner === "DRAW";

  function effectsFor(side: "self" | "opponent", slotIndex: number) {
    return floatingEffects.filter((e) => e.side === side && e.anchor.kind === "slot" && e.anchor.slotIndex === slotIndex);
  }
  function lpEffectsFor(side: "self" | "opponent") {
    return floatingEffects.filter((e) => e.side === side && e.anchor.kind === "lp");
  }

  function pickSummonSlot(slotIndex: number) {
    if (!pendingSummon) return;
    void postAction({ type: "summon", handCardId: pendingSummon.handCardId, slotIndex, stance: pendingSummon.stance });
  }

  function toggleFieldStance(unit: LiveDuelUnit) {
    if (!canAct || !isMainPhase) return;
    if (unit.summonedThisTurn || unit.stanceLockedThisTurn || unit.attackedThisTurn) return;
    void postAction({ type: "changeStance", slotIndex: unit.slotIndex, stance: unit.stance === "attack" ? "defense" : "attack" });
  }

  function selectAttack(unit: LiveDuelUnit, attackType: DuelAttackType) {
    if (!canAct || snapshot!.phase !== "battle") return;
    if (unit.summonedThisTurn || unit.attackedThisTurn) return;
    setPendingSummon(null);
    setPendingAttack((prev) =>
      prev?.slotIndex === unit.slotIndex && prev.attackType === attackType ? null : { slotIndex: unit.slotIndex, attackType }
    );
  }

  function pickAttackTarget(targetSlotIndex: number) {
    if (!pendingAttack) return;
    void postAction({ type: "declareAttack", ...pendingAttack, targetSlotIndex });
  }

  function pickTacticTarget(targetSlotIndex: number) {
    setPendingTactic((prev) => (prev ? { ...prev, targetSlotIndex } : prev));
  }

  function confirmTactic() {
    if (!pendingTactic) return;
    if (pendingTactic.requiresTarget && pendingTactic.targetSlotIndex === undefined) return;
    // Optimistischer Reveal mit Name/Bild, solange die Karte noch in der
    // eigenen Hand steht — danach kennt der Snapshot sie nicht mehr (Items
    // landen anonym im Friedhof, Fallen liegen verdeckt), siehe
    // processNewLogEntries für den gegnerischen bzw. Fallen-Fall.
    if (pendingTactic.mode === "instant") {
      const card = (snapshot!.self.hand ?? []).find((c) => c.cardId === pendingTactic.handCardId);
      if (card) spawnCardReveal({ kind: "INSTANT", side: "self", name: card.name, imageUrl: card.imageUrl });
    }
    void postAction({
      type: "playTactic",
      handCardId: pendingTactic.handCardId,
      mode: pendingTactic.mode,
      targetSlotIndex: pendingTactic.targetSlotIndex,
    });
  }

  const opponentHasUnits = snapshot.opponent.field.some((u) => u?.isAlive);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#04061a] text-[color:var(--moba-ink)] flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <style>{`
        @keyframes duelFloatUp { 0% { opacity: 0; transform: translateY(4px) scale(0.9); } 15% { opacity: 1; transform: translateY(-6px) scale(1); } 100% { opacity: 0; transform: translateY(-32px) scale(1); } }
        .duel-float { animation: duelFloatUp 1.1s ease-out forwards; }
        @keyframes duelHitFlash { 0% { filter: brightness(2.2) saturate(1.5); } 100% { filter: brightness(1) saturate(1); } }
        .duel-hit-flash { animation: duelHitFlash 0.45s ease-out; }
        @keyframes duelLunge { 0% { transform: translateY(0); } 30% { transform: translateY(-4px); } 100% { transform: translateY(0); } }
        .duel-lunge { animation: duelLunge 0.3s ease-out; }
        @keyframes duelUltimateGlow { 0%, 100% { box-shadow: 0 0 6px 1px rgba(251,191,36,0.5); } 50% { box-shadow: 0 0 14px 4px rgba(251,191,36,0.85); } }
        .duel-ultimate-glow { animation: duelUltimateGlow 1.4s ease-in-out infinite; }
        @keyframes duelDefenseGlow { 0%, 100% { box-shadow: 0 0 8px 2px rgba(56,189,248,0.55); } 50% { box-shadow: 0 0 16px 5px rgba(56,189,248,0.9); } }
        .duel-defense-glow { animation: duelDefenseGlow 1.6s ease-in-out infinite; }
        @keyframes duelPulseRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0.5); } 50% { box-shadow: 0 0 0 5px rgba(45,212,191,0); } }
        .duel-pulse-ring { animation: duelPulseRing 1.6s ease-in-out infinite; }
        @keyframes duelLpCritical { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        .duel-lp-critical { animation: duelLpCritical 1s ease-in-out infinite; }
        @keyframes duelStatPop { 0% { transform: scale(0.85); } 50% { transform: scale(1.25); } 100% { transform: scale(1.1); } }
        .duel-stat-pop { animation: duelStatPop 0.35s ease-out; }
        @keyframes duelCardReveal {
          0% { opacity: 0; transform: scale(0.4) rotateY(90deg); }
          55% { opacity: 1; transform: scale(1.15) rotateY(0deg); }
          75% { opacity: 1; transform: scale(1) rotateY(0deg); }
          100% { opacity: 0; transform: scale(1) translateY(-14px); }
        }
        .duel-card-reveal { animation: duelCardReveal 1.3s ease-out forwards; }
      `}</style>
      {/* Content-Rahmen: 100dvh-basierte Flex-Spalte statt linearer space-y-4-
          Stapelung. Header/Phasenanzeige oben und die Phasen-/Zug-Buttons ganz
          unten sind ein FESTER Rahmen (shrink-0, außerhalb jeder Scroll-Zone)
          — nur der mittlere Bereich (Spielfeld + Hand + Fehleranzeigen) ist
          eine einzige scrollbare Zone. Vorher hatten sowohl der Content-Rahmen
          als auch das Spielfeld je ein eigenes overflow-y-auto: Bei wenig
          Platz (z.B. Hauptphase mit ausgeklappter Handkarten-Fächerung)
          quetschte das Spielfeld auf 0px zusammen, der äußere Rahmen musste
          gescrollt werden, um "Zug beenden"/"Weiter zur Phase" überhaupt zu
          sehen — leicht zu übersehen. Jetzt sind diese Buttons als fixer
          Fuß nie Teil der Scroll-Berechnung und daher immer sichtbar. */}
      <div className="flex-1 min-h-0 flex flex-col max-w-2xl w-full mx-auto px-4 py-4 gap-3">
        <div className="shrink-0 flex items-center justify-between">
          <button onClick={handleExit} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm">
            <MobaIcon name="chevronLeft" className="w-4 h-4" /> Verlassen
          </button>
          <div className="flex items-center gap-3">
            <button onClick={toggleLog} className="relative text-slate-500 hover:text-slate-300" aria-label="Kampf-Log anzeigen">
              <MobaIcon name="info" className="w-4 h-4" />
              {unreadLogCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-teal-500 text-[9px] font-bold text-black flex items-center justify-center">
                  {Math.min(unreadLogCount, 9)}
                </span>
              )}
            </button>
            <button onClick={toggleSoundMuted} className="text-slate-500 hover:text-slate-300" aria-label="Sound umschalten">
              <MobaIcon name={soundMuted ? "soundOff" : "soundOn"} className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300">Zug {snapshot.round}</span>
            {!finished && <RadialTimer secondsLeft={secondsLeft} />}
          </div>
        </div>

        <div className="shrink-0">
          {finished ? (
            <div className="rounded-xl border border-[color:var(--moba-accent-line)] bg-black/30 p-6 text-center space-y-3">
              <div className="text-lg font-bold">{drew ? "Unentschieden!" : won ? "Sieg!" : "Niederlage."}</div>
              {snapshot.resultBattleId && (
                <a
                  href={`/battle-cards/battles/${snapshot.resultBattleId}`}
                  className="inline-block rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm px-4 py-2"
                >
                  Kampfbericht ansehen
                </a>
              )}
            </div>
          ) : !isMyTurn ? (
            <p className="text-xs text-slate-400 text-center">Gegner ist am Zug …</p>
          ) : (
            <PhaseStepper phase={snapshot.phase} />
          )}
        </div>

        {/* Einzige scrollbare Zone: Spielfeld + Hand + Fehleranzeigen. Wächst
            zwischen dem festen Header oben und den festen Phasen-/Zug-Buttons
            unten (siehe Kommentar am Content-Rahmen). */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {/* Spielfeld (Gegner + eigenes Feld) — gemeinsame Ablagezone fürs Ziehen
            einer Taktik-Karte aus der Hand ("irgendwo aufs Spielfeld ziehen"). */}
        <div
          ref={boardRef}
          className={`space-y-4 rounded-xl transition-shadow ${dragHoverBoard ? "ring-2 ring-amber-400/70" : ""}`}
        >
        {/* Gegner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gegner</span>
            <div className="flex items-center gap-2">
              <span>Deck {snapshot.opponent.deckCount}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(snapshot.opponent.trapCount, 3) }, (_, i) => (
                  <CardBack key={i} tone="rose" />
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <FloatingLayer effects={lpEffectsFor("opponent")} />
            <LpBar lp={snapshot.opponent.lifePoints} />
          </div>
          <div className="flex gap-1 justify-end">
            {Array.from({ length: Math.min(snapshot.opponent.handCount, 6) }, (_, i) => (
              <CardBack key={i} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {snapshot.opponent.field.map((slot, i) => {
              const isValidAttackTarget =
                canAct &&
                snapshot.phase === "battle" &&
                !!pendingAttack &&
                (opponentHasUnits ? !!slot?.isAlive : true);
              const isValidTacticTarget =
                canAct && isMainPhase && pendingTactic?.requiresTarget === "enemy" && !!slot?.isAlive;
              const selectable = isValidAttackTarget || isValidTacticTarget;
              const onClick = isValidAttackTarget
                ? () => pickAttackTarget(i)
                : isValidTacticTarget
                  ? () => pickTacticTarget(i)
                  : undefined;
              // Ohne Erklärtext direkt ablesbar, welcher Wert für diese Einheit
              // gerade zählt: in der Kampfphase entscheidet bei einem Angriff
              // immer die eigene Stellung der Zieleinheit — Angriffsstellung
              // vergleicht ATK gegen ATK, Verteidigung vergleicht gegnerischen
              // ATK gegen die eigene DEF.
              const statHighlight: "attack" | "defense" | null =
                snapshot.phase === "battle" && slot?.isAlive ? (slot.stance === "defense" ? "defense" : "attack") : null;
              return (
                <UnitSlot
                  key={i}
                  unit={slot}
                  floating={effectsFor("opponent", i)}
                  flashing={flashKeys.has(`opponent-${i}`)}
                  lunging={lungeKeys.has(`opponent-${i}`)}
                  selectable={selectable}
                  selected={pendingTactic?.requiresTarget === "enemy" && pendingTactic.targetSlotIndex === i}
                  statHighlight={statHighlight}
                  onClick={onClick}
                />
              );
            })}
          </div>
          {pendingAttack && (
            <p className="text-[10px] text-teal-300 text-center">
              {opponentHasUnits ? "Ziel wählen …" : "Gegner hat keine Einheiten mehr — Direktangriff: beliebiges Feld antippen."}
            </p>
          )}
          {pendingTactic?.requiresTarget === "enemy" && (
            <p className="text-[10px] text-teal-300 text-center">Gegnerisches Ziel für die Taktikkarte wählen …</p>
          )}
        </div>

        <div className="h-px bg-[color:var(--moba-accent-line)]" />

        {/* Eigenes Feld */}
        <div className="space-y-2">
          <div className="relative">
            <FloatingLayer effects={lpEffectsFor("self")} />
            <LpBar lp={snapshot.self.lifePoints} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {snapshot.self.field.map((slot, i) => {
              const isSummonTarget =
                canAct &&
                isMainPhase &&
                !slot &&
                (pendingSummon !== null || (dragCard?.card.kind === "unit" && !snapshot.normalSummonUsed));
              const canChangeStance =
                canAct && isMainPhase && slot?.isAlive && !slot.summonedThisTurn && !slot.stanceLockedThisTurn && !slot.attackedThisTurn;
              const canDeclareAttack =
                canAct && snapshot.phase === "battle" && slot?.isAlive && !slot.summonedThisTurn && !slot.attackedThisTurn && slot.stance === "attack";
              const isSelectedAttacker = pendingAttack?.slotIndex === i;
              const isValidTacticTarget =
                canAct && isMainPhase && pendingTactic?.requiresTarget === "ally" && !!slot?.isAlive;
              const isSelectedTacticTarget = pendingTactic?.requiresTarget === "ally" && pendingTactic.targetSlotIndex === i;
              // Aktions-Buttons (Stellung/Angriff/Ultimate) werden nicht mehr pro
              // Einheit dauerhaft eingeblendet (kostet auf dem Handy zu viel Platz),
              // sondern nur für die per Antippen ausgewählte aktive Einheit — siehe
              // das gemeinsame Aktions-Panel unterhalb des Feld-Grids.
              const hasOwnActions = !isSummonTarget && !isValidTacticTarget && !!slot?.isAlive && (canChangeStance || canDeclareAttack);
              const isActiveSlot = activeSelfSlot === i;
              const slotOnClick = isSummonTarget
                ? () => pickSummonSlot(i)
                : isValidTacticTarget
                  ? () => pickTacticTarget(i)
                  : hasOwnActions
                    ? () => setActiveSelfSlot((prev) => (prev === i ? null : i))
                    : undefined;

              return (
                <div key={i} ref={(el) => { selfSlotRefs.current[i] = el; }}>
                  <UnitSlot
                    unit={slot}
                    floating={effectsFor("self", i)}
                    selectable={isSummonTarget || isValidTacticTarget || hasOwnActions}
                    selected={isSelectedAttacker || isSelectedTacticTarget || (hasOwnActions && isActiveSlot)}
                    dragOver={dragHoverSlot === i}
                    // Als Angreifer gewählt -> nur der eigene ATK-Wert zählt für
                    // diese Aktion, egal welche Stellung das Ziel hat.
                    statHighlight={isSelectedAttacker ? "attack" : null}
                    flashing={flashKeys.has(`self-${i}`)}
                    lunging={lungeKeys.has(`self-${i}`)}
                    onClick={slotOnClick}
                  />
                </div>
              );
            })}
          </div>
          {pendingTactic?.requiresTarget === "ally" && (
            <p className="text-[10px] text-teal-300 text-center">Eigenes Ziel für die Taktikkarte wählen …</p>
          )}
          {activeSelfSlot !== null &&
            snapshot.self.field[activeSelfSlot] &&
            (() => {
              const slot = snapshot.self.field[activeSelfSlot]!;
              const canChangeStance =
                canAct && isMainPhase && slot.isAlive && !slot.summonedThisTurn && !slot.stanceLockedThisTurn && !slot.attackedThisTurn;
              const canDeclareAttack =
                canAct && snapshot.phase === "battle" && slot.isAlive && !slot.summonedThisTurn && !slot.attackedThisTurn && slot.stance === "attack";
              const ultimateReady = slot.isAlive && slot.rage >= slot.ultimateCost;
              const isSelectedAttacker = pendingAttack?.slotIndex === activeSelfSlot;
              if (!canChangeStance && !canDeclareAttack) return null;
              return (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/[0.06] p-1.5">
                  <span className="text-[10px] font-semibold text-teal-300 px-0.5 truncate">{slot.name}</span>
                  {canChangeStance && (
                    <button
                      onClick={() => toggleFieldStance(slot)}
                      title={STANCE_HINT[slot.stance === "attack" ? "defense" : "attack"]}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 hover:border-slate-500"
                    >
                      → {STANCE_LABEL[slot.stance === "attack" ? "defense" : "attack"]}
                    </button>
                  )}
                  {canDeclareAttack && (
                    <>
                      <button
                        onClick={() => selectAttack(slot, "normalAttack")}
                        title={NORMAL_ATTACK_DESCRIPTION}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          isSelectedAttacker && pendingAttack?.attackType === "normalAttack"
                            ? "border-teal-400 bg-teal-500/20 text-teal-200"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {ATTACK_LABEL.normalAttack}
                      </button>
                      {ultimateReady && (
                        <button
                          onClick={() => selectAttack(slot, "ultimate")}
                          title={`${slot.ultimateSkillName}: ${CLASS_ULTIMATE_DESCRIPTION[slot.class]}`}
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            isSelectedAttacker && pendingAttack?.attackType === "ultimate"
                              ? "border-amber-400 bg-amber-500/20 text-amber-200"
                              : "border-amber-600/60 text-amber-300 hover:border-amber-400"
                          }`}
                        >
                          {ATTACK_LABEL.ultimate}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
        </div>
        </div>

        {/* Hauptphase 1/2 — Beschwörung + Stellungswechsel + Taktik-Karte */}
        {isMyTurn && !finished && isMainPhase && (
          <div className="shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                Hand ({snapshot.self.hand?.length ?? 0}) · Deck {snapshot.self.deckCount} · Fallen {snapshot.self.trapCount}
                {snapshot.normalSummonUsed && <span className="text-amber-300"> · Normalbeschwörung bereits genutzt</span>}
                {snapshot.tacticPlayedThisTurn && <span className="text-amber-300"> · Taktik-Karte bereits genutzt</span>}
                {pendingSummon && <span className="text-teal-300"> · Ziel-Slot wählen</span>}
              </span>
              <button
                type="button"
                onClick={() => setHintOpen((prev) => !prev)}
                aria-label="Hinweis zur Handkarten-Bedienung anzeigen"
                className={`shrink-0 w-4 h-4 rounded-full border text-[10px] font-bold flex items-center justify-center ${
                  hintOpen ? "border-teal-400 text-teal-300" : "border-slate-600 text-slate-500"
                }`}
              >
                ?
              </button>
            </div>
            {hintOpen && (
              <p className="text-[10px] text-slate-500 text-center">
                Antippen/Hovern zum Anschauen · Helden-Karte auf ein Feld ziehen zum Beschwören (Angriffsstellung —
                für Verteidigung antippen) · Taktik-Karte aufs Spielfeld ziehen zum Spielen
              </p>
            )}
            {/* Gefächerte Hand: unfokussierte Karten überlappen sich wie echte
                Spielkarten (nur Bild/Name als "Peek" sichtbar), die fokussierte
                Karte hebt sich gerade, vergrößert und voll lesbar aus dem Fächer.
                Ziehen (Pointer-Events, siehe handleCardPointerDown) funktioniert
                unabhängig vom Fokus-Zustand. */}
            <div className="relative pt-9" style={{ minHeight: 168 }}>
              <div className="flex justify-center items-end">
                {(snapshot.self.hand ?? []).map((card, i, arr) => {
                  const isSelectedSummon = pendingSummon?.handCardId === card.cardId;
                  const isSelectedTactic = pendingTactic?.handCardId === card.cardId;
                  const isDisabled =
                    (card.kind === "unit" && snapshot.normalSummonUsed) || (card.kind === "tactic" && snapshot.tacticPlayedThisTurn);
                  const isFocused = focusedCardId === card.cardId;
                  const isBeingDragged = dragCard?.card.cardId === card.cardId;

                  const center = (arr.length - 1) / 2;
                  const offset = i - center;
                  const angle = Math.max(-HAND_MAX_ANGLE, Math.min(HAND_MAX_ANGLE, offset * HAND_ANGLE_STEP));
                  const arcDrop = Math.abs(offset) * HAND_ARC_DROP;
                  const transform = isFocused
                    ? "translateY(-56px) scale(1.35) rotate(0deg)"
                    : `translateY(${arcDrop}px) rotate(${angle}deg)`;

                  let stats: { attack: number; defense: number } | null = null;
                  if (card.kind === "unit" && card.unitCard) {
                    stats = scaleStatsForLevel({
                      baseHp: card.unitCard.baseHp,
                      baseAttack: card.unitCard.baseAttack,
                      baseDefense: card.unitCard.baseDefense,
                      level: card.unitCard.level ?? 1,
                    });
                  }

                  return (
                    <div
                      key={card.cardId}
                      onPointerDown={(e) => handleCardPointerDown(e, card, isDisabled)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse" && !isDisabled) setFocusedCardId(card.cardId);
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType === "mouse") setFocusedCardId((f) => (f === card.cardId ? null : f));
                      }}
                      className={`relative shrink-0 space-y-1 ${isSelectedSummon || isSelectedTactic ? "ring-2 ring-teal-400 rounded-lg" : ""}`}
                      style={{
                        width: HAND_CARD_WIDTH,
                        marginLeft: i === 0 ? 0 : -HAND_OVERLAP,
                        transformOrigin: "bottom center",
                        transform,
                        zIndex: isFocused ? 200 : i,
                        transition: isBeingDragged ? "none" : "transform 0.18s ease-out",
                        opacity: isBeingDragged ? 0.25 : isDisabled ? 0.4 : 1,
                        touchAction: "none",
                        cursor: isDisabled ? "default" : "grab",
                      }}
                    >
                      {card.kind === "unit" && card.unitCard ? (
                        <>
                          <CardTile card={card.unitCard} level={card.unitCard.level ?? 1} onClick={() => {}} />
                          {isFocused && stats && (
                            <div className="flex justify-center">
                              <StatBadges attack={stats.attack} defense={stats.defense} />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <TacticCardTile
                            card={{ id: card.cardId, name: card.name, kind: card.tacticKind ?? "INSTANT", imageUrl: card.imageUrl }}
                            selected={isSelectedTactic}
                            disabled={isDisabled}
                            onClick={() => {}}
                          />
                          {isFocused && (
                            <p className="text-[9px] text-slate-300 text-center leading-snug bg-black/70 rounded p-1">
                              {card.tacticDescription ?? "Keine Beschreibung verfügbar."}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {pendingSummon && (
              <div className="space-y-1">
                <div className="flex gap-2 text-[11px]">
                  <button
                    onClick={() => setPendingSummon((prev) => (prev ? { ...prev, stance: "attack" } : prev))}
                    title={STANCE_HINT.attack}
                    className={`px-2 py-1 rounded border ${pendingSummon.stance === "attack" ? "border-teal-400 text-teal-200" : "border-slate-700 text-slate-400"}`}
                  >
                    Angriffsstellung
                  </button>
                  <button
                    onClick={() => setPendingSummon((prev) => (prev ? { ...prev, stance: "defense" } : prev))}
                    title={STANCE_HINT.defense}
                    className={`px-2 py-1 rounded border ${pendingSummon.stance === "defense" ? "border-sky-400 text-sky-200" : "border-slate-700 text-slate-400"}`}
                  >
                    Verteidigungsstellung
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">{STANCE_HINT[pendingSummon.stance]}</p>
              </div>
            )}
            {/* Taktik-Karte: Effekt lesen + ggf. Ziel wählen (siehe Feld oben) +
                explizit bestätigen — löst NICHT mehr sofort beim Antippen aus. */}
            {pendingTactic &&
              (() => {
                const card = (snapshot.self.hand ?? []).find((c) => c.cardId === pendingTactic.handCardId);
                const targetChosen = !pendingTactic.requiresTarget || pendingTactic.targetSlotIndex !== undefined;
                return (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] p-2.5 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-200">
                        {card?.name ?? "Taktik-Karte"} · {pendingTactic.mode === "setFaceDown" ? "wird verdeckt gesetzt" : "wird sofort gespielt"}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                        {card?.tacticDescription ?? "Keine Beschreibung verfügbar."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingTactic(null)}
                        className="flex-1 rounded-md border border-slate-700 text-slate-300 text-[11px] py-1.5 hover:border-slate-500"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={confirmTactic}
                        disabled={!targetChosen || busy}
                        className="flex-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-[11px] py-1.5"
                      >
                        {pendingTactic.requiresTarget && !targetChosen ? "Erst Ziel wählen" : "Bestätigen"}
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
        )}

        {actionError && (
          <div className="shrink-0 flex items-center gap-2">
            <div className="flex-1">
              <ErrorNotice message={actionError} />
            </div>
            <button
              onClick={() => setActionError(null)}
              className="shrink-0 text-slate-500 hover:text-slate-300"
              aria-label="Fehlermeldung schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!finished && !isMyTurn && (
          <button disabled className="w-full rounded-lg bg-black/30 border border-[color:var(--moba-accent-line)] text-[color:var(--moba-ink-dim)] text-sm font-semibold py-2.5 flex items-center justify-center gap-2">
            <Wind className="w-4 h-4" /> Gegner ist am Zug …
          </button>
        )}
        </div>

        {/* Fester Fuß außerhalb der Scroll-Zone — siehe Kommentar am
            Content-Rahmen: dadurch immer sichtbar, egal wie viel Platz
            Spielfeld/Hand gerade brauchen. */}
        {canAct && (
          <div className="shrink-0 flex gap-2">
            {snapshot.phase !== "main2" && (
              <button
                onClick={() => postAction({ type: "advancePhase" })}
                disabled={busy}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5"
              >
                Weiter zur {PHASE_LABEL[PHASE_ORDER[PHASE_ORDER.indexOf(snapshot.phase) + 1]]} →
              </button>
            )}
            <button
              onClick={() => postAction({ type: "endTurn" })}
              disabled={busy}
              className="flex-1 rounded-lg bg-black/30 border border-[color:var(--moba-accent-line)] hover:bg-white/[0.06] disabled:opacity-50 text-[color:var(--moba-ink)] text-sm font-semibold py-2.5 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MobaIcon name="crossedSwords" className="w-4 h-4" />}
              Zug beenden
            </button>
          </div>
        )}

      </div>

      {/* Kampf-Log als Overlay-Drawer statt im Hauptfluss — spart auf dem Handy
          den meisten Platz, ohne den Verlauf ganz zu verstecken (siehe
          toggleLog/unreadLogCount und der Info-Button im Header). */}
      {logOpen && (
        <div className="fixed inset-0 z-[550] flex flex-col justify-end" onClick={toggleLog}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full mx-auto rounded-t-xl border-t border-x border-[color:var(--moba-accent-line)] bg-[#0a0e2e] p-3 space-y-2"
            style={{ maxHeight: "60vh" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Kampf-Log</span>
              <button onClick={toggleLog} className="text-slate-500 hover:text-slate-300" aria-label="Kampf-Log schließen">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto text-[11px] text-[color:var(--moba-ink-dim)] space-y-0.5" style={{ maxHeight: "calc(60vh - 40px)" }}>
              {snapshot.log.slice(-40).map((entry, i) => (
                <div key={i}>{describeLogEntry(entry)}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* "Geist"-Karte, die dem Finger/Mauszeiger beim Ziehen folgt — rein
          visuell (pointer-events: none), die eigentliche Hit-Testing-Logik
          läuft über die Slot-/Board-Refs in handleDrop. */}
      {dragCard && (
        <div
          className="pointer-events-none fixed z-[500]"
          style={{
            left: dragCard.x - HAND_CARD_WIDTH / 2,
            top: dragCard.y - 70,
            width: HAND_CARD_WIDTH,
            transform: "rotate(-4deg) scale(1.08)",
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))",
          }}
        >
          {dragCard.card.kind === "unit" && dragCard.card.unitCard ? (
            <CardTile card={dragCard.card.unitCard} level={dragCard.card.unitCard.level ?? 1} onClick={() => {}} />
          ) : (
            <TacticCardTile
              card={{
                id: dragCard.card.cardId,
                name: dragCard.card.name,
                kind: dragCard.card.tacticKind ?? "INSTANT",
                imageUrl: dragCard.card.imageUrl,
              }}
              selected={false}
              disabled={false}
              onClick={() => {}}
            />
          )}
        </div>
      )}

      {/* Item/Fallen-Aktivierung: kurzer, auffälliger Reveal in Bildschirmmitte
          statt nur einem Sound — soll im Kampfgeschehen nicht untergehen. */}
      {cardReveals.map((reveal) => (
        <div key={reveal.id} className="pointer-events-none fixed inset-0 z-[600] flex items-center justify-center">
          <div className="duel-card-reveal flex flex-col items-center gap-2">
            <div
              className={`w-20 h-28 rounded-lg border-2 flex items-center justify-center overflow-hidden ${
                reveal.kind === "TRAP" ? "border-rose-400 bg-rose-950/80" : "border-amber-400 bg-amber-950/80"
              }`}
              style={{ boxShadow: `0 0 30px ${reveal.kind === "TRAP" ? "rgba(244,63,94,0.7)" : "rgba(251,191,36,0.7)"}` }}
            >
              {reveal.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reveal.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <img
                  src={reveal.kind === "TRAP" ? MOBA_ICON.shield : MOBA_ICON.attack}
                  alt=""
                  aria-hidden
                  className="w-8 h-8 object-contain opacity-70"
                />
              )}
            </div>
            <span
              className={`text-xs font-black uppercase tracking-wide px-2 py-1 rounded ${
                reveal.kind === "TRAP" ? "bg-rose-500/90 text-white" : "bg-amber-500/90 text-black"
              }`}
            >
              {reveal.side === "self" ? "Du" : "Gegner"} · {reveal.name ?? (reveal.kind === "TRAP" ? "Falle ausgelöst!" : "Item eingesetzt")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function describeLogEntry(entry: DuelLogEntry): string {
  switch (entry.type) {
    case "duelStart":
      return "Das Duell beginnt!";
    case "roundStart":
      return `Zug ${entry.round} beginnt.`;
    case "summon":
      return "Eine Karte wurde beschworen.";
    case "stanceChanged":
      return `Stellungswechsel: ${entry.stance === "defense" ? "Verteidigung" : "Angriff"}.`;
    case "faceDamage":
      return `Direkter Treffer: ${entry.amount} Schaden`;
    case "damage":
      return `Schaden: ${entry.amount}${entry.isCrit ? " (Crit!)" : ""}`;
    case "heal":
      return `Heilung: ${entry.amount}`;
    case "death":
      return "Eine Einheit wurde besiegt.";
    case "defenseDestroyed":
      return "Angriff durchbrochen — die verteidigende Einheit wurde zerstört.";
    case "defenseReflect":
      return `Angriff zu schwach — ${entry.amount} Rückprall-Schaden für den Angreifer.`;
    case "defenseBounce":
      return "Angriff prallt wirkungslos ab (ATK = DEF).";
    case "attackClash":
      return `Kampf entschieden — unterlegene Einheit zerstört, ${entry.amount} Rückschlag-Schaden.`;
    case "attackClashDraw":
      return "Beide Einheiten haben gleich starken Angriff — beide zerstört.";
    case "lpChange":
      return `Lebenspunkte-Effekt: ${entry.amount && entry.amount >= 0 ? "+" : ""}${entry.amount}`;
    case "tacticPlayed":
      return "Taktik-Karte gespielt.";
    case "trapTriggered":
      return "Eine Falle wurde ausgelöst!";
    case "roundEnd":
      return `— Zug ${entry.round} beendet —`;
    case "battleEnd":
      return "Das Duell ist beendet.";
    default:
      return entry.type;
  }
}
