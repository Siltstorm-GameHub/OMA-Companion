"use client";
// ============================================
// OMA Gems — UI-Bausteine im Neon-Stil
// ============================================
// Hochzählende Punkte, Züge-Ring, Ziel-Abzeichen mit Fortschrittsring, Sterne, die einzeln aufleuchten,
// die einfliegende Level-Karte, der Ergebnis-Bildschirm, das Logo, „So geht's“ und der Spielhintergrund.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { COLOR_NAMES, type Goal, type LevelDef } from "@/lib/gems/engine";
import { playSfx } from "@/lib/game-sfx";
import GemIcon from "./GemIcon";
import { Check, ChevronLeft, ChevronRight, Star, Trophy } from "@/components/icons";

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Zahl, die weich zum neuen Wert hochzählt. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: Math.min(0.9, 0.25 + Math.abs(value - from.current) / 20000),
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value]);
  return <span className={className}>{fmt(shown)}</span>;
}

/** Kreis-Anzeige der übrigen Züge — wird rot und pulsiert, wenn es knapp wird. */
export function MovesRing({ left, total }: { left: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, left / Math.max(1, total)));
  const danger = left <= 5;
  const color = danger ? "#fb7185" : "#2dd4bf";
  return (
    <div className={`relative w-[64px] h-[64px] shrink-0 ${danger && left > 0 ? "gems-danger" : ""}`}>
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="rgba(7,8,22,0.85)" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ * (1 - frac) }}
          transition={{ duration: 0.4 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`font-display text-xl font-black tabular-nums ${danger ? "text-rose-300" : "text-white"}`}>{left}</span>
        <span className="text-[8px] uppercase tracking-widest text-gray-400 mt-0.5">Züge</span>
      </div>
    </div>
  );
}

export function GoalIcon({ goal, uid }: { goal: Goal; uid: string }) {
  if (goal.type === "collect") return <GemIcon piece={{ kind: "gem", color: goal.color, special: "none" }} uid={uid} />;
  if (goal.type === "stones") return <GemIcon piece={{ kind: "stone", color: -1, special: "none" }} uid={uid} />;
  if (goal.type === "ice") return <GemIcon piece={{ kind: "gem", color: 3, special: "none", lock: "ice" }} uid={uid} />;
  return <Trophy className="w-full h-full text-amber-300" />;
}

/** Ziel als Abzeichen: Symbol in einem Fortschrittsring, Häkchen-Effekt, sobald erfüllt. */
export function GoalBadge({ goal, value, target, uid }: { goal: Goal; value: number; target: number; uid: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, value / Math.max(1, target));
  const done = frac >= 1;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative w-[52px] h-[52px] shrink-0">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={r} fill="rgba(7,8,22,0.85)" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={done ? "#4ade80" : "#a78bfa"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: circ * (1 - frac) }}
            transition={{ duration: 0.4 }}
            style={{ filter: `drop-shadow(0 0 4px ${done ? "#4ade80" : "#a78bfa"})` }}
          />
        </svg>
        <div className="absolute inset-[13px]">
          <GoalIcon goal={goal} uid={uid} />
        </div>
        <AnimatePresence>
          {done && (
            <motion.div
              className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-emerald-400 text-gray-900 flex items-center justify-center shadow-[0_0_12px_rgba(74,222,128,0.9)]"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: [0, 1.4, 1], rotate: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Check className="w-3 h-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-0 leading-tight">
        <p className={`font-display text-base font-black tabular-nums ${done ? "text-emerald-300" : "text-white"}`}>
          {goal.type === "score" ? `${fmt(value)}` : `${value}/${target}`}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{goal.type === "score" ? `von ${fmt(target)}` : goalShort(goal)}</p>
      </div>
    </div>
  );
}

function goalShort(g: Goal): string {
  if (g.type === "collect") return COLOR_NAMES[g.color];
  if (g.type === "stones") return "Felsen";
  if (g.type === "ice") return "Eis";
  return "";
}

/** Sterne, die nacheinander mit Klang aufleuchten. */
export function StarsReveal({ count, size = "w-9 h-9", sound = true }: { count: number; size?: string; sound?: boolean }) {
  useEffect(() => {
    if (!sound) return;
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => playSfx("ping", 0.5 + i * 0.15), 350 + i * 320));
    return () => timers.forEach(clearTimeout);
  }, [count, sound]);
  return (
    <div className="flex justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -60, opacity: 0 }}
          animate={{ scale: i < count ? [0, 1.45, 1] : 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.32, duration: 0.45 }}
          style={i < count ? { filter: "drop-shadow(0 0 10px rgba(253,224,71,0.95))" } : undefined}
        >
          <Star className={`${size} ${i < count ? "text-amber-300" : "text-white/15"}`} />
        </motion.span>
      ))}
    </div>
  );
}

