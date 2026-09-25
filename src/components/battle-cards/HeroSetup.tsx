"use client";

// ============================================
// Helden-Einrichtung (OMA Battle Cards) — Aussehen → Klasse & Werte → Start-Pack → Deck
// ============================================
// Ersetzt für jedes Mitglied den früheren Einstieg "Start-Pack wählen". Der Held ist die Community-Karte;
// beim Gestalten steht der Charakter direkt in der Karte. Der Server-Layout (battle-cards/layout.tsx)
// zeigt diesen Ablauf statt aller Battle-Cards-Seiten, bis er abgeschlossen ist.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "@/components/icons";
import BattleCardsLogo from "./BattleCardsLogo";
import BattleCardView, { type BattleCardData } from "./BattleCardView";
import MyCardEditor from "./MyCardEditor";
import StarterPickFlow from "./StarterPickFlow";
import CharacterCreation from "@/components/dnd/CharacterCreation";
import type { TeCharacterConfig } from "@/lib/te-character";

type CardWithId = BattleCardData & { id: string };

const STEPS = [
  { id: "look", label: "Aussehen" },
  { id: "class", label: "Klasse & Werte" },
  { id: "pack", label: "Start-Pack" },
  { id: "deck", label: "Deck" },
] as const;

const INTRO: Record<(typeof STEPS)[number]["id"], { title: string; text: string }> = {
  look: {
    title: "Erstelle deinen Helden",
    text: "Gestalte deinen Charakter — er steht direkt in deiner Karte. Untertitel und Beschreibung legst du gleich mit fest.",
  },
  class: {
    title: "Klasse wählen und Werte auswürfeln",
    text: "Deine Klasse bestimmt, ob du Tank, Damage Dealer oder Support bist. Die Werte entscheidet der Würfel.",
  },
  pack: {
    title: "Wähle dein Start-Pack",
    text: "Dein Held ist gesetzt. Ergänze ihn um 4 Karten, die die beiden anderen Rollen abdecken.",
  },
  deck: {
    title: "Dein Team steht!",
    text: "Held und Start-Pack bilden dein Lineup für OMA Gems. Für OMA Duels stellst du ein eigenes Deck zusammen.",
  },
};

export default function HeroSetup({
  step,
  hero,
  character,
  hasCharacter,
  standardCards,
}: {
  step: "look" | "class" | "pack";
  hero: CardWithId;
  character: TeCharacterConfig;
  hasCharacter: boolean;
  standardCards: CardWithId[];
}) {
  const router = useRouter();
  const [finished, setFinished] = useState(false);
  // Nach dem Würfeln zeigt die Karte sofort die neue Klasse/Werte (die Server-Daten kommen erst mit dem Refresh)
  const [rolled, setRolled] = useState<Partial<BattleCardData> | null>(null);

  const current = finished ? "deck" : step;
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  const intro = INTRO[current];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <BattleCardsLogo />

      <ol className="flex items-center gap-2 text-[11px]" aria-label="Fortschritt">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${
                i < currentIndex ? "bg-emerald-500 text-black" : i === currentIndex ? "bg-violet-600 text-white" : "bg-white/10 text-gray-500"
              }`}
            >
              {i < currentIndex ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span className={i === currentIndex ? "text-white font-semibold" : "text-gray-500"}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="w-4 h-px bg-white/15" />}
          </li>
        ))}
      </ol>

      <div>
        <h1 className="text-lg font-black text-white">{intro.title}</h1>
        <p className="text-xs text-gray-500 mt-0.5 max-w-xl">{intro.text}</p>
      </div>

      {current === "look" && (
        <MyCardEditor card={hero} initialTeCharacter={character} hasTeCharacter={hasCharacter} setup />
      )}

      {current === "class" && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
          <div className="lg:sticky lg:top-4 self-start max-w-[240px]">
            <BattleCardView card={{ ...hero, teCharacter: character, ...(rolled ?? {}) }} />
          </div>
          <CharacterCreation
            mode="create"
            setup
            onRolled={(c) => setRolled({ class: c.class as BattleCardData["class"], baseHp: c.baseHp, baseAttack: c.baseAttack, baseDefense: c.baseDefense, speed: c.speed })}
          />
        </div>
      )}

      {current === "pack" && (
        <div className="space-y-5">
          <div className="max-w-[200px]">
            <BattleCardView card={{ ...hero, teCharacter: character }} />
          </div>
          <StarterPickFlow cards={standardCards} heroRole={hero.class} onDone={() => setFinished(true)} />
        </div>
      )}

      {current === "deck" && (
        <div className="moba-panel rounded-2xl p-6 space-y-4 max-w-xl">
          <ul className="space-y-2 text-sm text-gray-300">
            <li><span className="font-bold text-white">OMA Gems:</span> dein Lineup besteht aus dem Helden und deinen 4 Picks. Du kannst es jederzeit umstellen — der Held bleibt gesetzt.</li>
            <li><span className="font-bold text-white">OMA Duels:</span> stelle dein Duell-Deck zusammen (mit deinem Helden).</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href="/battle-cards/lineup" className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5 transition-colors">Lineup ansehen</Link>
            <Link href="/battle-cards/duel-deck" className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5 transition-colors">Duell-Deck bauen</Link>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-colors"
            >
              Los geht&apos;s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
