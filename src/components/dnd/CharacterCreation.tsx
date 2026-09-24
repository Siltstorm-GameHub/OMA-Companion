"use client";

// ============================================
// D&D-Charaktererstellung — Auswürfel-Ergebnis-Anzeige
// ============================================
// Löst POST /api/dnd/character/create aus (Erst-Erstellung ODER Re-Roll,
// je nach `mode`), zeigt das gewürfelte Ergebnis (Rasse/Klasse/Attribute/
// Backstory) an. Aussehen bleibt bewusst getrennt — verlinkt auf den
// bestehenden Skin-Auswahl-Flow (/battle-cards/my-card), der schon heute die
// einzige aktiv verdrahtete Aussehens-Anpassung für Community-Karten ist.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Dices, ArrowRight } from "@/components/icons";

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

export default function CharacterCreation({ mode }: { mode: "create" | "reroll" }) {
  const router = useRouter();
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RolledCard | null>(null);

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
      setResult(data.card);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setRolling(false);
    }
  }

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

  return (
    <div className="moba-panel rounded-2xl p-6 space-y-5">
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
    </div>
  );
}
