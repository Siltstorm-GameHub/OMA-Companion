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
import {
  Shield,
  Swords,
  HeartPulse,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Zap,
  ChevronsRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BattleLogEntry, RosterEntry, UnitClass } from "@/lib/battle-engine/types";
import { playHitSfxFor, playHealSfx, playUltimateSfx, playShieldSfx, playBuffSfx, playDebuffSfx } from "@/lib/battle-cards/sfx";

const SOUND_PREF_KEY = "battleCardsSoundOn";

const CLASS_CONFIG: Record<UnitClass, { color: string; icon: LucideIcon }> = {
  TANK: { color: "#14b8a6", icon: Shield },
  DAMAGE_DEALER: { color: "#ef4444", icon: Swords },
  SUPPORT: { color: "#8b5cf6", icon: HeartPulse },
};

// ---------- Skill-Effekt-Overlay ----------
// Statt jede der 36 Pool-Skills einzeln als Animation zu hinterlegen (driftet
// sofort auseinander, sobald der Skill-Pool sich ändert), wird der Effekt-Typ
// direkt aus dem tatsächlich abgespielten BattleLogEntry abgeleitet. Da sich
// die Skills im Pool bereits in Effekt-Art + Ziel (einzeln/Fläche, Schaden/
// Heilung/Schild/Buff/Debuff/Rage) unterscheiden, ergibt sich pro Skill ganz
// von selbst ein eigenes, zutreffendes visuelles Bild.
//
// Archetyp-Erweiterung: zusätzlich zur Effekt-Art fließt die Klasse des
// AUSFÜHRENDEN Helden (casterClass, über sourceId/actorId aus dem Log
// aufgelöst) in die Darstellung ein — ein Tank-Treffer wummst anders als ein
// DPS-Schnitt, ein Support-Heal glimmt anders als ein Tank-Rally-Schrei.
// Gleiche Matrix auf der Audio-Seite, siehe playHitSfxFor/playUltimateSfx in
// lib/battle-cards/sfx.ts.
type VfxKind = "cast" | "damage" | "critDamage" | "heal" | "shield" | "buff" | "debuff" | "rage";

interface VfxEvent {
  kind: VfxKind;
  targetId: string;
  casterClass?: UnitClass;
  /** Wechselt bei jedem neuen Log-Eintrag, erzwingt einen Animations-Replay. */
  key: number;
}

function vfxForEntry(e: BattleLogEntry | undefined, step: number, classOf: (id: string) => UnitClass | undefined): VfxEvent | null {
  if (!e) return null;
  switch (e.type) {
    case "action":
      return e.actionType === "active"
        ? { kind: "cast", targetId: e.actorId, casterClass: classOf(e.actorId), key: step }
        : null;
    case "damage":
      return { kind: e.isCrit ? "critDamage" : "damage", targetId: e.targetId, casterClass: classOf(e.sourceId), key: step };
    case "heal":
      return { kind: "heal", targetId: e.targetId, casterClass: classOf(e.sourceId), key: step };
    case "shieldApplied":
      return { kind: "shield", targetId: e.targetId, casterClass: classOf(e.sourceId), key: step };
    case "statModifierApplied":
      return {
        kind: e.amount >= 0 ? "buff" : "debuff",
        targetId: e.targetId,
        casterClass: classOf(e.sourceId),
        key: step,
      };
    case "rageChange":
      return e.reason === "skillEffect" ? { kind: "rage", targetId: e.unitId, key: step } : null;
    default:
      return null;
  }
}

