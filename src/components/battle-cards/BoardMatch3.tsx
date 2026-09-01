"use client";

// ============================================
// Match-3-Brett — "Edelstein-Kampf" (Puzzle-PvE-Modus)
// ============================================
// Interaktives Brett für den eigenen Zug: Tippen auf zwei benachbarte Kacheln
// versucht einen Swap. Ergibt der Swap kein Match, springt er sichtbar zurück
// (klassische Match-3-Konvention, verbraucht keinen Zug). Jeder gültige Swap
// wird lokal SOFORT ausgewertet (resolveBoardSession, siehe board-match3.ts)
// — nur für Animation/Feedback, die tatsächlich gutgeschriebene Rage berechnet
// der Server autoritativ neu aus derselben Swap-Sequenz, sobald das Zug-
// Budget aufgebraucht ist und automatisch zur Aktions-Auswahl übergeben wird
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

import { HelpCircle, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  resolveBoardSession,
  type BoardAnimationStep,
  type BoardGrid,
  type SwapMove,
  type TileClassSymbol,
} from "@/lib/battle-engine/board-match3";
import { BOARD_COLS } from "@/lib/battle-engine/constants";
import { randomSeed } from "@/lib/battle-engine/rng";
import { playCommunityBonusSound, playInvalidSwapSound, playMatchSound, playSwapSound } from "@/lib/battle-cards/sound";

const TILE_ICON: Record<TileClassSymbol, { src: string; alt: string; color: string }> = {
  SUPPORT: { src: "/Arcade%20Icon.png", alt: "Support", color: "#8b5cf6" },
  DAMAGE_DEALER: { src: "/Shooter%20Icon.png", alt: "Damage Dealer", color: "#ef4444" },
  TANK: { src: "/Racing%20Icon.png", alt: "Tank", color: "#14b8a6" },
};

const BOARD_LEGEND_SEEN_KEY = "battle-cards-board-legend-seen";

