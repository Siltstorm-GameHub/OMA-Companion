"use client";

// ============================================
// OMA Duels (Yu-Gi-Oh-artiges Live-PvP) — Vollbild-Spielbrett
// ============================================
// Ersetzt die alte sequentielle Zug-für-Zug-Ansicht (LiveBattleView.tsx) für
// diesen Modus: Deck/Hand/3-Feld-Slots pro Spieler, simultane Runden mit
// Timer statt "eine Einheit ist an der Reihe".
//
// Zeigt echte Kartenbilder auf dem Feld/in der Hand (statt reiner Stat-
// Balken), verdeckte Kartenrücken für die gegnerische Hand/Fallen, Treffer-
// Feedback (fliegende Zahlen, Block/Ausweichen-Marker, kurzer Impact-Flash)
// und Sound — analog zu den Mustern aus LiveBattleView.tsx, aber auf das
// deutlich andere State-Modell (Deck/Hand/Feld statt "eine Einheit ist dran")
// zugeschnitten.
//
// Reine Präsentations-/Steuerungskomponente — die eigentliche Kampflogik läuft
// ausschließlich serverseitig (lib/battle-cards/duel-live-battle.ts).

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Shield, Sparkles, Swords, Volume2, VolumeX, Wind } from "lucide-react";
import { getClassConfig } from "./BattleCardView";
import ErrorNotice from "./ErrorNotice";
import { DUEL_ROUND_TIMEOUT_MS } from "@/lib/battle-engine/duel-constants";
import {
  isSoundMuted,
  playCardRevealSound,
  playDamageSoundFor,
  playDefeatSound,
  playHealSound,
  playShieldSound,
  playSwapSound,
  playUltimateSoundFor,
  playVictorySound,
  setSoundMuted,
} from "@/lib/battle-cards/sound";
import type { UnitClass } from "@/lib/battle-engine/types";

type TeamId = "A" | "B";
type DuelActionType = "normalAttack" | "block" | "dodge" | "active" | "ultimate";

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
}

interface LiveDuelHandCard {
  cardId: string;
  kind: "unit" | "tactic";
  name: string;
  imageUrl?: string | null;
  unitClass?: UnitClass;
  tacticKind?: "INSTANT" | "TRAP";
}

interface LiveDuelPlayer {
  lifePoints: number;
  field: (LiveDuelUnit | null)[];
  deckCount: number;
  graveyardCount: number;
  trapCount: number;
  hand: LiveDuelHandCard[] | null;
  handCount: number;
  hasSubmitted: boolean;
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
  defendingTeam?: TeamId;
  remainingLp?: number;
  unitId?: string;
  winner?: TeamId | "DRAW";
}

interface LiveDuelSnapshot {
  id: string;
  status: "active" | "finished";
  round: number;
  roundDeadline: number;
  viewerTeam: TeamId;
  self: LiveDuelPlayer;
  opponent: LiveDuelPlayer;
  log: DuelLogEntry[];
  winner: TeamId | "DRAW" | null;
  resultBattleId: string | null;
}

interface DraftFieldAction {
  slotIndex: number;
  action: DuelActionType;
  targetSlotIndex?: number;
}

interface FloatingEffect {
  id: string;
  side: "self" | "opponent";
  anchor: { kind: "slot"; slotIndex: number } | { kind: "lp" };
  text: string;
  tone: "damage" | "crit" | "heal" | "shield" | "block" | "dodge" | "info";
}

const START_LP = 4000;
const ROUND_SECONDS = Math.round(DUEL_ROUND_TIMEOUT_MS / 1000);

const ACTION_LABEL: Record<DuelActionType, string> = {
  normalAttack: "Angriff",
  block: "Block",
  dodge: "Ausweichen",
  active: "Skill",
  ultimate: "Ultimate",
};