function SkillEffectOverlay({ vfx }: { vfx: VfxEvent }) {
  const casterColor = vfx.casterClass ? CLASS_CONFIG[vfx.casterClass].color : "#60a5fa";

  switch (vfx.kind) {
    case "cast":
      return (
        <motion.div
          key={vfx.key}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 0 2px ${casterColor}e6` }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 1, 0], scale: 1.25 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      );
    case "damage":
    case "critDamage": {
      const crit = vfx.kind === "critDamage";

      // ── TANK: dumpfer Wuchtschlag — Boden-Schockwellenring statt Klingen-Motiv,
      //    Ziel wird kurz "zusammengedrückt" statt seitlich zu wackeln. ──
      if (vfx.casterClass === "TANK") {
        return (
          <motion.div key={vfx.key} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 0 2px ${casterColor}` }}
              initial={{ opacity: 0.9, scale: 0.3 }}
              animate={{ opacity: 0, scale: crit ? 1.6 : 1.3 }}
              transition={{ duration: crit ? 0.5 : 0.4, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: `${casterColor}33` }}
              initial={{ opacity: 0, scaleY: 1 }}
              animate={{ opacity: [0, 1, 0], scaleY: [1, 0.82, 1] }}
              transition={{ duration: crit ? 0.4 : 0.3, ease: "easeOut" }}
            />
            {crit && <Sparkles className="w-6 h-6 relative" style={{ color: casterColor }} />}
          </motion.div>
        );
      }

      // ── DAMAGE_DEALER: scharfer, diagonaler Klingen-/Schuss-Schnitt + Funken. ──
      if (vfx.casterClass === "DAMAGE_DEALER") {
        return (
          <motion.div key={vfx.key} className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <motion.div
              className="absolute h-[3px] rounded-full"
              style={{ width: "140%", background: `linear-gradient(90deg, transparent, ${casterColor}, #fff, ${casterColor}, transparent)` }}
              initial={{ opacity: 0, rotate: -35, scaleX: 0.2 }}
              animate={{ opacity: [0, 1, 0], rotate: -35, scaleX: 1 }}
              transition={{ duration: crit ? 0.35 : 0.28, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: `${casterColor}22` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.3 }}
            />
            {crit && <Sparkles className="w-6 h-6 relative" style={{ color: "#facc15" }} />}
          </motion.div>
        );
      }

      // ── SUPPORT: arkaner Bolzen — einschlagender Lichtsplitter statt Wucht
      //    oder Klinge: ein einwärts kollabierender Ring (Gegenrichtung zum
      //    Tank-Schockwellenring) mit sich drehendem Funken-Glyph im Zentrum. ──
      if (vfx.casterClass === "SUPPORT") {
        return (
          <motion.div key={vfx.key} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 0 2px ${casterColor}`, background: `${casterColor}22` }}
              initial={{ opacity: 0, scale: crit ? 1.7 : 1.4 }}
              animate={{ opacity: [0, 1, 0], scale: 0.35 }}
              transition={{ duration: crit ? 0.42 : 0.34, ease: "easeIn" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
              animate={{ opacity: [0, 1, 0], scale: 1, rotate: crit ? 300 : 200 }}
              transition={{ duration: crit ? 0.42 : 0.34, ease: "easeOut" }}
            >
              <Sparkles className="w-5 h-5 relative" style={{ color: casterColor }} />
            </motion.div>
            {crit && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 1px ${casterColor}aa` }}
                initial={{ opacity: 0.8, scale: 0.5 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
              />
            )}
          </motion.div>
        );
      }

      // ── Fallback (unbekannte Klasse): generischer Treffer-Puls. ──
      return (
        <motion.div
          key={vfx.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], x: [0, crit ? -5 : -3, 5, -3, 0] }}
          transition={{ duration: crit ? 0.5 : 0.4, ease: "easeOut" }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: crit ? "rgba(250,204,21,0.35)" : "rgba(239,68,68,0.3)" }}
          />
          {crit && <Sparkles className="w-6 h-6 relative" style={{ color: "#facc15" }} />}
        </motion.div>
      );
    }
    case "heal":
      return (
        <motion.div key={vfx.key} className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "rgba(52,211,153,0.3)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "0 0 0 2px rgba(110,231,183,0.7)" }}
            initial={{ opacity: 0, scale: 1.3, rotate: 0 }}
            animate={{ opacity: [0, 0.8, 0], scale: 0.9, rotate: 90 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
          <motion.span
            className="absolute text-emerald-300 font-bold text-lg"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, 0], y: -14 }}
            transition={{ duration: 0.5 }}
          >
            +
          </motion.span>
        </motion.div>
      );
    case "shield":
      // TANK-Schild als eckiges Bollwerk (clip-path), Support/generisch als weiche Blase.
      return vfx.casterClass === "TANK" ? (
        <motion.div
          key={vfx.key}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `${casterColor}2a`,
            boxShadow: `0 0 0 2px ${casterColor}`,
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
          initial={{ opacity: 0, scale: 0.75, rotate: -8 }}
          animate={{ opacity: [0, 1, 0.5], scale: 1.1, rotate: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      ) : (
        <motion.div
          key={vfx.key}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 0 2px ${casterColor}e6`, background: `${casterColor}26` }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0.4], scale: 1.15 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      );
    case "buff":
      return (
        <motion.div
          key={vfx.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${casterColor}66, 0 0 0 4px rgba(74,222,128,0.7)` }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 1, 0], scale: 1.2 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: [0, 1, 0], y: -10 }} transition={{ duration: 0.5 }}>
            <ArrowUp className="w-4 h-4" style={{ color: "#4ade80" }} />
          </motion.div>
        </motion.div>
      );
    case "debuff":
      return (
        <motion.div
          key={vfx.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${casterColor}66, 0 0 0 4px rgba(244,63,94,0.7)` }}
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: [0, 1, 0], scale: 0.85 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: [0, 1, 0], y: 10 }} transition={{ duration: 0.5 }}>
            <ArrowDown className="w-4 h-4" style={{ color: "#fb7185" }} />
          </motion.div>
        </motion.div>
      );
    case "rage":
      return (
        <motion.div key={vfx.key} className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.7 }}
            animate={{ opacity: [0, 1, 0], y: -12, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Zap className="w-5 h-5" style={{ color: "#60a5fa" }} />
          </motion.div>
        </motion.div>
      );
    default:
      return null;
  }
}

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
  vfx,
}: {
  roster: RosterEntry;
  runtime: UnitRuntime;
  isActive: boolean;
  isTarget: boolean;
  vfx: VfxEvent | null;
}) {
  const config = CLASS_CONFIG[roster.class];
  const Icon = config.icon;
  const hpPct = Math.max(0, runtime.currentHp / runtime.maxHp);

  const attacking = vfx?.kind === "cast";
  const hit = vfx?.kind === "damage" || vfx?.kind === "critDamage";

  return (
    <div
      className={`w-24 sm:w-28 shrink-0 relative transition-all ${attacking ? "attack-lunge" : ""} ${hit ? "hit-shake" : ""}`}
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
        <AnimatePresence>{vfx && <SkillEffectOverlay vfx={vfx} />}</AnimatePresence>
        {roster.avatarBadgeUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={roster.avatarBadgeUrl}
            alt=""
            title="Echtes Profilbild"
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full object-cover"
            style={{ border: "1.5px solid rgba(255,255,255,0.85)", boxShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
          />
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
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_PREF_KEY);
      if (stored !== null) setSoundOn(stored === "1");
    } catch {
      // localStorage kann in seltenen Fällen (privater Modus etc.) werfen — Standard beibehalten
    }
  }, []);

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");
      } catch {
        // s.o.
      }
      return next;
    });
  }

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
  const classOf = (id: string) => rosterById.get(id)?.class;
  const currentVfx = useMemo(() => vfxForEntry(lastEntry, step, classOf), [lastEntry, step, rosterById]);
  const cutsceneActor =
    lastEntry?.type === "action" && lastEntry.actionType === "ultimate" ? rosterById.get(lastEntry.actorId) : null;

  // currentVfx wird bei jedem step neu erzeugt (kein gecachtes Objekt), das
  // reicht als Trigger, ein Ultimate-Cast dagegen setzt kein currentVfx —
  // dafür wird direkt auf den Log-Eintrag selbst reagiert (step als Schlüssel,
  // damit ein zweiter Ultimate-Einsatz derselben Karte erneut auslöst).
  useEffect(() => {
    if (!soundOn || !currentVfx) return;
    switch (currentVfx.kind) {
      case "damage":
        playHitSfxFor(currentVfx.casterClass, false);
        break;
      case "critDamage":
        playHitSfxFor(currentVfx.casterClass, true);
        break;
      case "heal":
        playHealSfx();
        break;
      case "shield":
        playShieldSfx();
        break;
      case "buff":
        playBuffSfx();
        break;
      case "debuff":
        playDebuffSfx();
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVfx, soundOn]);

  useEffect(() => {
    if (!soundOn) return;
    if (lastEntry?.type === "action" && lastEntry.actionType === "ultimate") {
      playUltimateSfx(rosterById.get(lastEntry.actorId)?.class);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, soundOn]);

  const isFinished = step >= log.length;

  return (
    <div
      className="surface-elevated rounded-xl p-3 space-y-3 relative overflow-hidden"
      style={{
        backgroundColor: "#12151a",
        backgroundImage: [
          "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(239,68,68,0.18), transparent 70%)",
          "radial-gradient(ellipse 70% 45% at 50% 92%, rgba(20,184,166,0.18), transparent 70%)",
          "linear-gradient(180deg, rgba(13,15,19,0.55) 0%, rgba(13,15,19,0.25) 35%, rgba(13,15,19,0.25) 65%, rgba(13,15,19,0.55) 100%)",
          "url(/battle-cards/arena-bg.jpg)",
        ].join(", "),
        backgroundSize: "auto, auto, auto, cover",
        backgroundPosition: "center",
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
              vfx={currentVfx?.targetId === r.instanceId ? currentVfx : null}
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
              vfx={currentVfx?.targetId === r.instanceId ? currentVfx : null}
            />
          );
        })}
      </div>

      {/* Event-Log */}
      <div className="surface rounded-md px-3 py-2 min-h-[80px] flex flex-col justify-end gap-0.5">
        {recentLines.length === 0 ? (
          <p className="text-[11px] text-gray-500 italic">Der Kampf beginnt…</p>
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
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Erneut ansehen
          </motion.button>
        ) : (
          <>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? "Pause" : "Weiter"}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setPlaying(false);
                setStep(log.length);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
              title="Zum Ergebnis springen"
            >
              <ChevronsRight className="w-3.5 h-3.5" /> Überspringen
            </motion.button>
          </>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={toggleSound}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-white/[0.06] text-gray-400 hover:text-gray-200 hover:bg-white/[0.1] transition-colors"
          title={soundOn ? "Ton aus" : "Ton an"}
          aria-label={soundOn ? "Ton aus" : "Ton an"}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </motion.button>
      </div>

      {/* Ultimate-Cutscene */}
      <AnimatePresence>
        {cutsceneActor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-10 overflow-hidden"
            style={{ background: "rgba(5,5,8,0.92)" }}
          >
            {/* SUPPORT: statt der harten Abdunklung ein atmender, radialer
                Licht-Puls + aufsteigende Lichtpartikel — soll ruhig/heilend
                wirken statt "Impact", passend zum Klassen-Motiv (Heilung/
                Segen) statt Wucht (Tank) oder Schärfe (DPS). */}
            {cutsceneActor.class === "SUPPORT" && (
              <>
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 55%, ${CLASS_CONFIG.SUPPORT.color}33, transparent 65%)` }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                {Array.from({ length: 7 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 4,
                      height: 4,
                      left: `${18 + i * 10}%`,
                      bottom: "38%",
                      background: CLASS_CONFIG.SUPPORT.color,
                      boxShadow: `0 0 6px 1px ${CLASS_CONFIG.SUPPORT.color}`,
                    }}
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: -140, opacity: [0, 1, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.28, ease: "easeOut" }}
                  />
                ))}
              </>
            )}

            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: `${CLASS_CONFIG[cutsceneActor.class].color}22`,
                boxShadow: `0 0 48px ${CLASS_CONFIG[cutsceneActor.class].color}80`,
              }}
            >
              {cutsceneActor.class === "SUPPORT" && (
                <motion.span
                  className="absolute -inset-2 rounded-full pointer-events-none"
                  style={{ border: `1.5px dashed ${CLASS_CONFIG.SUPPORT.color}aa` }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                />
              )}
              {(() => {
                const Icon = CLASS_CONFIG[cutsceneActor.class].icon;
                return <Icon className="w-10 h-10 relative" style={{ color: CLASS_CONFIG[cutsceneActor.class].color }} />;
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
