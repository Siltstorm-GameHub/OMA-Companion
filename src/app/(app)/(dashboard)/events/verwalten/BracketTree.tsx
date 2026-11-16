"use client";
// Visueller K.O.-Baum der Turnier-Seite: Runden als Spalten (erste Runde links, Finale rechts),
// Verbindungslinien zwischen den Paarungen. Antippen wählt eine Paarung — die Eingabe darunter
// übernimmt TournamentManager.

import { Check } from "@/components/icons";
import type { BracketColumn, BracketSlot } from "@/lib/tournaments/bracket-tree";

type Props = {
  columns: BracketColumn[];
  thirdPlace: BracketSlot | null;
  nameOf: (uid: string) => string;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

function PlayerRow({ uid, total, legs, won, decided, bye, nameOf }: {
  uid: string | null; total: number | null; legs: (number | null)[]; won: boolean; decided: boolean; bye: boolean;
  nameOf: (uid: string) => string;
}) {
  const name = uid ? nameOf(uid) : bye ? "Freilos" : "offen";
  return (
    <span className={`flex items-center gap-1.5 px-2 py-1 text-xs ${won ? "text-white font-semibold" : decided ? "text-gray-500" : uid ? "text-gray-200" : "text-gray-600 italic"}`}>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {won && <Check className="w-3 h-3 shrink-0 text-teal-300" />}
      {legs.length > 1 && legs.some(l => l != null) && (
        <span className="shrink-0 text-[10px] font-normal text-gray-500 tabular-nums">{legs.map(l => l ?? "–").join(" · ")}</span>
      )}
      <span className={`w-5 shrink-0 text-right tabular-nums ${won ? "text-teal-200" : ""}`}>{total ?? ""}</span>
    </span>
  );
}

function SlotBox({ slot, nameOf, selected, onSelect }: { slot: BracketSlot; nameOf: Props["nameOf"]; selected: boolean; onSelect: Props["onSelect"] }) {
  const decided = !!slot.winnerId;
  const label = [
    slot.player1Id ? nameOf(slot.player1Id) : "offen",
    "gegen",
    slot.player2Id ? nameOf(slot.player2Id) : slot.bye ? "Freilos" : "offen",
    slot.live ? "(läuft)" : decided ? "(entschieden)" : "",
  ].join(" ");
  return (
    <button type="button" onClick={() => onSelect(slot.key)} aria-pressed={selected} aria-label={label}
      className={`relative w-full overflow-hidden rounded-lg border text-left transition-colors divide-y divide-white/[0.05] ${
        selected ? "border-teal-400/60 bg-teal-500/[0.08] ring-1 ring-teal-400/40"
          : slot.live ? "border-amber-400/50 bg-amber-500/[0.06]"
          : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
      } ${slot.bye ? "opacity-60" : ""}`}>
      {slot.live && (
        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden />
      )}
      <PlayerRow uid={slot.player1Id} total={slot.total1} legs={slot.legs.map(l => l.s1)} nameOf={nameOf}
        won={decided && slot.winnerId === slot.player1Id} decided={decided} bye={slot.bye} />
      <PlayerRow uid={slot.player2Id} total={slot.total2} legs={slot.legs.map(l => l.s2)} nameOf={nameOf}
        won={decided && slot.winnerId === slot.player2Id} decided={decided} bye={slot.bye} />
    </button>
  );
}

/** Paare je Spalte bilden: zwei Paarungen führen in eine der nächsten Runde */
const pairs = <T,>(xs: T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += 2) out.push(xs.slice(i, i + 2));
  return out;
};

export default function BracketTree({ columns, thirdPlace, nameOf, selectedKey, onSelect }: Props) {
  if (columns.length === 0) return null;
  // Höhe richtet sich nach der vollsten Spalte, damit die Linien sauber mittig treffen
  const maxSlots = Math.max(...columns.map(c => c.slots.length));
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-6">
          {columns.map((col, ci) => {
            const last = ci === columns.length - 1;
            return (
              <div key={col.round} className="flex w-48 flex-col">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{col.label}</p>
                <div className="flex flex-1 flex-col" style={{ minHeight: `${maxSlots * 4.25}rem` }}>
                  {pairs(col.slots).map((pair, pi) => (
                    <div key={pi} className="relative flex flex-1 flex-col">
                      {pair.map(slot => (
                        <div key={slot.key} className="relative flex flex-1 items-center py-1.5">
                          {/* Linie von links (aus der Vorrunde) */}
                          {ci > 0 && <span aria-hidden className="absolute -left-3 top-1/2 w-3 border-t border-white/15" />}
                          <SlotBox slot={slot} nameOf={nameOf} selected={selectedKey === slot.key} onSelect={onSelect} />
                          {/* Einzelne Paarung ohne Partner: gerade weiter nach rechts */}
                          {!last && pair.length === 1 && <span aria-hidden className="absolute -right-3 top-1/2 w-3 border-t border-white/15" />}
                        </div>
                      ))}
                      {/* Klammer: verbindet die Mitte beider Paarungen nach rechts */}
                      {!last && pair.length === 2 && (
                        <span aria-hidden className="pointer-events-none absolute -right-3 top-1/4 bottom-1/4 w-3 rounded-r border-y border-r border-white/15" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {thirdPlace && (
        <div className="w-48">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Spiel um Platz 3</p>
          <SlotBox slot={thirdPlace} nameOf={nameOf} selected={selectedKey === thirdPlace.key} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}