const TONE_COLOR: Record<FloatingEffect["tone"], string> = {
  damage: "#fb7185",
  crit: "#f43f5e",
  heal: "#34d399",
  shield: "#60a5fa",
  block: "#38bdf8",
  dodge: "#a78bfa",
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
      <div className="h-2.5 flex-1 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
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
  const pct = Math.max(0, Math.min(1, secondsLeft / ROUND_SECONDS));
  const color = secondsLeft <= 5 ? "#f43f5e" : secondsLeft <= 10 ? "#f59e0b" : "#2dd4bf";
  const deg = Math.round(pct * 360);
  return (
    <div
      className="relative w-10 h-10 rounded-full shrink-0"
      style={{ background: `conic-gradient(${color} ${deg}deg, #1e293b ${deg}deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-[#12151a] flex items-center justify-center">
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
        tone === "rose" ? "border-rose-500/40 bg-rose-500/10" : "border-slate-600 bg-slate-800"
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
            : "border-slate-700 bg-slate-900/40 text-slate-600"
        }`}
      >
        {selectable ? "Hierhin beschwören" : "Leer"}
      </button>
    );
  }

  const config = getClassConfig(unit.class);
  const Icon = config.icon;
  const ultimateReady = unit.isAlive && unit.rage >= unit.ultimateCost;

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`relative w-full h-28 rounded-lg border overflow-hidden text-left transition-transform ${
        selected ? "border-teal-400" : ultimateReady ? "border-amber-400 duel-ultimate-glow" : "border-slate-700"
      } ${!unit.isAlive ? "opacity-40 grayscale" : ""} ${flashing ? "duel-hit-flash" : ""} ${lunging ? "duel-lunge" : ""}`}
      style={{
        backgroundImage: unit.imageUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%), url(${unit.imageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: unit.imageUrl ? undefined : "#1e293b",
      }}
    >
      <FloatingLayer effects={floating} />
      {!unit.imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-8 h-8 opacity-30" style={{ color: config.color }} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-1.5 space-y-1">
        <div className="flex items-center gap-1 min-w-0">
          <Icon className="w-3 h-3 shrink-0" style={{ color: config.color }} />
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
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const [lungeKeys, setLungeKeys] = useState<Set<string>>(new Set());

  const [pendingSummonCardId, setPendingSummonCardId] = useState<string | null>(null);
  const [summonSlot, setSummonSlot] = useState<{ handCardId: string; slotIndex: number } | null>(null);
  const [tacticChoice, setTacticChoice] = useState<{ handCardId: string; mode: "instant" | "setFaceDown" } | null>(null);
  const [fieldActions, setFieldActions] = useState<Record<number, DraftFieldAction>>({});
  const [configuringSlot, setConfiguringSlot] = useState<number | null>(null);

  const prevSnapshotsRef = useRef<LiveDuelSnapshot[]>([]);
  const lastLogLengthRef = useRef<number>(0);

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
        case "dodged": {
          const target = entry.defenderUnitId ? locateUnit(entry.defenderUnitId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-dodge`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: "Ausgewichen!",
              tone: "dodge",
            });
          }
          playSwapSound();
          break;
        }
        case "blocked": {
          const target = entry.defenderUnitId ? locateUnit(entry.defenderUnitId, candidates) : null;
          if (target) {
            spawned.push({
              id: `${spawned.length}-block`,
              side: target.side,
              anchor: { kind: "slot", slotIndex: target.unit.slotIndex },
              text: "Geblockt!",
              tone: "block",
            });
          }
          playShieldSound();
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
        setError(data.error ?? "Kampf konnte nicht geladen werden.");
        return;
      }
      processNewLogEntries(data);
      setSnapshot(data);
      if (data.self?.hasSubmitted) {
        setPendingSummonCardId(null);
        setSummonSlot(null);
        setTacticChoice(null);
        setFieldActions({});
        setConfiguringSlot(null);
      }
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

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-[#12151a] flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-3">
          <ErrorNotice message={error} size="lg" />
          <button onClick={handleExit} className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm py-2">
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="fixed inset-0 z-50 bg-[#12151a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  const secondsLeft = Math.max(0, Math.ceil((snapshot.roundDeadline - Date.now()) / 1000));
  const alreadySubmitted = snapshot.self.hasSubmitted;
  const finished = snapshot.status === "finished";
  const won = snapshot.winner === snapshot.viewerTeam;
  const drew = snapshot.winner === "DRAW";

  const usedHandCardId = pendingSummonCardId ?? summonSlot?.handCardId ?? tacticChoice?.handCardId ?? null;

  function effectsFor(side: "self" | "opponent", slotIndex: number) {
    return floatingEffects.filter((e) => e.side === side && e.anchor.kind === "slot" && e.anchor.slotIndex === slotIndex);
  }
  function lpEffectsFor(side: "self" | "opponent") {
    return floatingEffects.filter((e) => e.side === side && e.anchor.kind === "lp");
  }

  function toggleHandCard(card: LiveDuelHandCard) {
    if (alreadySubmitted || finished) return;
    if (usedHandCardId === card.cardId) {
      setPendingSummonCardId(null);
      setSummonSlot(null);
      setTacticChoice(null);
      return;
    }
    if (card.kind === "unit") {
      setTacticChoice(null);
      setSummonSlot(null);
      setPendingSummonCardId(card.cardId);
    } else {
      setPendingSummonCardId(null);
      setSummonSlot(null);
      setTacticChoice({ handCardId: card.cardId, mode: "instant" });
    }
  }

  function pickSummonSlot(slotIndex: number) {
    if (!pendingSummonCardId) return;
    setSummonSlot({ handCardId: pendingSummonCardId, slotIndex });
    setPendingSummonCardId(null);
  }

  function setSlotAction(slotIndex: number, action: DuelActionType) {
    setFieldActions((prev) => ({ ...prev, [slotIndex]: { slotIndex, action } }));
    const needsTarget = action === "normalAttack" || action === "active" || action === "ultimate";
    setConfiguringSlot(needsTarget ? slotIndex : null);
  }

  function chooseTarget(slotIndex: number, targetSlotIndex: number) {
    setFieldActions((prev) => ({ ...prev, [slotIndex]: { ...prev[slotIndex], slotIndex, targetSlotIndex } }));
    setConfiguringSlot(null);
  }

  async function submitRound() {
    setBusy(true);
    try {
      const body = {
        summon: summonSlot ?? undefined,
        playTactic: tacticChoice ?? undefined,
        fieldActions: Object.values(fieldActions),
      };
      const res = await fetch(`/api/battle-cards/duel/${liveBattleId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Runde konnte nicht eingereicht werden.");
        return;
      }
      processNewLogEntries(data);
      setSnapshot(data);
      setPendingSummonCardId(null);
      setSummonSlot(null);
      setTacticChoice(null);
      setFieldActions({});
      setConfiguringSlot(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#12151a] text-slate-100 overflow-y-auto">
      <style>{`
        @keyframes duelFloatUp { 0% { opacity: 0; transform: translateY(4px) scale(0.9); } 15% { opacity: 1; transform: translateY(-6px) scale(1); } 100% { opacity: 0; transform: translateY(-32px) scale(1); } }
        .duel-float { animation: duelFloatUp 1.1s ease-out forwards; }
        @keyframes duelHitFlash { 0% { filter: brightness(2.2) saturate(1.5); } 100% { filter: brightness(1) saturate(1); } }
        .duel-hit-flash { animation: duelHitFlash 0.45s ease-out; }
        @keyframes duelLunge { 0% { transform: translateY(0); } 30% { transform: translateY(-4px); } 100% { transform: translateY(0); } }
        .duel-lunge { animation: duelLunge 0.3s ease-out; }
        @keyframes duelUltimateGlow { 0%, 100% { box-shadow: 0 0 6px 1px rgba(251,191,36,0.5); } 50% { box-shadow: 0 0 14px 4px rgba(251,191,36,0.85); } }
        .duel-ultimate-glow { animation: duelUltimateGlow 1.4s ease-in-out infinite; }
        @keyframes duelPulseRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0.5); } 50% { box-shadow: 0 0 0 5px rgba(45,212,191,0); } }
        .duel-pulse-ring { animation: duelPulseRing 1.6s ease-in-out infinite; }
        @keyframes duelLpCritical { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        .duel-lp-critical { animation: duelLpCritical 1s ease-in-out infinite; }
      `}</style>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleExit} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm">
            <ChevronLeft className="w-4 h-4" /> Verlassen
          </button>
          <div className="flex items-center gap-3">
            <button onClick={toggleSoundMuted} className="text-slate-500 hover:text-slate-300" aria-label="Sound umschalten">
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-sm text-slate-300">Runde {snapshot.round}</span>
            {!finished && <RadialTimer secondsLeft={secondsLeft} />}
          </div>
        </div>

        {finished ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center space-y-3">
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
        ) : null}

        {/* Gegner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gegner {snapshot.opponent.hasSubmitted ? "· hat gewählt" : "· überlegt noch"}</span>
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
            {snapshot.opponent.field.map((slot, i) => (
              <UnitSlot key={i} unit={slot} floating={effectsFor("opponent", i)} flashing={flashKeys.has(`opponent-${i}`)} lunging={lungeKeys.has(`opponent-${i}`)} />
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-800" />

        {/* Eigenes Feld */}
        <div className="space-y-2">
          <div className="relative">
            <FloatingLayer effects={lpEffectsFor("self")} />
            <LpBar lp={snapshot.self.lifePoints} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {snapshot.self.field.map((slot, i) => {
              const draft = fieldActions[i];
              const isSummonTarget = !slot && pendingSummonCardId !== null;
              return (
                <div key={i} className="space-y-1">
                  <UnitSlot
                    unit={slot}
                    floating={effectsFor("self", i)}
                    selectable={isSummonTarget}
                    selected={!!draft || summonSlot?.slotIndex === i}
                    flashing={flashKeys.has(`self-${i}`)}
                    lunging={lungeKeys.has(`self-${i}`)}
                    onClick={isSummonTarget ? () => pickSummonSlot(i) : undefined}
                  />
                  {slot?.isAlive && !alreadySubmitted && !finished && (
                    <div className="flex flex-wrap gap-1">
                      {(["normalAttack", "block", "dodge", "active", "ultimate"] as DuelActionType[]).map((action) => (
                        <button
                          key={action}
                          onClick={() => setSlotAction(i, action)}
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            draft?.action === action
                              ? "border-teal-400 bg-teal-500/20 text-teal-200"
                              : "border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          {ACTION_LABEL[action]}
                        </button>
                      ))}
                    </div>
                  )}
                  {configuringSlot === i && (
                    <div className="flex flex-wrap gap-1">
                      {snapshot.opponent.field.map((oppSlot, targetIndex) => (
                        <button
                          key={targetIndex}
                          onClick={() => chooseTarget(i, targetIndex)}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/50 text-rose-300 hover:bg-rose-500/10"
                        >
                          {oppSlot ? oppSlot.name : "Direkt (Face)"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Eigene Hand */}
        {!finished && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400">
              Hand ({snapshot.self.hand?.length ?? 0}) · Deck {snapshot.self.deckCount} · Fallen {snapshot.self.trapCount}
              {pendingSummonCardId && <span className="text-teal-300"> · Ziel-Slot wählen</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {(snapshot.self.hand ?? []).map((card) => {
                const isSelected = usedHandCardId === card.cardId;
                const config = card.unitClass ? getClassConfig(card.unitClass) : null;
                const Icon = config?.icon ?? (card.tacticKind === "TRAP" ? Shield : Sparkles);
                return (
                  <button
                    key={card.cardId}
                    disabled={alreadySubmitted}
                    onClick={() => toggleHandCard(card)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 w-16 ${
                      isSelected ? "border-teal-400 bg-teal-500/15" : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                    }`}
                  >
                    <div
                      className="w-full h-12 rounded overflow-hidden flex items-center justify-center bg-slate-800"
                      style={
                        card.imageUrl
                          ? { backgroundImage: `url(${card.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : undefined
                      }
                    >
                      {!card.imageUrl && <Icon className="w-5 h-5" style={{ color: config?.color ?? "#94a3b8" }} />}
                    </div>
                    <span className="text-[10px] text-slate-200 truncate w-full text-center">{card.name}</span>
                  </button>
                );
              })}
            </div>
            {tacticChoice && (
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => setTacticChoice((prev) => (prev ? { ...prev, mode: "instant" } : prev))}
                  className={`px-2 py-1 rounded border ${tacticChoice.mode === "instant" ? "border-teal-400 text-teal-200" : "border-slate-700 text-slate-400"}`}
                >
                  Sofort spielen
                </button>
                <button
                  onClick={() => setTacticChoice((prev) => (prev ? { ...prev, mode: "setFaceDown" } : prev))}
                  className={`px-2 py-1 rounded border ${tacticChoice.mode === "setFaceDown" ? "border-teal-400 text-teal-200" : "border-slate-700 text-slate-400"}`}
                >
                  Verdeckt setzen
                </button>
              </div>
            )}
          </div>
        )}

        {!finished && (
          <button
            onClick={submitRound}
            disabled={busy || alreadySubmitted}
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : alreadySubmitted ? <Wind className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
            {alreadySubmitted ? "Warte auf Gegner …" : "Runde einreichen"}
          </button>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 max-h-40 overflow-y-auto text-[11px] text-slate-400 space-y-0.5">
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
      return `Runde ${entry.round} beginnt.`;
    case "summon":
      return "Eine Karte wurde beschworen.";
    case "faceDamage":
      return `Direkter Treffer: ${entry.amount} Schaden`;
    case "damage":
      return `Schaden: ${entry.amount}${entry.isCrit ? " (Crit!)" : ""}`;
    case "heal":
      return `Heilung: ${entry.amount}`;
    case "death":
      return "Eine Einheit wurde besiegt.";
    case "tacticPlayed":
      return "Taktik-Karte gespielt.";
    case "trapTriggered":
      return "Eine Falle wurde ausgelöst!";
    case "blocked":
      return "Angriff geblockt.";
    case "dodged":
      return "Angriff ausgewichen.";
    case "roundEnd":
      return `— Runde ${entry.round} beendet —`;
    case "battleEnd":
      return "Das Duell ist beendet.";
    default:
      return entry.type;
  }
}