/** Bild zur Neuheit eines Levels. */
function NoveltyArt({ def }: { def: LevelDef }) {
  const box = (children: ReactNode) => <div className="flex justify-center gap-2">{children}</div>;
  const cell = (k: string, node: ReactNode) => (
    <div key={k} className="w-11 h-11">
      {node}
    </div>
  );
  switch (def.novelty) {
    case "color":
      return box(Array.from({ length: def.colors }, (_, c) => cell(`c${c}`, <GemIcon piece={{ kind: "gem", color: c, special: "none" }} uid={`nov-c${c}`} />)).slice(-4));
    case "stones":
      return box(cell("s", <GemIcon piece={{ kind: "stone", color: -1, special: "none" }} uid="nov-s" />));
    case "ice":
      return box(cell("i", <GemIcon piece={{ kind: "gem", color: 3, special: "none", lock: "ice" }} uid="nov-i" />));
    case "chains":
      return box(cell("k", <GemIcon piece={{ kind: "gem", color: 0, special: "none", lock: "chain" }} uid="nov-k" />));
    default:
      return null;
  }
}

export interface LevelCardData {
  title: string;
  lines: string[];
  novelty: string | null;
  def: LevelDef | null;
  stars: number | null;
}

/** Einfliegende Level-Karte (Level geschafft / nächstes Level / Tages-Start). */
export function LevelCard({ data, onClose }: { data: LevelCardData; onClose: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClose}
      className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-[22px] bg-[#05060f]/70 backdrop-blur-[3px] text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-[300px] rounded-2xl p-5 space-y-2.5 gems-card"
        initial={{ y: -260, rotate: -6, scale: 0.8 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {data.stars !== null && <StarsReveal count={data.stars} />}
        <p className="font-display text-3xl font-black gems-neon-text">{data.title}</p>
        {data.lines.map((l, i) => (
          <p key={i} className="text-sm text-gray-200">
            {l}
          </p>
        ))}
        {data.def && data.def.goals.some((g) => g.type !== "none" && g.type !== "score") && (
          <div className="flex justify-center gap-2 pt-1">
            {data.def.goals
              .filter((g) => g.type !== "none" && g.type !== "score")
              .map((g, k) => (
                <div key={k} className="w-10 h-10">
                  <GoalIcon goal={g} uid={`card-goal-${k}`} />
                </div>
              ))}
          </div>
        )}
        {data.novelty && data.def && (
          <div className="rounded-xl p-3 space-y-2 bg-amber-300/[0.07] border border-amber-300/25">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Neu</p>
            <NoveltyArt def={data.def} />
            <p className="text-xs text-amber-100">{data.novelty}</p>
          </div>
        )}
        <p className="text-[10px] text-gray-500 pt-1">Tippen zum Weiterspielen</p>
      </motion.div>
    </motion.button>
  );
}

/** Großer Lob-Schriftzug für Kombos und lange Kaskaden. */
export function Praise({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          className="absolute inset-x-0 top-[38%] z-10 flex justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
          animate={{ opacity: 1, scale: [0.4, 1.2, 1], rotate: 0 }}
          exit={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.4 }}
        >
          <span
            className="font-display font-black text-4xl sm:text-5xl tracking-tight"
            style={{
              background: "linear-gradient(90deg,#5eead4,#a78bfa,#f472b6,#fde047)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 14px rgba(244,114,182,0.7)) drop-shadow(0 3px 0 rgba(0,0,0,0.6))",
            }}
          >
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Kurzer Lichtblitz übers Brett. */
export function Flash({ n }: { n: number }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.div
          key={n}
          className="absolute inset-0 z-10 rounded-[22px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.55), rgba(244,114,182,0.2) 60%, transparent)" }}
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      )}
    </AnimatePresence>
  );
}

/** Logo „OMA Gems“ mit funkelnden Steinen. */
export function GemsLogo({ small = false }: { small?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className={`flex items-center justify-center ${small ? "gap-2" : "gap-3"}`}>
      {[3, 4].map((c, i) => (
        <motion.div
          key={c}
          className={small ? "w-7 h-7" : "w-12 h-12"}
          animate={reduced ? undefined : { y: [0, -5, 0], rotate: [0, i === 0 ? -8 : 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 10px rgba(129,140,248,0.8))", order: i === 0 ? 0 : 2 }}
        >
          <GemIcon piece={{ kind: "gem", color: c, special: "none" }} uid={`logo-${c}`} />
        </motion.div>
      ))}
      <div className="text-center leading-none" style={{ order: 1 }}>
        <p className={`font-display font-black tracking-tight gems-neon-text ${small ? "text-xl" : "text-5xl"}`}>OMA</p>
        <p
          className={`font-display font-black tracking-[0.35em] ${small ? "text-[10px] mt-0.5" : "text-lg mt-1"}`}
          style={{ background: "linear-gradient(90deg,#5eead4,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
        >
          GEMS
        </p>
      </div>
    </div>
  );
}

/** Spielhintergrund: dunkles Violett/Petrol mit Leuchtgitter und weichen Lichtflecken. */
export function NeonBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 15% 10%, rgba(124,58,237,0.35), transparent 70%), radial-gradient(55% 45% at 90% 85%, rgba(13,148,136,0.32), transparent 70%), radial-gradient(40% 30% at 80% 15%, rgba(236,72,153,0.18), transparent 70%), #05060f",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(129,140,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.12) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
        }}
      />
    </div>
  );
}

