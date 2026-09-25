"use client";

// ============================================
// OMA Quest — der Würfel (d20)
// ============================================
// Der Wurf entsteht auf dem Server (fälschungssicher); der Würfel zeigt ihn: Er wackelt, solange die Auswertung läuft, purzelt
// dann und bleibt auf genau der gewürfelten Zahl liegen — erst danach erscheint das Ergebnis im Spiel.

import { useEffect, useRef, useState } from "react";
import { ABILITY_LABEL, type RollResult } from "@/lib/te-map/rpg";

type DiceState = "shake" | "tumble" | "landed";

/** Der Würfel selbst: Sechseck-Umriss mit Facetten wie ein d20, Zahl in der Mitte. */
export function D20({ value, state, tone }: { value: number | null; state: DiceState; tone?: "good" | "bad" | "neutral" }) {
  const [rolling, setRolling] = useState<number>(20);
  useEffect(() => {
    if (state === "landed") return;
    const t = setInterval(() => setRolling(1 + Math.floor(Math.random() * 20)), 70);
    return () => clearInterval(t);
  }, [state]);
  const shown = state === "landed" ? (value ?? 20) : rolling;
  const face = tone === "good" ? ["#3fbf7a", "#1e7a4a"] : tone === "bad" ? ["#e05a5a", "#8a2a2a"] : ["#8a6be0", "#4a2fa0"];
  return (
    <div className={state === "shake" ? "oq-dice-shake" : state === "tumble" ? "oq-dice-tumble" : "oq-dice-pop"} style={{ width: 132, height: 132 }}>
      <svg viewBox="0 0 100 100" width="132" height="132" role="img" aria-label={state === "landed" ? `Würfel zeigt ${shown}` : "Würfel rollt"}>
        <defs>
          <linearGradient id="d20g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={face[0]} /><stop offset="1" stopColor={face[1]} />
          </linearGradient>
        </defs>
        <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="url(#d20g)" stroke="#f5e7b0" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="50,4 91,73 9,73" fill="rgba(255,255,255,0.10)" />
        <polygon points="50,96 9,27 91,27" fill="rgba(0,0,0,0.14)" />
        <path d="M50 4 L50 30 M91 27 L70 38 M9 27 L30 38 M91 73 L70 62 M9 73 L30 62 M50 96 L50 70 M30 38 L70 38 L70 62 L30 62 Z" stroke="#f5e7b088" strokeWidth="1.6" fill="none" />
        <text x="50" y="59" textAnchor="middle" fontSize={shown >= 10 ? 27 : 32} fontWeight="900" fill="#fff" stroke="#00000066" strokeWidth="1" style={{ fontFamily: "system-ui, sans-serif" }}>{shown}</text>
      </svg>
    </div>
  );
}

const TUMBLE_MS = 1200;
const SHOW_RESULT_MS = 1700;

/** Würfel-Fenster in der Spielfläche: wartet auf den Wurf (`roll` = null), purzelt, zeigt die Rechnung, meldet dann `onDone`. */
export function DiceOverlay({ ability, dc, roll, onDone }: { ability: string; dc: number; roll: RollResult | null; onDone: () => void }) {
  const [phase, setPhase] = useState<DiceState>("shake");
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => {
    if (!roll) return;
    // Zustandswechsel per Timer (kein setState im Effekt-Rumpf): erst purzeln, dann liegen bleiben, dann weiter
    const t0 = setTimeout(() => setPhase("tumble"), 0);
    const t1 = setTimeout(() => setPhase("landed"), TUMBLE_MS);
    const t2 = setTimeout(() => done.current(), TUMBLE_MS + SHOW_RESULT_MS);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [roll]);

  const landed = phase === "landed" && roll;
  const tone = landed ? (roll.success ? "good" : "bad") : "neutral";
  const abilityLabel = (ABILITY_LABEL as Record<string, string>)[ability] ?? ability;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/65 backdrop-blur-[1px]" role="dialog" aria-label="Würfelprobe">
      <div className="oq-panel px-8 py-5 text-center space-y-2">
        <p className="oq-title">Probe: {abilityLabel} gegen SG {dc}</p>
        <div className="grid place-items-center"><D20 value={roll?.roll ?? null} state={roll ? phase : "shake"} tone={tone} /></div>
        {!roll && <p className="text-xs text-gray-300">Der Würfel rollt …</p>}
        {landed && (
          <div className="oq-feed space-y-0.5">
            {roll.rerolledFrom && <p className="text-[11px] font-bold text-emerald-300">🍀 Glücksrabe: die {roll.rerolledFrom} wurde neu gewürfelt</p>}
            <p className="text-sm font-black text-white">
              {roll.roll}{roll.modifier ? ` ${roll.modifier > 0 ? "+" : "−"} ${Math.abs(roll.modifier)}` : ""} = {roll.total} <span className="text-gray-400 font-semibold">gegen {roll.dc}</span>
            </p>
            <p className={`text-base font-black ${roll.success ? "text-emerald-300" : "text-red-300"}`}>
              {roll.crit ? "Natürliche 20 — großartig!" : roll.fumble ? "Natürliche 1 — autsch!" : roll.success ? "Gelungen!" : "Misslungen"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
