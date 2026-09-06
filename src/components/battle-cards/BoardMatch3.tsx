"use client";

// ============================================
// Match-3-Brett — "OMA Gems" (Puzzle-PvE-Modus)
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
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { UnitClass } from "@/lib/battle-engine/types";
import {
  resolveBoardSession,
  type BoardAnimationStep,
  type BoardGrid,
  type SpecialGemKind,
  type SpecialGrid,
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

/** Sonder-Stein-Icons (siehe SpecialGemKind in board-match3.ts) — LINE_H/LINE_V
 *  (4er-Reihe) nutzen das Community-Icon, AREA (5er-Reihe) das Win-Icon,
 *  jeweils STATT des Klassen-Icons, damit ein Sonder-Stein auf den ersten
 *  Blick als "kein normaler Stein" erkennbar ist (zusätzlich zum pulsierenden
 *  Glow, siehe .gem-special in globals.css). COLOR_BOMB behält bewusst das
 *  Klassen-Icon (repräsentiert die Klasse, die sie beim Auslösen komplett vom
 *  Brett räumt) und hebt sich stattdessen über den mehrfarbigen, rotierenden
 *  Rand ab (siehe .gem-bomb in globals.css). */
const SPECIAL_ICON: Record<Exclude<SpecialGemKind, "COLOR_BOMB">, { src: string; alt: string; color: string }> = {
  LINE_H: { src: "/Community%20Icon.png", alt: "Linien-Bombe (Reihe)", color: "#fde68a" },
  LINE_V: { src: "/Community%20Icon.png", alt: "Linien-Bombe (Spalte)", color: "#fde68a" },
  AREA: { src: "/Win%20Icon.png", alt: "Flächen-Bombe", color: "#38bdf8" },
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
  specials: initialSpecials,
  moveBudget,
  disabled,
  initialSwaps,
  turnId,
  onConfirm,
  onProgress,
  onGemsDestroyed,
}: {
  grid: BoardGrid;
  /** Sonder-Steine (siehe SpecialGemKind) — parallel zu `grid`. */
  specials: SpecialGrid;
  moveBudget: number;
  disabled?: boolean;
  /** Bereits vor einem Reload bestätigte Swaps dieser Mini-Session (siehe
   *  saveBoardProgress/live-battle.ts) — wird beim Mounten gegen `grid`
   *  nachgespielt, damit ein Reload mitten im Zug den Fortschritt nicht
   *  verwirft. Die dabei entstehenden Kaskaden können optisch leicht von der
   *  ursprünglichen Session abweichen (neuer lokaler Vorschau-Seed), die
   *  Zug-Struktur (welche Swaps stattfanden) bleibt aber identisch. */
  initialSwaps?: SwapMove[];
  /** Eindeutige Kennung des aktuellen Zugs (z.B. die wartende Einheit-ID) —
   *  wechselt serverseitig bei jedem neuen Zug. Steuert NUR den internen
   *  Reset unten (frisches Grid vom Server übernehmen, Zug-Budget/Auswahl
   *  zurücksetzen) — bewusst KEIN React-`key` am Aufrufer: Ein Remount pro Zug
   *  ließ das (serverseitig persistente, siehe interactive.ts boardGrid)
   *  Brett zuvor bei jedem eigenen Zug sichtbar "neu aufpoppen", obwohl es
   *  inhaltlich unverändert weiterlief — bei OMA Gems pausiert die Zugreihenfolge
   *  einzeln pro eigenem Helden, nicht einmal pro Team-Runde, das Brett soll
   *  aber über den gesamten Kampf optisch durchgängig bestehen bleiben. */
  turnId?: string;
  onConfirm: (swaps: SwapMove[]) => void;
  /** Fire-and-forget nach jedem bestätigten Swap — sichert den Fortschritt
   *  serverseitig, ohne auf eine Antwort zu warten (siehe saveBoardProgress). */
  onProgress?: (swaps: SwapMove[]) => void;
  /** Feuert für jeden Animations-Schritt (siehe playSteps), sobald die
   *  getroffenen Steine sichtbar zerstört werden — gruppiert nach Klasse, mit
   *  den Bildschirm-Positionen der zerstörten Zellen. LiveBattleView nutzt das,
   *  um einen Lichtstrahl von den zerstörten Steinen zu den Helden der
   *  entsprechenden Klasse zu animieren (siehe dortiges handleGemsDestroyed). */
  onGemsDestroyed?: (groups: { cls: UnitClass; rects: DOMRect[] }[]) => void;
}) {
  // Rein lokaler Vorschau-Seed — muss NICHT mit dem serverseitigen rngState
  // übereinstimmen (der ist dem Client bewusst nicht bekannt, siehe Anti-Cheat-
  // Abschnitt im Plan). Nachrutschende Steine können daher optisch leicht von
  // der späteren Server-Berechnung abweichen, die tatsächliche Rage-Vergabe
  // ist davon unabhängig korrekt.
  const rngStateRef = useRef(randomSeed());
  // Bildschirm-Positionen der Zell-Buttons — für den Lichtstrahl-Effekt
  // (onGemsDestroyed) gebraucht, um zu wissen, WOHER die zerstörten Steine
  // optisch starten. Reine DOM-Refs, keine Neu-Renders.
  const cellElementsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [board, setBoard] = useState<BoardGrid>(initialGrid);
  const [specials, setSpecials] = useState<SpecialGrid>(initialSpecials);
  const [swaps, setSwaps] = useState<SwapMove[]>(initialSwaps ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidCell, setInvalidCell] = useState<number | null>(null);
  const [destroyingCells, setDestroyingCells] = useState<Set<number>>(new Set());
  // Match-4/5 (bzw. jede Kaskaden-Runde ab 4 Steinen) ODER das Auslösen eines
  // bereits vorhandenen Sonder-Steins bekommt einen sichtbar größeren
  // Zerstören-Effekt + eigenen Sound statt optisch genauso auszusehen wie ein
  // normaler 3er-Match — vorher kaum zu unterscheiden.
  const [bigMatchCells, setBigMatchCells] = useState<Set<number>>(new Set());
  const [comboLabel, setComboLabel] = useState<{ text: string; key: number } | null>(null);
  // Zellen, auf denen GERADE ein neuer Sonder-Stein entstanden ist — kurzes
  // "Aufladen" (gem-special-spawn, globals.css) statt kommentarlosem Erscheinen.
  const [spawningCells, setSpawningCells] = useState<Set<number>>(new Set());
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

  // Läuft NUR, wenn `turnId` sich ändert (ein wirklich neuer Zug beginnt) —
  // NICHT bei jedem Server-Poll (das würde eine laufende Interaktion/Animation
  // mitten im Zug unterbrechen, da jede Snapshot-Antwort ein frisches Grid-
  // Array liefert, auch wenn sich am Zug nichts geändert hat). Übernimmt das
  // vom Server gelieferte Grid 1:1 (Normalfall: initialSwaps leer) bzw. spielt
  // bei einem Reload mitten im Zug die bereits bestätigten Swaps dagegen nach,
  // und setzt den restlichen Zug-UI-Zustand für den neuen Zug zurück.
  useEffect(() => {
    if (initialSwaps && initialSwaps.length > 0) {
      const result = resolveBoardSession(initialGrid, initialSpecials, rngStateRef.current, initialSwaps, initialSwaps.length);
      setBoard(result.finalGrid);
      setSpecials(result.finalSpecials);
      rngStateRef.current = result.finalRngState;
    } else {
      setBoard(initialGrid);
      setSpecials(initialSpecials);
    }
    setSwaps(initialSwaps ?? []);
    setSelected(null);
    setInvalidCell(null);
    setDestroyingCells(new Set());
    setFallingCells(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  const remaining = moveBudget - swaps.length;
  const interactionLocked = disabled || remaining <= 0 || animating;

  async function playSteps(steps: BoardAnimationStep[]) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Das Kombo-Label zeigt NUR noch echte Sonder-Stein-Ereignisse an (welche
      // Reihen-/Spaltenlänge WIRKLICH ein einzelnes Match hatte) statt der
      // Summe aller gleichzeitig getroffenen Zellen dieser Runde — Letzteres
      // täuschte zuvor "6er"/"10er"-Kombos vor, obwohl z.B. zwei getrennte
      // 3er-Matches gleichzeitig aufgelöst wurden (siehe SPECIAL_GEM_*-
      // Konstanten in constants.ts). Ein bereits vorhandener, jetzt
      // ausgelöster Sonder-Stein zählt ebenfalls als "groß", auch wenn er für
      // sich nur eine einzelne Zelle war.
      const createdKinds = new Set(step.specialsCreated.map((s) => s.kind));
      const isBig = createdKinds.size > 0 || step.specialsActivated.length > 0;
      setDestroyingCells(new Set(step.matchedCells));
      if (isBig) {
        setBigMatchCells(new Set([...step.matchedCells, ...step.specialsActivated]));
        const text = createdKinds.has("COLOR_BOMB")
          ? "FARBBOMBE!"
          : createdKinds.has("AREA")
            ? "5ER-KOMBO!"
            : createdKinds.has("LINE_H") || createdKinds.has("LINE_V")
              ? "4ER-KOMBO!"
              : "SONDER-STEIN AUSGELÖST!";
        setComboLabel({ text, key: Date.now() });
        playCommunityBonusSound();
        window.setTimeout(() => setComboLabel(null), DESTROY_ANIM_MS + 350);
      } else {
        playMatchSound(i);
      }

      if (onGemsDestroyed) {
        // Klasse pro zerstörter Zelle kommt aus `board` (dem Zustand VOR dieser
        // Runde) — step.gridAfter enthält bereits die nachgerückten/neuen Steine.
        const rectsByClass = new Map<UnitClass, DOMRect[]>();
        for (const cell of step.matchedCells) {
          const cls = board[cell];
          const el = cellElementsRef.current.get(cell);
          if (!el) continue;
          const list = rectsByClass.get(cls) ?? [];
          list.push(el.getBoundingClientRect());
          rectsByClass.set(cls, list);
        }
        if (rectsByClass.size > 0) {
          onGemsDestroyed([...rectsByClass.entries()].map(([cls, rects]) => ({ cls, rects })));
        }
      }

      await sleep(DESTROY_ANIM_MS);

      setBoard(step.gridAfter);
      setSpecials(step.specialsAfter);
      setFallingCells(computeFallingCells(step.matchedCells));
      setDestroyingCells(new Set());
      setBigMatchCells(new Set());
      if (step.specialsCreated.length > 0) {
        const spawnCells = new Set(step.specialsCreated.map((s) => s.cell));
        setSpawningCells(spawnCells);
        window.setTimeout(() => setSpawningCells(new Set()), 400);
      }
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
    const result = resolveBoardSession(board, specials, rngStateRef.current, [swap], 1);
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
    const swappedSpecials = [...specials];
    swappedSpecials[swap.fromCell] = specials[swap.toCell];
    swappedSpecials[swap.toCell] = specials[swap.fromCell];
    setSpecials(swappedSpecials);
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
          OMA Gems
          <button
            type="button"
            onClick={toggleLegend}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={legendOpen ? "Erklärung ausblenden" : "Wie funktioniert das Brett?"}
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </span>
        {/* Jeder erfolgreiche Swap löst sofort Rage + Angriff aus (siehe
            BOARD_MOVE_BUDGET_PER_TURN=1) — kein Zug-Budget-Zähler mehr nötig,
            das Brett sperrt sich nach dem Swap nur ganz kurz bis zum Nachladen. */}
        {interactionLocked && <span className="text-teal-300">Angriff läuft …</span>}
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
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPECIAL_ICON.LINE_H.src} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span>4er-Reihe = Bombe (räumt die ganze Reihe/Spalte), 5er-Reihe = Bombe (räumt 3x3 um sich herum)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 shrink-0 rounded-full gem-bomb" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span>10+ Steine in einer Runde = Farbbombe (räumt eine ganze Klasse vom Brett)</span>
            </div>
          </div>
        </>
      )}
      {/* Match-4/5-Kombo-Label — macht den Größenunterschied zum normalen 3er-
          Match auch sprachlich sichtbar, nicht nur über den größeren
          Zerstören-Effekt (gem-destroy-big) und den Bonus-Sound. */}
      <AnimatePresence>
        {comboLabel && (
          <motion.div
            key={comboLabel.key}
            className="absolute left-1/2 top-1/2 z-30 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: (DESTROY_ANIM_MS + 350) / 1000, times: [0, 0.25, 0.75, 1] }}
          >
            <p
              className="font-battle text-2xl uppercase tracking-wide whitespace-nowrap"
              style={{
                color: "#fde68a",
                textShadow: "0 0 12px rgba(245,158,11,0.9), 0 0 28px rgba(245,158,11,0.6), 0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {comboLabel.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="grid gap-1 lg:gap-1.5 mx-auto w-full max-w-[320px] lg:max-w-[420px]"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))` }}
      >
        {board.map((symbol, cell) => {
          const classIcon = TILE_ICON[symbol];
          const special = specials[cell];
          // COLOR_BOMB behält bewusst das Klassen-Icon (siehe SPECIAL_ICON-Kommentar
          // oben) — LINE_H/LINE_V/AREA zeigen stattdessen ihr eigenes Sonder-Icon.
          const icon = special && special !== "COLOR_BOMB" ? SPECIAL_ICON[special] : classIcon;
          const isSelected = selected === cell;
          const isInvalid = invalidCell === cell;
          const isDestroying = destroyingCells.has(cell);
          const isBigMatch = bigMatchCells.has(cell);
          const isFalling = fallingCells.has(cell);
          const isSpawning = spawningCells.has(cell);
          return (
            <button
              key={cell}
              ref={(el) => {
                if (el) cellElementsRef.current.set(cell, el);
                else cellElementsRef.current.delete(cell);
              }}
              type="button"
              disabled={interactionLocked}
              onClick={() => handleTap(cell)}
              className={`relative aspect-square rounded-lg flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60 ${
                isDestroying ? (isBigMatch ? "gem-destroy-big" : "gem-destroy") : ""
              } ${isInvalid ? "hit-shake" : ""} ${
                special === "COLOR_BOMB" ? "gem-bomb" : special ? "gem-special" : ""
              } ${isSpawning ? "gem-special-spawn" : ""}`}
              style={
                {
                  // "Gem"-Look statt flacher Fläche: heller Glanzpunkt oben links,
                  // dunklerer Rand unten (Bevel) — ersetzt eine spätere PNG-Bake
                  // (Canva o.ä.), solange dafür kein Zugriff besteht, rein über CSS.
                  background: `radial-gradient(circle at 32% 26%, ${classIcon.color}66 0%, ${classIcon.color}30 45%, ${classIcon.color}14 100%)`,
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  transition: "transform 150ms ease-out, box-shadow 150ms ease-out",
                  boxShadow: [
                    isInvalid
                      ? "0 0 0 2px #f43f5e, 0 0 10px rgba(244,63,94,0.6)"
                      : isSelected
                        ? `0 0 0 2px ${classIcon.color}, 0 0 14px ${classIcon.color}99`
                        : "0 0 0 1px rgba(255,255,255,0.06)",
                    "inset 0 1.5px 0 rgba(255,255,255,0.3)",
                    "inset 0 -3px 4px rgba(0,0,0,0.4)",
                  ].join(", "),
                  ...(special && special !== "COLOR_BOMB" ? { "--special-color": icon.color } : {}),
                } as CSSProperties
              }
            >
              {/* Glanzpunkt — statischer Bevel-Look reicht nicht als "Glas"-Eindruck,
                  ein weicher heller Fleck oben links verkauft das Highlight erst
                  wirklich. Rein dekorativ, pointer-events aus. */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 55% 35% at 30% 18%, rgba(255,255,255,0.35), transparent 70%)",
                }}
              />
              <div
                className="w-3/4 h-3/4 flex items-center justify-center"
                style={{
                  transform: isFalling ? "translateY(-14px)" : "translateY(0)",
                  opacity: isFalling ? 0.55 : 1,
                  transition: `transform ${FALL_ANIM_MS}ms ease-out, opacity ${FALL_ANIM_MS}ms ease-out`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={icon.src}
                  alt={icon.alt}
                  className="w-full h-full object-contain"
                  style={{ filter: "drop-shadow(0 1.5px 2px rgba(0,0,0,0.55))" }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