// ── So geht's ──

function Slide({ title, art, text }: { title: string; art: ReactNode; text: string }) {
  return (
    <div className="space-y-3 text-center">
      <div className="h-20 flex items-center justify-center gap-2">{art}</div>
      <p className="font-display text-lg font-black text-white">{title}</p>
      <p className="text-sm text-gray-300 min-h-[3.75rem]">{text}</p>
    </div>
  );
}

const g = (color: number, extra: Record<string, unknown> = {}, uid = "") => (
  <div className="w-11 h-11" key={uid || `${color}-${JSON.stringify(extra)}`}>
    <GemIcon piece={{ kind: "gem", color, special: "none", ...extra }} uid={`howto-${uid || color}-${JSON.stringify(extra).replace(/\W/g, "")}`} />
  </div>
);

/** Kurze, durchtippbare Anleitung. */
export function HowToPlay({ mode }: { mode: "classic" | "daily" }) {
  const slides = [
    { title: "Tauschen", art: <>{g(3, {}, "a")}{g(3, {}, "b")}<span className="text-2xl text-teal-300">⇄</span>{g(3, {}, "c")}</>, text: "Tausche zwei benachbarte Steine, sodass mindestens 3 gleiche in einer Reihe liegen." },
    {
      title: "Sondersteine",
      art: <>{g(0, { special: "row" }, "r")}{g(5, { special: "bomb" }, "bo")}{g(-1, { special: "prism" }, "p")}</>,
      text: "4 in einer Reihe: Linien-Stein. L- oder T-Form: Bombe. 5 in einer Reihe: Prisma, das eine ganze Farbe räumt.",
    },
    {
      title: "Kombos",
      art: <>{g(0, { special: "row" }, "k1")}<span className="text-2xl text-pink-300">+</span>{g(2, { special: "col" }, "k2")}<span className="text-2xl text-amber-300">=</span><span className="text-3xl">💥</span></>,
      text: "Tausche zwei Sondersteine miteinander: Kreuz, Mega-Bombe oder Prisma-Kombo — die größten Punkte im Spiel.",
    },
    {
      title: "Hindernisse",
      art: (
        <>
          <div className="w-11 h-11"><GemIcon piece={{ kind: "stone", color: -1, special: "none" }} uid="howto-stone" /></div>
          {g(3, { lock: "ice" }, "ice")}
          {g(0, { lock: "chain" }, "chain")}
        </>
      ),
      text: "Felsen zerstören nur Explosionen. Eis bricht, wenn der Stein in eine Reihe kommt. Ketten: nicht tauschbar, aber kombinierbar.",
    },
    mode === "classic"
      ? {
          title: "Ziele, Sterne, Joker",
          art: <><Star className="w-9 h-9 text-amber-300" /><Star className="w-9 h-9 text-amber-300" /><Star className="w-9 h-9 text-white/20" /></>,
          text: "Schaff das Ziel jedes Levels, bevor die Züge ausgehen. Übrige Züge bringen Bonus und Sterne. Einmal pro Runde rettet dich ein Joker.",
        }
      : {
          title: "Tages-Herausforderung",
          art: <span className="text-4xl">📅</span>,
          text: "Alle spielen heute dasselbe Brett mit demselben Nachschub: 30 Züge, so viele Punkte wie möglich. Dein bester Versuch zählt.",
        },
  ];
  const [i, setI] = useState(0);
  return (
    <div className="rounded-2xl p-4 gems-card space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300 text-center">So geht&apos;s</p>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          <Slide {...slides[i]} />
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} className="p-2 rounded-lg text-gray-300 hover:text-white disabled:opacity-25" aria-label="Zurück">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Schritt ${k + 1}`}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.9)]" : "w-1.5 bg-white/25"}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => setI((v) => Math.min(slides.length - 1, v + 1))} disabled={i === slides.length - 1} className="p-2 rounded-lg text-gray-300 hover:text-white disabled:opacity-25" aria-label="Weiter">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
