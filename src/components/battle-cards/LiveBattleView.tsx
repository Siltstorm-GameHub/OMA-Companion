"use client";

// ============================================
// Interaktiver Kampf — Zug-für-Zug-Steuerung
// ============================================
// Zeigt den aktuellen LiveBattle-Zustand (Polling) und lässt den Spieler,
// sobald seine Einheit an der Reihe ist, die Aktion (Normalangriff/Aktiv/
// Ultimate) und — falls nötig — das Ziel wählen (Glow: rot Gegner, grün
// Verbündete). "Als nächstes dran" zeigt die kommenden 5 Einheiten in
// Zugreihenfolge. Auto-Kampf überlässt die eigenen Entscheidungen der KI.
//
// Reine Präsentations-/Steuerungskomponente — die eigentliche Kampflogik
// läuft ausschließlich serverseitig (lib/battle-cards/live-battle.ts).

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Zap, Swords, Bot, ChevronRight, Timer } from "lucide-react";
import { getClassConfig, LEVEL_BORDER } from "./BattleCardView";
import type { ActionType, TeamId, UnitClass } from "@/lib/battle-engine/types";

interface LiveUnit {
  instanceId: string;
  teamId: TeamId;
  name: string;
  class: UnitClass;
  level: number;
  currentHp: number;
  maxHp: number;
  rage: number;
  isAlive: boolean;
  imageUrl?: string | null;
  avatarBadgeUrl?: string | null;
}

interface AvailableAction {
  actionType: ActionType;
  name: string;
  description: string;
  cost: number;
  targetKind: "enemy" | "ally" | "none";
}

interface LiveSnapshot {
  id: string;
  mode: string;
  status: "active" | "finished";
  round: number;
  units: LiveUnit[];
  upcoming: string[];
  recentLog: { type: string; [key: string]: unknown }[];
  awaiting: {
    unitId: string;
    teamId: TeamId;
    controlledByPlayerId: string;
    actions: AvailableAction[];
    candidateTargetsByAction: Partial<Record<ActionType, string[]>>;
    deadline: number | null;
  } | null;
  autoA: boolean;
  autoB: boolean;
  playerAId: string;
  playerBId: string | null;
  resultBattleId: string | null;
  winner: "A" | "B" | "DRAW" | null;
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
    case "damage":
      return `${nameOf(entry.targetId as string)} erleidet ${entry.amount as number} Schaden${entry.isCrit ? " (kritisch!)" : ""}.`;
    case "heal":
      return `${nameOf(entry.targetId as string)} wird um ${entry.amount as number} HP geheilt.`;
    case "death":
      return `${nameOf(entry.unitId as string)} wurde besiegt.`;
    case "roundStart":
      return `— Runde ${entry.round as number} —`;
    default:
      return null;
  }
}

