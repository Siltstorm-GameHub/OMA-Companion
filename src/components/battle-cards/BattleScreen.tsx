"use client";

// ============================================
// Kampf-Screen — spielt einen battleLog ab
// ============================================
// Layout nach PROJECT_CONTEXT.md: Gegner oben, eigenes Team unten, je Karte
// Mini-Portrait + HP-Balken (grün/gelb/rot) + Rage-Balken. Aktuell handelnde
// Einheit + Ziel bekommen farbige Rahmen. Kompakter Event-Log unten.
// Ultimate-Cutscene: abgedunkeltes Overlay, Skill-Name groß + Beschreibung.
//
// Reine Wiedergabe-Komponente — bekommt einen fertigen battleLog (siehe
// BattleResult in lib/battle-engine) und spielt ihn zeitgesteuert ab. Führt
// selbst keine Kampflogik aus (die läuft ausschließlich serverseitig).

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shield, Swords, HeartPulse, Play, Pause, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BattleLogEntry, RosterEntry, UnitClass } from "@/lib/battle-engine/types";

const CLASS_CONFIG: Record<UnitClass, { color: string; icon: LucideIcon }> = {
  TANK: { color: "#14b8a6", icon: Shield },
  DAMAGE_DEALER: { color: "#ef4444", icon: Swords },
  SUPPORT: { color: "#8b5cf6", icon: HeartPulse },
};

interface UnitRuntime {
  currentHp: number;
  maxHp: number;
  rage: number;
  alive: boolean;
}

interface DerivedState {
  units: Map<string, UnitRuntime>;
  activeUnitId: string | null;
  targetIds: Set<string>;
}

function deriveState(log: BattleLogEntry[], upto: number, roster: RosterEntry[]): DerivedState {
  const units = new Map<string, UnitRuntime>();
  for (const r of roster) units.set(r.instanceId, { currentHp: r.maxHp, maxHp: r.maxHp, rage: 0, alive: true });

  let activeUnitId: string | null = null;
  let targetIds = new Set<string>();

  for (let i = 0; i < upto; i++) {
    const e = log[i];
    switch (e.type) {
      case "turnStart":
        activeUnitId = e.unitId;
        targetIds = new Set();
        break;
      case "damage": {
        const u = units.get(e.targetId);
        if (u) u.currentHp = e.remainingHp;
        targetIds.add(e.targetId);
        break;
      }
      case "heal": {
        const u = units.get(e.targetId);
        if (u) u.currentHp = e.newHp;
        targetIds.add(e.targetId);
        break;
      }
      case "rageChange": {
        const u = units.get(e.unitId);
        if (u) u.rage = e.newRage;
        break;
      }
      case "death": {
        const u = units.get(e.unitId);
        if (u) u.alive = false;
        break;
      }
      case "roundEnd":
        activeUnitId = null;
        targetIds = new Set();
        break;
      default:
        break;
    }
  }

  return { units, activeUnitId, targetIds };
}

function delayForEntry(e: BattleLogEntry | undefined): number {
  if (!e) return 0;
  switch (e.type) {
    case "action":
      return e.actionType === "ultimate" ? 1300 : 450;
    case "damage":
      return 500;
    case "heal":
      return 450;
    case "death":
      return 700;
    case "battleEnd":
      return 0;
    case "roundStart":
    case "roundEnd":
    case "turnStart":
      return 120;
    default:
      return 220;
  }
}

function describeEntry(e: BattleLogEntry, nameOf: (id: string) => string): string | null {
  switch (e.type) {
    case "action":
      return `${nameOf(e.actorId)} setzt ${e.skillName} ein.`;
    case "damage":
      return `${nameOf(e.targetId)} erleidet ${e.amount} Schaden${e.isCrit ? " (kritisch!)" : ""}.`;
    case "heal":
      return `${nameOf(e.targetId)} wird um ${e.amount} HP geheilt.`;
    case "shieldApplied":
      return `${nameOf(e.targetId)} erhält einen Schild (${e.amount}).`;
    case "death":
      return `${nameOf(e.unitId)} wurde besiegt.`;
    case "suddenDeathStart":
      return "Sudden Death! Der Schaden steigt ab jetzt jede Runde.";
    case "battleEnd":
      return e.winner === "DRAW" ? "Unentschieden!" : e.winner === "A" ? "Dein Team gewinnt!" : "Der Gegner gewinnt!";
    default:
      return null;
  }
}

function hpBarColor(pct: number): string {
  if (pct > 0.5) return "#10b981";
  if (pct > 0.2) return "#f59e0b";
  return "#ef4444";
}

function UnitTile({
  roster,
  runtime,
  isActive,
  isTarget,
}: {
  roster: RosterEntry;
  runtime: UnitRuntime;
  isActive: boolean;
  isTarget: boolean;
}) {
  const config = CLASS_CONFIG[roster.class];
  const Icon = config.icon;
  const hpPct = Math.max(0, runtime.currentHp / runtime.maxHp);

  return (
    <div
      className="w-24 sm:w-28 shrink-0 relative transition-all"
      style={{
        opacity: runtime.alive ? 1 : 0.35,
        filter: runtime.alive ? "none" : "grayscale(1)",
      }}
    >
      {isActive && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-500 text-black whitespace-nowrap">
          Am Zug
        </span>
      )}
      {isTarget && !isActive && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-rose-500 text-white whitespace-nowrap">
          Ziel
        </span>
      )}

      <div className="w-full aspect-square mb-1 flex items-end justify-center relative">
        {(isActive || isTarget) && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: isActive
                ? "radial-gradient(closest-side, rgba(20,184,166,0.35), transparent 70%)"
                : "radial-gradient(closest-side, rgba(239,68,68,0.3), transparent 70%)",
            }}
          />
        )}
        {roster.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={roster.imageUrl}
            alt={roster.name}
            className="max-w-full max-h-full object-contain relative"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.65))" }}
          />
        ) : (
          <div
            className="w-full h-full rounded-md flex items-center justify-center relative"
            style={{ background: `${config.color}22` }}
          >
            <Icon className="w-6 h-6" style={{ color: config.color, opacity: 0.5 }} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 shrink-0" style={{ color: config.color }} />
        <p className="text-[10px] font-semibold text-white text-center truncate" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
          {roster.name}
        </p>
      </div>

      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${hpPct * 100}%`, background: hpBarColor(hpPct) }}
        />
      </div>
      <p className="text-[8px] text-gray-400 text-center tabular-nums mt-0.5" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
        {Math.max(0, runtime.currentHp)}/{runtime.maxHp}
      </p>

      <div className="mt-0.5 h-1 rounded-full bg-black/40 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${Math.min(100, runtime.rage)}%`, background: "#60a5fa" }}
        />
      </div>
    </div>
  );
}

