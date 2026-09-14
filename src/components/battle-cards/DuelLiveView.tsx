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
import ErrorNotice from "./ErrorNotice";
import { DUEL_TURN_TIMEOUT_MS } from "@/lib/battle-engine/duel-constants";
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
  remainingLp?: number;
  unitId?: string;
  winner?: TeamId | "DRAW";
  team?: TeamId;
  slotIndex?: number;
  stance?: DuelStance;
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
  self: LiveDuelPlayer;
  opponent: LiveDuelPlayer;
  log: DuelLogEntry[];
  winner: TeamId | "DRAW" | null;
  resultBattleId: string | null;
}

type DuelAction =
  | { type: "summon"; handCardId: string; slotIndex: number; stance: DuelStance }
  | { type: "changeStance"; slotIndex: number; stance: DuelStance }
  | { type: "playTactic"; handCardId: string; mode: "instant" | "setFaceDown" }
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

const START_LP = 4000;
const TURN_SECONDS = Math.round(DUEL_TURN_TIMEOUT_MS / 1000);

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

const STANCE_LABEL: Record<DuelStance, string> = { attack: "Angriff", defense: "Verteidigung" };

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
  flashing,
  lunging,
  onClick,
}: {
  unit: LiveDuelUnit | null;
  floating: FloatingEffect[];
  selectable?: boolean;
  selected?: boolean;
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
        className={`relative w-full h-28 rounded-lg border border-dashed flex items-center justify-center text-[11px] text-center transition-colors ${
          selectable
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
      className={`relative w-full h-28 rounded-lg overflow-hidden text-left transition-transform ${
        isDefense
          ? "border-[3px] border-sky-400 duel-defense-glow"
          : selected
            ? "border border-teal-400"
            : ultimateReady
              ? "border border-amber-400 duel-ultimate-glow"
              : "border border-[color:var(--moba-accent-line)]"
      } ${!unit.isAlive ? "opacity-40 grayscale" : ""} ${flashing ? "duel-hit-flash" : ""} ${lunging ? "duel-lunge" : ""}`}
      style={{
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
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const [lungeKeys, setLungeKeys] = useState<Set<string>>(new Set());

  // Beschwörung: Karte auswählen -> Stellung wählen -> Ziel-Slot antippen (löst sofort aus).
  const [pendingSummon, setPendingSummon] = useState<{ handCardId: string; stance: DuelStance } | null>(null);
  // Angriff: Einheit + Angriffsart auswählen -> Ziel-Slot antippen (löst sofort aus).
  const [pendingAttack, setPendingAttack] = useState<{ slotIndex: number; attackType: DuelAttackType } | null>(null);

  const prevSnapshotsRef = useRef<LiveDuelSnapshot[]>([]);
  const lastLogLengthRef = useRef<number>(0);

  function resetSelection() {
    setPendingSummon(null);
    setPendingAttack(null);
  }

  function toggleSoundMuted() {
    setSoundMutedState((prev) => {
      const next = !prev;
      setSoundMuted(next);
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
          playDamageSoundFor(target?.unit.class, true);
          break;
        }
        case "defenseReflect": {
          const side: "self" | "opponent" = entry.attackerTeam === newSnapshot.viewerTeam ? "self" : "opponent";
          spawned.push({
            id: `${spawned.length}-reflect-${entry.round}`,
            side,
            anchor: { kind: "lp" },
            text: `-${entry.amount}`,
            tone: "damage",
          });
          playDamageSoundFor(undefined, false);
          break;
        }
        case "defenseBounce": {
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
          playShieldSound();
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
        case "tacticPlayed":
          playCardRevealSound();
          break;
        case "trapTriggered":
          playShieldSound();
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
  const canAct = isMyTurn && !finished && !busy;
  const isMainPhase = snapshot.phase === "main1" || snapshot.phase === "main2";

  function effectsFor(side: "self" | "opponent", slotIndex: number) {
    return floatingEffects.filter((e) => e.side === side && e.anchor.kind === "slot" && e.anchor.slotIndex === slotIndex);
  }
  function lpEffectsFor(side: "self" | "opponent") {
    return floatingEffects.filter((e) => e.side === side && e.anchor.kind === "lp");
  }

  function selectHandCard(card: LiveDuelHandCard) {
    if (!canAct || !isMainPhase) return;
    if (card.kind === "unit") {
      if (snapshot!.normalSummonUsed) return;
      setPendingAttack(null);
      setPendingSummon((prev) => (prev?.handCardId === card.cardId ? null : { handCardId: card.cardId, stance: "attack" }));
    } else {
      // Taktik-Karten lösen sofort aus — Modus ergibt sich fix aus der Kartenart.
      const mode: "instant" | "setFaceDown" = card.tacticKind === "TRAP" ? "setFaceDown" : "instant";
      void postAction({ type: "playTactic", handCardId: card.cardId, mode });
    }
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

  const opponentHasUnits = snapshot.opponent.field.some((u) => u?.isAlive);

  return (
    <div className="fixed inset-0 z-50 bg-[#04061a] text-[color:var(--moba-ink)] overflow-y-auto">
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
      `}</style>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleExit} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm">
            <MobaIcon name="chevronLeft" className="w-4 h-4" /> Verlassen
          </button>
          <div className="flex items-center gap-3">
            <button onClick={toggleSoundMuted} className="text-slate-500 hover:text-slate-300" aria-label="Sound umschalten">
              <MobaIcon name={soundMuted ? "soundOff" : "soundOn"} className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300">Zug {snapshot.round}</span>
            {!finished && <RadialTimer secondsLeft={secondsLeft} />}
          </div>
        </div>

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
              return (
                <UnitSlot
                  key={i}
                  unit={slot}
                  floating={effectsFor("opponent", i)}
                  flashing={flashKeys.has(`opponent-${i}`)}
                  lunging={lungeKeys.has(`opponent-${i}`)}
                  selectable={isValidAttackTarget}
                  onClick={isValidAttackTarget ? () => pickAttackTarget(i) : undefined}
                />
              );
            })}
          </div>
          {pendingAttack && (
            <p className="text-[10px] text-teal-300 text-center">
              {opponentHasUnits ? "Ziel wählen …" : "Gegner hat keine Einheiten mehr — Direktangriff: beliebiges Feld antippen."}
            </p>
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
              const isSummonTarget = canAct && isMainPhase && !slot && pendingSummon !== null;
              const canChangeStance =
                canAct && isMainPhase && slot?.isAlive && !slot.summonedThisTurn && !slot.stanceLockedThisTurn && !slot.attackedThisTurn;
              const canDeclareAttack =
                canAct && snapshot.phase === "battle" && slot?.isAlive && !slot.summonedThisTurn && !slot.attackedThisTurn && slot.stance === "attack";
              const ultimateReady = !!slot?.isAlive && slot.rage >= slot.ultimateCost;
              const isSelectedAttacker = pendingAttack?.slotIndex === i;

              return (
                <div key={i} className="space-y-1">
                  <UnitSlot
                    unit={slot}
                    floating={effectsFor("self", i)}
                    selectable={isSummonTarget}
                    selected={isSelectedAttacker}
                    flashing={flashKeys.has(`self-${i}`)}
                    lunging={lungeKeys.has(`self-${i}`)}
                    onClick={isSummonTarget ? () => pickSummonSlot(i) : undefined}
                  />
                  {slot && canChangeStance && (
                    <button
                      onClick={() => toggleFieldStance(slot)}
                      className="w-full text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 hover:border-slate-500"
                    >
                      → {STANCE_LABEL[slot.stance === "attack" ? "defense" : "attack"]}
                    </button>
                  )}
                  {slot && canDeclareAttack && (
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => selectAttack(slot, "normalAttack")}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hauptphase 1/2 — Beschwörung + Stellungswechsel + Taktik-Karte */}
        {isMyTurn && !finished && isMainPhase && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400">
              Hand ({snapshot.self.hand?.length ?? 0}) · Deck {snapshot.self.deckCount} · Fallen {snapshot.self.trapCount}
              {snapshot.normalSummonUsed && <span className="text-amber-300"> · Normalbeschwörung bereits genutzt</span>}
              {pendingSummon && <span className="text-teal-300"> · Ziel-Slot wählen</span>}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {(snapshot.self.hand ?? []).map((card) => {
                const isSelected = pendingSummon?.handCardId === card.cardId;
                const isDisabled = card.kind === "unit" && snapshot.normalSummonUsed;

                if (card.kind === "unit" && card.unitCard) {
                  return (
                    <div
                      key={card.cardId}
                      className={`w-28 shrink-0 rounded-lg p-1 transition-colors ${isSelected ? "bg-teal-500/15 ring-2 ring-teal-400" : ""} ${isDisabled ? "opacity-40" : ""}`}
                    >
                      <CardTile card={card.unitCard} level={card.unitCard.level ?? 1} onClick={() => selectHandCard(card)} />
                    </div>
                  );
                }

                return (
                  <div key={card.cardId} className="w-28 shrink-0">
                    <TacticCardTile
                      card={{ id: card.cardId, name: card.name, kind: card.tacticKind ?? "INSTANT", imageUrl: card.imageUrl }}
                      selected={false}
                      disabled={false}
                      onClick={() => selectHandCard(card)}
                    />
                  </div>
                );
              })}
            </div>
            {pendingSummon && (
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => setPendingSummon((prev) => (prev ? { ...prev, stance: "attack" } : prev))}
                  className={`px-2 py-1 rounded border ${pendingSummon.stance === "attack" ? "border-teal-400 text-teal-200" : "border-slate-700 text-slate-400"}`}
                >
                  Angriffsstellung
                </button>
                <button
                  onClick={() => setPendingSummon((prev) => (prev ? { ...prev, stance: "defense" } : prev))}
                  className={`px-2 py-1 rounded border ${pendingSummon.stance === "defense" ? "border-sky-400 text-sky-200" : "border-slate-700 text-slate-400"}`}
                >
                  Verteidigungsstellung
                </button>
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-2">
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

        {canAct && (
          <div className="flex gap-2">
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

        <div className="rounded-lg border border-[color:var(--moba-accent-line)] bg-black/30 p-2 max-h-40 overflow-y-auto text-[11px] text-[color:var(--moba-ink-dim)] space-y-0.5">
          {snapshot.log.slice(-15).map((entry, i) => (
            <div key={i}>{describeLogEntry(entry)}</div>
          ))}
        </div>
      </div>
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
