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
//
// Animation: resolveBoardSession liefert nicht nur das Endergebnis, sondern
// auch `steps` — einen Eintrag pro Match-Runde (direkter Match + jede weitere
// Kaskade). Das Brett spielt diese Schritte einzeln durch: erst kurz die
// getroffenen Kacheln "zerstören" (gem-destroy-Keyframe, globals.css), dann
// die nachgerückten/neu aufgefüllten Kacheln von oben "reinfallen" lassen
// (CSS-Transition auf transform, siehe fallingCells) — statt nur stumpf das
// Endergebnis einzublenden.

import { useRef, useState } from "react";
import {
  resolveBoardSession,
  type BoardAnimationStep,
  type BoardGrid,
  type SwapMove,
  type TileClassSymbol,
} from "@/lib/battle-engine/board-match3";
import { BOARD_COLS } from "@/lib/battle-engine/constants";
import { randomSeed } from "@/lib/battle-engine/rng";

const TILE_ICON: Record<TileClassSymbol, { src: string; alt: string; color: string }> = {
  SUPPORT: { src: "/Arcade%20Icon.png", alt: "Support", color: "#8b5cf6" },
  DAMAGE_DEALER: { src: "/Shooter%20Icon.png", alt: "Damage Dealer", color: "#ef4444" },
  TANK: { src: "/Racing%20Icon.png", alt: "Tank", color: "#14b8a6" },
};

const DESTROY_ANIM_MS = 220;
const FALL_ANIM_MS = 260;

function areAdjacent(a: number, b: number): boolean {
  const ra = Math.floor(a / BOARD_COLS);
  const ca = a % BOARD_COLS;
  const rb = Math.floor(b / BOARD_COLS);
  const cb = b % BOARD_COLS;
  return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Für einen Animations-Schritt: alle Zellen der betroffenen Spalten von Reihe
 *  0 bis zur am tiefsten getroffenen Reihe — grob, aber visuell korrekt genug,
 *  um sowohl neu aufgefüllte als auch nachgerutschte Kacheln als "fallend" zu
 *  markieren, ohne einzelne Kachel-Identität durch die Kaskade zu verfolgen. */
function computeFallingCells(matchedCells: number[]): Set<number> {
  const maxRowByCol = new Map<number, number>();
  for (const cell of matchedCells) {
    const col = cell % BOARD_COLS;
    const row = Math.floor(cell / BOARD_COLS);
    maxRowByCol.set(col, Math.max(maxRowByCol.get(col) ?? -1, row));
  }
  const falling = new Set<number>();
  for (const [col, maxRow] of maxRowByCol) {
    for (let row = 0; row <= maxRow; row++) {
      falling.add(row * BOARD_COLS + col);
    }
  }
  return falling;
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
  const [board, setBoard] = useState<BoardGrid>(initialGrid);
  const [swaps, setSwaps] = useState<SwapMove[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidCell, setInvalidCell] = useState<number | null>(null);
  const [destroyingCells, setDestroyingCells] = useState<Set<number>>(new Set());
  const [fallingCells, setFallingCells] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState(false);

  const remaining = moveBudget - swaps.length;
  const interactionLocked = disabled || remaining <= 0 || animating;

  async function playSteps(steps: BoardAnimationStep[]) {
    for (const step of steps) {
      setDestroyingCells(new Set(step.matchedCells));
      await sleep(DESTROY_ANIM_MS);

      setBoard(step.gridAfter);
      setFallingCells(computeFallingCells(step.matchedCells));
      setDestroyingCells(new Set());
      // Ein Frame mit der "angehobenen" Startposition rendern lassen, bevor die
      // Ziel-Position gesetzt wird — sonst läuft die CSS-Transition ins Leere,
      // weil Start- und Endzustand im selben Render landen.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      setFallingCells(new Set());
      await sleep(FALL_ANIM_MS);
    }
  }

  async function handleTap(cell: number) {
    if (interactionLocked) return;

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
    const result = resolveBoardSession(board, rngStateRef.current, [swap], 1);
    setSelected(null);

    if (result.matchedSwaps === 0) {
      setInvalidCell(cell);
      window.setTimeout(() => setInvalidCell(null), 300);
      return;
    }

    setAnimating(true);
    rngStateRef.current = result.finalRngState;
    setSwaps((prev) => [...prev, swap]);

    // Den Swap selbst sofort zeigen, bevor die Match-Runden abgespielt werden.
    const swappedBoard = [...board];
    swappedBoard[swap.fromCell] = board[swap.toCell];
    swappedBoard[swap.toCell] = board[swap.fromCell];
    setBoard(swappedBoard);
    await sleep(120);

    await playSteps(result.steps);
    setAnimating(false);
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
        {board.map((symbol, cell) => {
          const icon = TILE_ICON[symbol];
          const isSelected = selected === cell;
          const isInvalid = invalidCell === cell;
          const isDestroying = destroyingCells.has(cell);
          const isFalling = fallingCells.has(cell);
          return (
            <button
              key={cell}
              type="button"
              disabled={interactionLocked}
              onClick={() => handleTap(cell)}
              className={`aspect-square rounded-md flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60 ${
                isDestroying ? "gem-destroy" : ""
              }`}
              style={{
                background: `${icon.color}22`,
                boxShadow: isInvalid
                  ? "0 0 0 2px #f43f5e, 0 0 10px rgba(244,63,94,0.6)"
                  : isSelected
                    ? `0 0 0 2px ${icon.color}, 0 0 10px ${icon.color}99`
                    : "0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="w-3/4 h-3/4 flex items-center justify-center"
                style={{
                  transform: isFalling ? "translateY(-14px)" : "translateY(0)",
                  opacity: isFalling ? 0.55 : 1,
                  transition: `transform ${FALL_ANIM_MS}ms ease-out, opacity ${FALL_ANIM_MS}ms ease-out`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon.src} alt={icon.alt} className="w-full h-full object-contain" />
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onConfirm(swaps)}
        disabled={disabled || animating}
        className="w-full py-2 rounded-lg text-xs font-semibold bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
      >
        {swaps.length > 0 ? `Zug bestätigen (${swaps.length} Match${swaps.length === 1 ? "" : "es"})` : "Zug ohne Matches bestätigen"}
      </button>
    </div>
  );
}