function UnitCard({
  unit,
  isActing,
  glow,
  onClick,
}: {
  unit: LiveUnit;
  isActing: boolean;
  glow: "enemy" | "ally" | null;
  onClick?: () => void;
}) {
  const config = getClassConfig(unit.class);
  const Icon = config.icon;
  const hpPct = unit.maxHp > 0 ? Math.max(0, unit.currentHp / unit.maxHp) : 0;
  const borderColor = LEVEL_BORDER[unit.level] ?? LEVEL_BORDER[1];
  const clickable = !!glow && !!onClick && unit.isAlive;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className="w-16 sm:w-20 shrink-0 text-left"
      style={{ opacity: unit.isAlive ? 1 : 0.35, filter: unit.isAlive ? "none" : "grayscale(1)", cursor: clickable ? "pointer" : "default" }}
    >
      <div
        className="w-full aspect-square rounded-lg flex items-center justify-center relative overflow-hidden mb-1"
        style={{
          background: `${config.color}22`,
          boxShadow: isActing
            ? "0 0 0 2px #14b8a6, 0 0 14px rgba(20,184,166,0.6)"
            : glow === "enemy"
              ? "0 0 0 2px #ef4444, 0 0 12px rgba(239,68,68,0.55)"
              : glow === "ally"
                ? "0 0 0 2px #22c55e, 0 0 12px rgba(34,197,94,0.55)"
                : `0 0 0 1px ${borderColor}`,
        }}
      >
        {unit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.imageUrl} alt={unit.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-6 h-6" style={{ color: config.color, opacity: 0.6 }} />
        )}
      </div>
      <p className="text-[9px] text-white font-semibold truncate text-center">{unit.name}</p>
      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden mt-0.5">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${hpPct * 100}%`, background: hpBarColor(hpPct) }} />
      </div>
      <div className="h-1 rounded-full bg-black/40 overflow-hidden mt-0.5">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, unit.rage)}%`, background: "#60a5fa" }} />
      </div>
    </button>
  );
}

export default function LiveBattleView({ liveBattleId, viewerId }: { liveBattleId: string; viewerId: string }) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<AvailableAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0); // erzwingt einen Re-Render pro Sekunde für den Countdown

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

  async function submitAction(actionType: ActionType, targetId?: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/battle-cards/live/${liveBattleId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, targetId }),
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

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }
  if (!snapshot) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    );
  }

  const myTeam: TeamId | null = viewerId === snapshot.playerAId ? "A" : viewerId === snapshot.playerBId ? "B" : null;
  const opponentTeam: TeamId = myTeam === "A" ? "B" : "A";
  const isMyDecision = !!snapshot.awaiting && snapshot.awaiting.controlledByPlayerId === viewerId;
  const myAuto = myTeam === "A" ? snapshot.autoA : snapshot.autoB;
  const deadline = snapshot.awaiting?.deadline ?? null;
  const remainingSeconds = deadline !== null ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null;

  const unitsByTeam = (team: TeamId) => snapshot.units.filter((u) => u.teamId === team);
  const unitById = (id: string) => snapshot.units.find((u) => u.instanceId === id);
  const nameOf = (id: string) => unitById(id)?.name ?? "?";

  const candidates = selectedAction ? (snapshot.awaiting?.candidateTargetsByAction[selectedAction.actionType] ?? []) : [];
  function glowFor(unit: LiveUnit): "enemy" | "ally" | null {
    if (!selectedAction || !candidates.includes(unit.instanceId)) return null;
    return selectedAction.targetKind === "enemy" ? "enemy" : "ally";
  }

  function handleActionClick(action: AvailableAction) {
    if (action.targetKind === "none") {
      submitAction(action.actionType);
    } else {
      setSelectedAction(action);
    }
  }

  function handleUnitClick(unit: LiveUnit) {
    if (!selectedAction) return;
    if (!candidates.includes(unit.instanceId)) return;
    submitAction(selectedAction.actionType, unit.instanceId);
  }

  return (
    <div className="space-y-3">
      {myTeam && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
          <span>Runde {snapshot.round}</span>
          <button
            type="button"
            onClick={() => toggleAuto(!myAuto)}
            disabled={busy || snapshot.status === "finished"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors disabled:opacity-40 ${
              myAuto ? "bg-violet-500/20 text-violet-300" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
            }`}
          >
            <Bot className="w-3 h-3" /> Auto-Kampf {myAuto ? "an" : "aus"}
          </button>
        </div>
      )}

      <div className="surface-elevated rounded-xl p-3 space-y-3">
        <div className="flex gap-2 justify-center flex-wrap">
          {unitsByTeam(opponentTeam).map((u) => (
            <UnitCard key={u.instanceId} unit={u} isActing={snapshot.awaiting?.unitId === u.instanceId} glow={glowFor(u)} onClick={() => handleUnitClick(u)} />
          ))}
        </div>
        <div className="border-t border-white/[0.06]" />
        <div className="flex gap-2 justify-center flex-wrap">
          {unitsByTeam(myTeam ?? "A").map((u) => (
            <UnitCard key={u.instanceId} unit={u} isActing={snapshot.awaiting?.unitId === u.instanceId} glow={glowFor(u)} onClick={() => handleUnitClick(u)} />
          ))}
        </div>
      </div>

      {/* Als nächstes dran */}
      {snapshot.upcoming.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest shrink-0">Als nächstes</span>
          <ChevronRight className="w-3 h-3 text-gray-700 shrink-0" />
          {snapshot.upcoming.map((id, i) => {
            const u = unitById(id);
            if (!u) return null;
            const config = getClassConfig(u.class);
            const Icon = config.icon;
            return (
              <div
                key={`${id}-${i}`}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${config.color}22`, opacity: 1 - i * 0.12 }}
                title={u.name}
              >
                <Icon className="w-3 h-3" style={{ color: config.color }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Log */}
      <div className="surface rounded-md px-3 py-2 min-h-[60px] flex flex-col justify-end gap-0.5">
        {snapshot.recentLog
          .map((e) => describeLogEntry(e, nameOf))
          .filter((line): line is string => !!line)
          .slice(-4)
          .map((line, i) => (
            <p key={i} className="text-[11px] text-gray-400 leading-snug">
              {line}
            </p>
          ))}
      </div>

      {/* Entscheidung */}
      {snapshot.status === "finished" ? (
        <div className="flex items-center justify-between gap-2 glass rounded-xl p-3">
          <p className="text-sm text-white font-semibold">Kampf beendet.</p>
          {snapshot.resultBattleId && (
            <Link
              href={`/battle-cards/battles/${snapshot.resultBattleId}`}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 transition-colors"
            >
              Zum Ergebnis <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      ) : isMyDecision && snapshot.awaiting ? (
        <div className="glass rounded-xl p-3 space-y-2">
          {selectedAction ? (
            <>
              <p className="text-xs text-gray-400">
                Ziel wählen für <span className="text-white font-semibold">{selectedAction.name}</span> — markierte Karte antippen.
              </p>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Andere Aktion wählen
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-400">Du bist am Zug — wähle eine Aktion.</p>
                {remainingSeconds !== null && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 tabular-nums shrink-0">
                    <Timer className="w-3 h-3" /> {remainingSeconds}s
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {snapshot.awaiting.actions.map((action) => (
                  <button
                    key={action.actionType}
                    type="button"
                    onClick={() => handleActionClick(action)}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50"
                    title={action.description}
                  >
                    {action.actionType === "ultimate" ? (
                      <Zap className="w-3.5 h-3.5" />
                    ) : action.actionType === "active" ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : (
                      <Swords className="w-3.5 h-3.5" />
                    )}
                    {action.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center">
          {myAuto
            ? "Auto-Kampf aktiv — deine Züge laufen automatisch."
            : remainingSeconds !== null
              ? `Gegner ist am Zug… (${remainingSeconds}s)`
              : "Gegner ist am Zug…"}
        </p>
      )}
    </div>
  );
}
