"use client";

// ============================================
// Auswürfel-Animation — ein Wert pro Zeile, "rollt" kurz und landet
// ============================================
// Rein clientseitig: der Server hat das Ergebnis längst berechnet (ein
// API-Call, siehe character-creation.ts), hier wird nur die Aufdeckung
// gestreckt — flackert kurz durch zufällige Kandidaten, wird langsamer
// (Slot-Machine-Deceleration), landet exakt auf dem echten Wert.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Dices } from "@/components/icons";

// Verzögerung pro Tick in ms, aufsteigend = wird langsamer ("Auslaufen").
const TICKS_MS = [55, 65, 80, 95, 115, 140, 170, 205, 245, 290];

export function RollingReveal({
  finalValue,
  candidates,
  label,
  onSettled,
}: {
  finalValue: string | number;
  candidates: (string | number)[];
  label: string;
  onSettled: () => void;
}) {
  const pool = candidates.length ? candidates : [finalValue];
  const [display, setDisplay] = useState<string | number>(pool[0]);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tick = 0;

    function next() {
      if (cancelled) return;
      if (tick >= TICKS_MS.length) {
        setDisplay(finalValue);
        setSettled(true);
        onSettled();
        return;
      }
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
      const delay = TICKS_MS[tick];
      tick += 1;
      setTimeout(next, delay);
    }
    next();
    return () => {
      cancelled = true;
    };
    // Läuft absichtlich nur einmal pro Mount (Parent vergibt pro Schritt ein neues `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl bg-black/25 px-4 py-3"
    >
      <motion.div
        animate={settled ? { rotate: 0, scale: [1, 1.3, 1] } : { rotate: 360 }}
        transition={
          settled ? { duration: 0.35 } : { duration: 0.45, repeat: Infinity, ease: "linear" }
        }
        className={settled ? "text-emerald-400 shrink-0" : "text-violet-400 shrink-0"}
      >
        <Dices className="w-5 h-5" />
      </motion.div>
      <div className="flex-1 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
        <span
          className={`text-sm font-bold tabular-nums transition-colors ${
            settled ? "text-white" : "text-gray-400"
          }`}
        >
          {display}
        </span>
      </div>
    </motion.div>
  );
}

/** Bereits fertig aufgedeckter Wert — gleiche Optik wie RollingReveal im Endzustand, ohne Animation. */
export function SettledRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-black/25 px-4 py-3">
      <div className="text-emerald-400 shrink-0">
        <Dices className="w-5 h-5" />
      </div>
      <div className="flex-1 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
        <span className="text-sm font-bold tabular-nums text-white">{value}</span>
      </div>
    </div>
  );
}
