"use client";

// ============================================
// D&D-Charaktererstellung — Auswürfel-Ergebnis-Anzeige
// ============================================
// Löst POST /api/dnd/character/create aus (Erst-Erstellung ODER Re-Roll,
// je nach `mode`), zeigt das gewürfelte Ergebnis (Rasse/Klasse/Attribute/
// Backstory) an. Aussehen bleibt bewusst getrennt — verlinkt auf den
// bestehenden Skin-Auswahl-Flow (/battle-cards/my-card), der schon heute die
// einzige aktiv verdrahtete Aussehens-Anpassung für Community-Karten ist.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Loader2, Dices, ArrowRight } from "@/components/icons";
import { RollingReveal, SettledRow } from "./DiceRoll";
import { DND_RACES } from "@/lib/dnd/races";
import { DND_CLASSES } from "@/lib/dnd/classes";

interface RolledCard {
  id: string;
  name: string;
  dndRace: string;
  dndClass: string;
  class: string;
  abilityScores: Record<string, number>;
  backstory: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  dndRerollUsed: boolean;
}

const ABILITY_LABEL: Record<string, string> = {
  str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA",
};

// Reihenfolge der Aufdeckung: erst Rasse, dann Klasse, dann die 6 Attribute
// einzeln — jeder Schritt bekommt seine eigene RollingReveal-Animation.
const REVEAL_STEPS = [
  { key: "race", label: "Rasse" },
  { key: "class", label: "Klasse" },
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" },
] as const;

const RACE_NAMES = DND_RACES.map((r) => r.name);
const CLASS_NAMES = DND_CLASSES.map((c) => c.name);
const ABILITY_SCORE_CANDIDATES = Array.from({ length: 16 }, (_, i) => i + 3); // 3–18

function stepValue(result: RolledCard, key: (typeof REVEAL_STEPS)[number]["key"]): string | number {
  if (key === "race") return result.dndRace;
  if (key === "class") return result.dndClass;
  return result.abilityScores[key] ?? "?";
}

function stepCandidates(key: (typeof REVEAL_STEPS)[number]["key"]): (string | number)[] {
  if (key === "race") return RACE_NAMES;
  if (key === "class") return CLASS_NAMES;
  return ABILITY_SCORE_CANDIDATES;
}

export default function CharacterCreation({ mode }: { mode: "create" | "reroll" }) {
  const router = useRouter();
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RolledCard | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  const allRevealed = result != null && revealCount >= REVEAL_STEPS.length;

  async function roll() {
    setRolling(true);
    setError(null);
    try {
      const res = await fetch("/api/dnd/character/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reroll: mode === "reroll" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Auswürfeln fehlgeschlagen.");
      setRevealCount(0);
      setResult(data.card);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setRolling(false);
    }
  }

  const visibleSteps = useMemo(
    () => (result ? REVEAL_STEPS.slice(0, Math.min(revealCount + 1, REVEAL_STEPS.length)) : []),
    [result, revealCount]
  );

  if (!result) {
    return (
      <div className="moba-panel rounded-2xl p-6 text-center space-y-4">
        <Dices className="w-10 h-10 mx-auto text-violet-400" />
        <p className="text-sm text-gray-300">
          {mode === "reroll"
            ? "Würfle Rasse, Klasse und Attribute EINMALIG komplett neu — danach ist das Ergebnis endgültig."
            : "Würfle deinen D&D-Charakter aus: Rasse, Klasse und Attribute per klassischem 4W6-Wurf."}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={roll}
          disabled={rolling}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white transition-colors"
        >
          {rolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
          {mode === "reroll" ? "Neu auswürfeln" : "Würfeln!"}
        </button>
      </div>
    );
  }

  if (!allRevealed) {
    return (
      <div className="moba-panel rounded-2xl p-6 space-y-3">
        <div className="text-center space-y-1 pb-1">
          <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Es wird gewürfelt …</p>
        </div>
        <div className="space-y-2">
          {visibleSteps.map((step, i) => {
            const isCurrent = i === visibleSteps.length - 1 && revealCount < REVEAL_STEPS.length;
            return isCurrent ? (
              <RollingReveal
                key={step.key}
                label={step.label}
                finalValue={stepValue(result, step.key)}
                candidates={stepCandidates(step.key)}
                onSettled={() => setRevealCount((c) => c + 1)}
              />
            ) : (
              <SettledRow key={step.key} label={step.label} value={stepValue(result, step.key)} />
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setRevealCount(REVEAL_STEPS.length)}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          Überspringen
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="moba-panel rounded-2xl p-6 space-y-5"
    >
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Ausgewürfelt</p>
        <h3 className="font-battle text-lg text-white">
          {result.dndRace} {result.dndClass}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(result.abilityScores).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-black/25 py-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase">{ABILITY_LABEL[key] ?? key}</p>
            <p className="text-base font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        <div><p className="text-gray-500">HP</p><p className="font-bold text-white">{result.baseHp}</p></div>
        <div><p className="text-gray-500">ATK</p><p className="font-bold text-white">{result.baseAttack}</p></div>
        <div><p className="text-gray-500">DEF</p><p className="font-bold text-white">{result.baseDefense}</p></div>
        <div><p className="text-gray-500">SPD</p><p className="font-bold text-white">{result.speed}</p></div>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed italic">{result.backstory}</p>

      {!result.dndRerollUsed && mode !== "reroll" && (
        <button
          type="button"
          onClick={() => { setResult(null); }}
          className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
        >
          Nicht zufrieden? Einmaliger Re-Roll verfügbar.
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Link
          href="/battle-cards/my-card"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5 transition-colors"
        >
          Aussehen anpassen <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/dnd"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
        >
          Zur Weltkarte <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