export default function BattleScreen({ roster, log }: { roster: RosterEntry[]; log: BattleLogEntry[] }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  const rosterById = useMemo(() => new Map(roster.map((r) => [r.instanceId, r])), [roster]);
  const teamB = useMemo(() => roster.filter((r) => r.teamId === "B"), [roster]);
  const teamA = useMemo(() => roster.filter((r) => r.teamId === "A"), [roster]);
  const nameOf = (id: string) => rosterById.get(id)?.name ?? "?";

  useEffect(() => {
    if (!playing || step >= log.length) return;
    const delay = delayForEntry(log[step]);
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, log.length)), delay);
    return () => clearTimeout(t);
  }, [playing, step, log]);

  const derived = useMemo(() => deriveState(log, step, roster), [log, step, roster]);

  const recentLines = useMemo(() => {
    const lines: string[] = [];
    for (let i = step - 1; i >= 0 && lines.length < 4; i--) {
      const line = describeEntry(log[i], nameOf);
      if (line) lines.unshift(line);
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, step, roster]);

  const lastEntry = step > 0 ? log[step - 1] : undefined;
  const cutsceneActor =
    lastEntry?.type === "action" && lastEntry.actionType === "ultimate" ? rosterById.get(lastEntry.actorId) : null;

  const isFinished = step >= log.length;

  return (
    <div
      className="surface-elevated rounded-xl p-3 space-y-3 relative overflow-hidden"
      style={{
        backgroundColor: "#12151a",
        backgroundImage: [
          "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(239,68,68,0.14), transparent 70%)",
          "radial-gradient(ellipse 70% 45% at 50% 92%, rgba(20,184,166,0.14), transparent 70%)",
          "radial-gradient(ellipse 90% 60% at 50% 50%, rgba(255,255,255,0.05), transparent 65%)",
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          "linear-gradient(180deg, #171b21 0%, #0d0f13 50%, #171b21 100%)",
        ].join(", "),
        backgroundSize: "auto, auto, auto, 28px 28px, 28px 28px, auto",
      }}
    >
      {/* Gegner-Reihe */}
      <div className="flex gap-2 justify-center flex-wrap relative">
        {teamB.map((r) => {
          const rt = derived.units.get(r.instanceId);
          if (!rt) return null;
          return (
            <UnitTile
              key={r.instanceId}
              roster={r}
              runtime={rt}
              isActive={derived.activeUnitId === r.instanceId}
              isTarget={derived.targetIds.has(r.instanceId)}
            />
          );
        })}
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* Eigenes Team */}
      <div className="flex gap-2 justify-center flex-wrap">
        {teamA.map((r) => {
          const rt = derived.units.get(r.instanceId);
          if (!rt) return null;
          return (
            <UnitTile
              key={r.instanceId}
              roster={r}
              runtime={rt}
              isActive={derived.activeUnitId === r.instanceId}
              isTarget={derived.targetIds.has(r.instanceId)}
            />
          );
        })}
      </div>

      {/* Event-Log */}
      <div className="surface rounded-md px-3 py-2 min-h-[80px] flex flex-col justify-end gap-0.5">
        {recentLines.length === 0 ? (
          <p className="text-[11px] text-gray-600 italic">Der Kampf beginnt…</p>
        ) : (
          recentLines.map((line, i) => (
            <p key={i} className="text-[11px] text-gray-400 leading-snug">
              {line}
            </p>
          ))
        )}
      </div>

      {/* Steuerung */}
      <div className="flex items-center justify-center gap-2">
        {isFinished ? (
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Erneut ansehen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? "Pause" : "Weiter"}
          </button>
        )}
      </div>

      {/* Ultimate-Cutscene */}
      <AnimatePresence>
        {cutsceneActor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-10"
            style={{ background: "rgba(5,5,8,0.92)" }}
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: `${CLASS_CONFIG[cutsceneActor.class].color}22`,
                boxShadow: `0 0 48px ${CLASS_CONFIG[cutsceneActor.class].color}80`,
              }}
            >
              {(() => {
                const Icon = CLASS_CONFIG[cutsceneActor.class].icon;
                return <Icon className="w-10 h-10" style={{ color: CLASS_CONFIG[cutsceneActor.class].color }} />;
              })()}
            </motion.div>
            <p className="text-sm text-gray-400">{cutsceneActor.name}</p>
            <p className="text-xl font-black text-white text-center px-4">{cutsceneActor.ultimateSkillName}</p>
            <p className="text-xs text-gray-400 text-center px-8 max-w-xs">
              {cutsceneActor.ultimateSkillDescription}
            </p>
            <motion.p
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
              className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-2"
            >
              ● ● ●
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
