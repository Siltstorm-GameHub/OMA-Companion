"use client";

// ============================================
// OMA-Quest-Startseite (nach Erst-Erstellung) — schaltet zwischen Weltkarte und
// Re-Roll-Ansicht um
// ============================================
// Sobald dndCreatedAt gesetzt ist, zeigt /oma-quest normalerweise nur noch die
// Weltkarte (samt Chronik) — Charakterblatt, Fortschritt und Quest-Log liegen im Battle-Cards-Hub (Reiter Held/Welt) und im Spielmenü der Welt. Gekaufte Re-Roll-Credits (Shop: buy-dnd-reroll) oder ein
// übrig gebliebener Gratis-Credit (Erst-Erstellung/Auto-Migration) müssen
// auch später noch einlösbar sein, nicht nur direkt nach der Erstellung.

import { useState } from "react";
import { Dices } from "@/components/icons";
import WorldMap from "./WorldMap";
import CharacterCreation from "./CharacterCreation";
import Chronicle from "./Chronicle";

export default function DndHome({
  myCardId,
  rerollCredits,
}: {
  myCardId: string;
  rerollCredits: number;
}) {
  const [showReroll, setShowReroll] = useState(false);

  if (showReroll) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowReroll(false)}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Zurück zur Weltkarte
        </button>
        <CharacterCreation mode="reroll" onDone={() => setShowReroll(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rerollCredits > 0 && (
        <button
          type="button"
          onClick={() => setShowReroll(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Dices className="w-3.5 h-3.5" /> Charakter neu würfeln ({rerollCredits} verfügbar)
        </button>
      )}
      <WorldMap myCardId={myCardId} />
      <Chronicle />
    </div>
  );
}
