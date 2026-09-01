"use client";

// ============================================
// Match-3-Brett — "Edelstein-Kampf" (Puzzle-PvE-Modus)
// ============================================
// Interaktives Brett für den eigenen Zug: Tippen auf zwei benachbarte Kacheln
// versucht einen Swap. Ergibt der Swap kein Match, springt er sichtbar zurück
// (klassische Match-3-Konvention, verbraucht keinen Zug). Jeder gültige Swap
// wird lokal SOFORT ausgewertet (resolveBoardSession, siehe board-match3.ts)
// — nur für Animation/Feedback, die tatsächlich gutgeschriebene Rage berechnet
// der Server bei "Zug bestätigen" autoritativ neu aus derselben Swap-Sequenz
// (Anti-Cheat, siehe live-battle.ts). Die drei Kachel-Symbole entsprechen den
// drei CardClass-Werten und nutzen die bereits vorhandenen Spielgenre-Icons
// (Arcade=Support, Shooter=Damage Dealer, Racing=Tank).

import { useRef, useState } from "react";
import { resolveBoardSession, type BoardGrid, type SwapMove, type TileClassSymbol } from "@/lib/battle-engine/board-match3";
import { BOARD_COLS } from "@/lib/battle-engine/constants";
import { randomSeed } from "@/lib/battle-engine/rng";

const TILE_ICON: Record<TileClassSymbol, { src: string; alt: string; color: string }> = {
  SUPPORT: { src: "/Arcade%20Icon.png", alt: "Support", color: "#8b5cf6" },
  DAMAGE_DEALER: { src: "/Shooter%20Icon.png", alt: "Damage Dealer", color: "#ef4444" },
  TANK: { src: "/Racing%20Icon.png", alt: "Tank", color: "#14b8a6" },
};

function areAdjacent(a: number, b: number): boolean {
  const ra = Math.floor(a / BOARD_COLS);
  const ca = a % BOARD_COLS;
  const rb = Math.floor(b / BOARD_COLS);
  const cb = b % BOARD_COLS;
  return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
}

export default function BoardMatch3({
  grid: initialGrid,
  moveBudget,
  disabled,
  onConfirm,
}: {
  grid: BoardGrid;
  moveBudget: number;
  disabled?: boolean;
  onConfirm: (swaps: SwapMove[]) => void;
}) {
  // Rein lokaler Vorschau-Seed — muss NICHT mit dem serverseitigen rngState
  // übereinstimmen (der ist dem Client bewusst nicht bekannt, siehe Anti-Cheat-
  // Abschnitt im Plan). Nachrutschende Steine können daher optisch leicht von
  // der späteren Server-Berechnung abweichen, die tatsächliche Rage-Vergabe
  // ist davon unabhängig korrekt.
  const rngStateRef = useRef(randomSeed());
  const [grid, setGrid] = useState<BoardGrid>(initialGrid);
  const [swaps, setSwaps] = useState<SwapMove[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidCell, setInvalidCell] = useState<number | null>(null);

  const remaining = moveBudget - swaps.length;

  function handleTap(cell: number) {
    if (disabled || remaining <= 0) return;

    if (selected === null) {
      setSelected(cell);
      return;
    }
    if (selected === cell) {
      setSelected(null);
      return;
    }
    if (!areAdjacent(selected, cell)) {
      setSelected(cell);
      return;
    }

    const swap: SwapMove = { fromCell: selected, toCell: cell };
    const result = resolveBoardSession(grid, rngStateRef.current, [swap], 1);
    setSelected(null);

    if (result.matchedSwaps === 0) {
      setInvalidCell(cell);
      window.setTimeout(() => setInvalidCell(null), 300);
      return;
    }

    rngStateRef.current = result.finalRngState;
    setGrid(result.finalGrid);
    setSwaps((prev) => [...prev, swap]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest">
        <span>Edelstein-Brett</span>
        <span className="tabular-nums">{Math.max(0, remaining)} Züge übrig</span>
      </div>
      <div
        className="grid gap-1 mx-auto"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`, maxWidth: 320 }}
      >
        {grid.map((symbol, cell) => {
          const icon = TILE_ICON[symbol];
          const isSelected = selected === cell;
          const isInvalid = invalidCell === cell;
          return (
            <button
              key={cell}
              type="button"
              disabled={disabled || remaining <= 0}
              onClick={() => handleTap(cell)}
              className="aspect-square rounded-md flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60"
              style={{
                background: `${icon.color}22`,
                boxShadow: isInvalid
                  ? "0 0 0 2px #f43f5e, 0 0 10px rgba(244,63,94,0.6)"
                  : isSelected
                    ? `0 0 0 2px ${icon.color}, 0 0 10px ${icon.color}99`
                    : "0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon.src} alt={icon.alt} className="w-3/4 h-3/4 object-contain" />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onConfirm(swaps)}
        disabled={disabled}
        className="w-full py-2 rounded-lg text-xs font-semibold bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
      >
        {swaps.length > 0 ? `Zug bestätigen (${swaps.length} Match${swaps.length === 1 ? "" : "es"})` : "Zug ohne Matches bestätigen"}
      </button>
    </div>
  );
}
