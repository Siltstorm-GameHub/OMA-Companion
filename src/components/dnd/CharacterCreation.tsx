"use client";

// ============================================
// OMA-Quest-Charaktererstellung — Auswahl + Auswürfel-Ergebnis-Anzeige
// ============================================
// Rasse & Klasse werden bewusst gewählt (wie im klassischen Rollenspiel), nur die 6
// Attribute werden gewürfelt. Löst POST /api/dnd/character/create aus
// (Erst-Erstellung ODER Re-Roll, je nach isReroll), zeigt danach das
// Ergebnis an. Aussehen bleibt bewusst getrennt — verlinkt auf den
// bestehenden Skin-Auswahl-Flow (/battle-cards/my-card), der schon heute die
// einzige aktiv verdrahtete Aussehens-Anpassung für Community-Karten ist.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Loader2, Dices, ArrowRight } from "@/components/icons";
import { RollingReveal, SettledRow } from "./DiceRoll";
import { DND_RACES, type DndRaceDef } from "@/lib/dnd/races";
import { DND_CLASSES, type DndClassDef } from "@/lib/dnd/classes";

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
  dndRerollCredits: number;
}

const ABILITY_LABEL: Record<string, string> = {
  str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA",
};

// Nur noch die 6 Attribute werden ausgewürfelt (Rasse/Klasse sind bewusste Wahl).
const ABILITY_STEPS = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_SCORE_CANDIDATES = Array.from({ length: 16 }, (_, i) => i + 3); // 3–18

type Phase = "choose" | "rolling" | "done";

function SelectGrid<T extends { id: string; name: string; description: string }>({
  options,
  selectedId,
  onSelect,
}: {
  options: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`text-left rounded-xl p-3 transition-colors border ${
              isSelected
                ? "bg-violet-600/20 border-violet-500 text-white"
                : "bg-black/25 border-white/5 text-gray-300 hover:bg-white/5"
            }`}
          >
            <p className="text-xs font-bold">{opt.name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{opt.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function CharacterCreation({
  mode,
  onDone,
}: {
  mode: "create" | "reroll";
  /** Optional: wird zusätzlich zu router.refresh() aufgerufen, wenn der Nutzer
   *  auf "Zur Weltkarte" klickt — für einbettende Komponenten (z.B. DndHome),
   *  die selbst zwischen Reroll-Ansicht und Weltkarte umschalten. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("choose");
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RolledCard | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  // Ob DIESER Wurf ein Re-Roll ist — startet beim mode-Prop, wird aber auch
  // client-seitig auf true gesetzt, sobald "Nicht zufrieden?" nach einer
  // Erst-Erstellung geklickt wird (mode bleibt sonst fest auf "create", da
  // die Elternseite dndCreatedAt erst nach router.refresh() neu abfragt).
  const [isReroll, setIsReroll] = useState(mode === "reroll");

  const selectedRace: DndRaceDef | null = useMemo(
    () => DND_RACES.find((r) => r.id === raceId) ?? null,
    [raceId]
  );
  const selectedClass: DndClassDef | null = useMemo(
    () => DND_CLASSES.find((c) => c.id === classId) ?? null,
    [classId]
  );
  const canRoll = raceId != null && classId != null;
  const allRevealed = phase === "done" && result != null && revealCount >= ABILITY_STEPS.length;

  async function roll() {
    if (!raceId || !classId) return;
    setRolling(true);
    setError(null);
    try {
      const res = await fetch("/api/dnd/character/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reroll: isReroll, raceId, classId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Auswürfeln fehlgeschlagen.");
      setRevealCount(0);
      setResult(data.card);
      setPhase("done");
      // Bewusst KEIN router.refresh() hier: die Server-Komponente (/oma-quest/page.tsx)
      // würde sonst sofort neu rendern und, da dndCreatedAt jetzt gesetzt ist,
      // CharacterCreation mitten in der Reveal-Animation gegen WorldMap tauschen.
      // Der Refresh passiert erst, wenn der Nutzer bewusst weiterklickt (unten).
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setRolling(false);
    }
  }

  const visibleSteps = useMemo(
    () => (result ? ABILITY_STEPS.slice(0, Math.min(revealCount + 1, ABILITY_STEPS.length)) : []),
    [result, revealCount]
  );

  if (phase === "choose") {
    return (
      <div className="moba-panel rounded-2xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <Dices className="w-8 h-8 mx-auto text-violet-400 mb-1" />
          <p className="text-sm text-gray-300">
            {isReroll
              ? "Wähle Rasse und Klasse EINMALIG neu — die Attribute werden danach neu gewürfelt."
              : "Wähle Rasse und Klasse für deinen OMA-Quest-Charakter. Die Attribute werden per klassischem 4W6-Wurf bestimmt."}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Rasse</h4>
          <SelectGrid options={DND_RACES} selectedId={raceId} onSelect={setRaceId} />
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Klasse</h4>
          <SelectGrid options={DND_CLASSES} selectedId={classId} onSelect={setClassId} />
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={roll}
            disabled={!canRoll || rolling}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-bold text-white transition-colors"
          >
            {rolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
            {isReroll ? "Attribute neu würfeln" : "Attribute würfeln!"}
          </button>
        </div>
      </div>
    );
  }

  if (!allRevealed) {
    return (
      <div className="moba-panel rounded-2xl p-6 space-y-3">
        <div className="text-center space-y-1 pb-1">
          <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Es wird gewürfelt …</p>
          <h3 className="font-battle text-base text-white">
            {selectedRace?.name} {selectedClass?.name}
          </h3>
        </div>
        <div className="space-y-2">
          {visibleSteps.map((key, i) => {
            const isCurrent = i === visibleSteps.length - 1 && revealCount < ABILITY_STEPS.length;
            const finalValue = result?.abilityScores[key] ?? "?";
            return isCurrent ? (
              <RollingReveal
                key={key}
                label={ABILITY_LABEL[key]}
                finalValue={finalValue}
                candidates={ABILITY_SCORE_CANDIDATES}
                onSettled={() => setRevealCount((c) => c + 1)}
              />
            ) : (
              <SettledRow key={key} label={ABILITY_LABEL[key]} value={finalValue} />
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setRevealCount(ABILITY_STEPS.length)}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          Überspringen
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="moba-panel rounded-2xl p-6 space-y-5"
    >
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Dein Charakter</p>
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

      {result.dndRerollCredits > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsReroll(true);
            setResult(null);
            setRaceId(null);
            setClassId(null);
            setPhase("choose");
          }}
          className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
        >
          Nicht zufrieden? Noch {result.dndRerollCredits}× Re-Roll verfügbar.
        </button>
      )}
      {result.dndRerollCredits <= 0 && (
        <p className="text-[11px] text-gray-500">
          Keine Re-Rolls mehr übrig — weitere gibt es im Shop.
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Link
          href="/battle-cards/my-card"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5 transition-colors"
        >
          Aussehen anpassen <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => { router.refresh(); onDone?.(); }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
        >
          Zur Weltkarte <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