function hasSeenBoardLegend(): boolean {
  try {
    return window.localStorage.getItem(BOARD_LEGEND_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markBoardLegendSeen(): void {
  try {
    window.localStorage.setItem(BOARD_LEGEND_SEEN_KEY, "1");
  } catch {
    // localStorage kann in privaten Tabs fehlschlagen — kein Problem, nur Komfort.
  }
}

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
  initialSwaps,
  onConfirm,
  onProgress,
}: {
  grid: BoardGrid;
  moveBudget: number;
  disabled?: boolean;
  /** Bereits vor einem Reload bestätigte Swaps dieser Mini-Session (siehe
   *  saveBoardProgress/live-battle.ts) — wird beim Mounten gegen `grid`
   *  nachgespielt, damit ein Reload mitten im Zug den Fortschritt nicht
   *  verwirft. Die dabei entstehenden Kaskaden können optisch leicht von der
   *  ursprünglichen Session abweichen (neuer lokaler Vorschau-Seed), die
   *  Zug-Struktur (welche Swaps stattfanden) bleibt aber identisch. */
  initialSwaps?: SwapMove[];
  onConfirm: (swaps: SwapMove[]) => void;
  /** Fire-and-forget nach jedem bestätigten Swap — sichert den Fortschritt
   *  serverseitig, ohne auf eine Antwort zu warten (siehe saveBoardProgress). */
  onProgress?: (swaps: SwapMove[]) => void;
}) {
  // Rein lokaler Vorschau-Seed — muss NICHT mit dem serverseitigen rngState
  // übereinstimmen (der ist dem Client bewusst nicht bekannt, siehe Anti-Cheat-
  // Abschnitt im Plan). Nachrutschende Steine können daher optisch leicht von
  // der späteren Server-Berechnung abweichen, die tatsächliche Rage-Vergabe
  // ist davon unabhängig korrekt.
  const rngStateRef = useRef(randomSeed());
  const [board, setBoard] = useState<BoardGrid>(initialGrid);
  const [swaps, setSwaps] = useState<SwapMove[]>(initialSwaps ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidCell, setInvalidCell] = useState<number | null>(null);
  const [destroyingCells, setDestroyingCells] = useState<Set<number>>(new Set());
  const [fallingCells, setFallingCells] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState(false);
  // Legende (Symbol→Klasse + Community-Bonus) ist beim allerersten Brett eines
  // Users automatisch offen, danach per Klick auf das Info-Icon jederzeit
  // wieder aufrufbar — reines Komfort-/Onboarding-Feature, kein Blocker.
  const [legendOpen, setLegendOpen] = useState(() => !hasSeenBoardLegend());
  // Nur das ERSTE Brett eines Users poppt automatisch auf — merken, damit
  // spätere Bretter (auch nach einem Reload) nicht jedes Mal erneut aufklappen.
  // Weiterhin jederzeit per Info-Icon manuell erneut aufrufbar.
  useEffect(() => {
    markBoardLegendSeen();
  }, []);

  // Fortschritt aus einer vorherigen Session (vor einem Reload) einmalig gegen
  // das initiale Grid nachspielen, um den sichtbaren Board-Zustand wiederherzustellen.
  useEffect(() => {
    if (initialSwaps && initialSwaps.length > 0) {
      const result = resolveBoardSession(initialGrid, rngStateRef.current, initialSwaps, initialSwaps.length);
      setBoard(result.finalGrid);
      rngStateRef.current = result.finalRngState;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = moveBudget - swaps.length;
  const interactionLocked = disabled || remaining <= 0 || animating;

  async function playSteps(steps: BoardAnimationStep[]) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setDestroyingCells(new Set(step.matchedCells));
      playMatchSound(i);
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
      playInvalidSwapSound();
      setInvalidCell(cell);
      window.setTimeout(() => setInvalidCell(null), 300);
      return;
    }

    playSwapSound();
    if (result.rageGrants.some((g) => g.targetClass === "ALL")) {
      playCommunityBonusSound();
    }

    setAnimating(true);
    rngStateRef.current = result.finalRngState;
    const newSwaps = [...swaps, swap];
    setSwaps(newSwaps);
    onProgress?.(newSwaps);

    // Den Swap selbst sofort zeigen, bevor die Match-Runden abgespielt werden.
    const swappedBoard = [...board];
    swappedBoard[swap.fromCell] = board[swap.toCell];
    swappedBoard[swap.toCell] = board[swap.fromCell];
    setBoard(swappedBoard);
    await sleep(120);

    await playSteps(result.steps);
    setAnimating(false);

    // Kein "Zug bestätigen"-Button mehr — sobald das Zug-Budget aufgebraucht
    // ist, geht es automatisch weiter zur Aktions-Auswahl.
    if (newSwaps.length >= moveBudget) {
      onConfirm(newSwaps);
    }
  }

  function toggleLegend() {
    setLegendOpen((prev) => {
      const next = !prev;
      if (!next) markBoardLegendSeen();
      return next;
    });
  }

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest">
        <span className="flex items-center gap-1">
          Edelstein-Brett
          <button
            type="button"
            onClick={toggleLegend}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={legendOpen ? "Erklärung ausblenden" : "Wie funktioniert das Brett?"}
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </span>
        <span className="tabular-nums">{Math.max(0, remaining)} Züge übrig</span>
      </div>
      {legendOpen && (
        <>
          {/* Unsichtbarer Klick-außerhalb-Bereich schliesst die Legende, statt
              versehentlich einen Swap auf dem darunterliegenden Brett auszulösen —
              die Legende schwebt bewusst ALS OVERLAY über dem Brett (position
              absolute), statt es nach unten zu verdrängen (das ließ das feste
              212px-Panel in LiveBattleView zuvor intern scrollen). */}
          <div className="fixed inset-0 z-10" onClick={toggleLegend} />
          <div className="absolute top-5 left-0 right-0 z-20 rounded-lg bg-[#14171f] border border-white/10 px-2.5 py-2 space-y-1.5 text-[10px] text-gray-400 leading-snug shadow-xl">
            {(Object.keys(TILE_ICON) as TileClassSymbol[]).map((symbol) => {
              const icon = TILE_ICON[symbol];
              return (
                <div key={symbol} className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon.src} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                  <span>
                    3+ verbinden = Rage für alle <span style={{ color: icon.color }}>{icon.alt}</span>-Helden
                  </span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/5">
              <Users className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>5er-Match = Bonus-Rage fürs ganze Team. Volle Rage? Heldenkarte antippen für Ultimate — jederzeit.</span>
            </div>
          </div>
        </>
      )}
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
    </div>
  );
}
