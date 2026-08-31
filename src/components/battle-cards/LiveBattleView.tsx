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
// Porträt + Rahmenfarbe (blau eigen, rot gegnerisch). Auto-Kampf überlässt
// die eigenen Entscheidungen der KI.
//
// Reine Präsentations-/Steuerungskomponente — die eigentliche Kampflogik
// läuft ausschließlich serverseitig (lib/battle-cards/live-battle.ts).

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Zap, Swords, Bot, ChevronRight, ChevronLeft, Timer } from "lucide-react";
import { getClassConfig, LEVEL_BORDER } from "./BattleCardView";
import type { ActionType, TeamId, UnitClass } from "@/lib/battle-engine/types";

const ARENA_BACKGROUND_STYLE: CSSProperties = {
  backgroundColor: "#12151a",
  backgroundImage: [
    "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(239,68,68,0.18), transparent 70%)",
    "radial-gradient(ellipse 70% 45% at 50% 92%, rgba(20,184,166,0.18), transparent 70%)",
    "linear-gradient(180deg, rgba(13,15,19,0.55) 0%, rgba(13,15,19,0.25) 35%, rgba(13,15,19,0.25) 65%, rgba(13,15,19,0.55) 100%)",
    "url(/battle-cards/arena-bg.jpg)",
  ].join(", "),
  backgroundSize: "auto, auto, auto, cover",
  backgroundPosition: "center",
};

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

function ActionIcon({ actionType, className }: { actionType: ActionType; className?: string }) {
  if (actionType === "ultimate") return <Zap className={className} />;
  if (actionType === "active") return <Bot className={className} />;
  return <Swords className={className} />;
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
      className="w-20 sm:w-28 shrink-0 text-left relative"
      style={{ opacity: unit.isAlive ? 1 : 0.35, filter: unit.isAlive ? "none" : "grayscale(1)", cursor: clickable ? "pointer" : "default" }}
    >
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

      <div className="w-full aspect-square mb-0.5 flex items-center justify-center relative rounded-md overflow-hidden">
        {(isActing || glow) && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: isActing
                ? "radial-gradient(closest-side, rgba(20,184,166,0.35), transparent 70%)"
                : glow === "enemy"
                  ? "radial-gradient(closest-side, rgba(239,68,68,0.35), transparent 70%)"
                  : "radial-gradient(closest-side, rgba(34,197,94,0.35), transparent 70%)",
            }}
          />
        )}
        {unit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={unit.imageUrl}
            alt={unit.name}
            className="max-w-full max-h-full object-contain relative"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative" style={{ background: `${config.color}22` }}>
            <Icon className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: config.color, opacity: 0.55 }} />
          </div>
        )}
        <div
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            boxShadow:
              glow === "enemy"
                ? "0 0 0 2px #ef4444, 0 0 14px rgba(239,68,68,0.6)"
                : glow === "ally"
                  ? "0 0 0 2px #22c55e, 0 0 14px rgba(34,197,94,0.6)"
                  : `0 0 0 1px ${borderColor}`,
          }}
        />
      </div>

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
      <div className="mt-0.5 h-1 rounded-full bg-black/40 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${Math.min(100, unit.rage)}%`, background: "#60a5fa" }} />
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

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ ...ARENA_BACKGROUND_STYLE, zIndex: 9999 }}>
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 shrink-0 relative z-10">
        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white transition-colors px-2 py-1.5 rounded-md bg-black/30"
        >
          <ChevronLeft className="w-4 h-4" /> Zurück
        </button>
        {snapshot && (
          <span className="text-[11px] text-gray-400 bg-black/30 px-2.5 py-1 rounded-md">Runde {snapshot.round}</span>
        )}
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-rose-400 text-center">{error}</p>
        </div>
      ) : !snapshot ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <LiveBattleBody
          snapshot={snapshot}
          viewerId={viewerId}
          busy={busy}
          selectedAction={selectedAction}
          setSelectedAction={setSelectedAction}
          submitAction={submitAction}
          toggleAuto={toggleAuto}
        />
      )}
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
  toggleAuto,
}: {
  snapshot: LiveSnapshot;
  viewerId: string;
  busy: boolean;
  selectedAction: AvailableAction | null;
  setSelectedAction: (a: AvailableAction | null) => void;
  submitAction: (actionType: ActionType, targetId?: string) => void;
  toggleAuto: (on: boolean) => void;
}) {
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
    <div className="flex-1 flex flex-col min-h-0 relative z-10 px-3">
      {/* Auto-Kampf + Als nächstes dran — oberhalb der Helden */}
      <div className="shrink-0 pt-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          {snapshot.upcoming.length > 0 ? (
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Als nächstes dran</span>
          ) : (
            <span />
          )}
          {snapshot.status !== "finished" && myTeam && (
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
        {snapshot.upcoming.length > 0 && (
          // py-1.5 gibt dem Rahmen (boxShadow, ragt ~3px über den Kreis hinaus) Platz —
          // sonst schneidet overflow-x-auto (erzwingt overflow-y: auto) ihn oben/unten ab.
          <div className="flex items-center gap-2 overflow-x-auto py-1.5">
            {snapshot.upcoming.map((id, i) => {
              const u = unitById(id);
              if (!u) return null;
              const isMine = myTeam !== null && u.teamId === myTeam;
              const ringColor = isMine ? "#3b82f6" : "#ef4444";
              const config = getClassConfig(u.class);
              const Icon = config.icon;
              return (
                <div
                  key={`${id}-${i}`}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 relative"
                  style={{ boxShadow: `0 0 0 3px ${ringColor}`, opacity: 1 - i * 0.08 }}
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
            <UnitCard key={u.instanceId} unit={u} isActing={snapshot.awaiting?.unitId === u.instanceId} glow={glowFor(u)} onClick={() => handleUnitClick(u)} />
          ))}
        </div>
        <div className="border-t border-white/10 mx-6" />
        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
          {unitsByTeam(myTeam ?? "A").map((u) => (
            <UnitCard key={u.instanceId} unit={u} isActing={snapshot.awaiting?.unitId === u.instanceId} glow={glowFor(u)} onClick={() => handleUnitClick(u)} />
          ))}
        </div>
      </div>

      {/* Entscheidung — direkt unter den Helden */}
      <div className="shrink-0 space-y-1.5">
        {snapshot.status === "finished" ? (
          <div className="flex items-center justify-between gap-2 glass rounded-xl p-2.5">
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
          // Feste Höhe (unabhängig von 1-3 verfügbaren Aktionen bzw. Ziel-Auswahl-
          // Ansicht) — sonst verschieben sich die Helden darüber je nach Rage-Stand
          // von Zug zu Zug, weil dieses Panel mal höher, mal niedriger wäre.
          <div className="glass rounded-xl p-2.5 h-[212px] overflow-y-auto flex flex-col">
            {selectedAction ? (
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
