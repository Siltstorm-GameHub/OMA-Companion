"use client";

// ============================================
// Match-3-Brett — "OMA Gems" (Puzzle-PvE-Modus)
// ============================================
// Interaktives Brett für den eigenen Zug: Tippen auf zwei benachbarte Kacheln
// versucht einen Swap. Ergibt der Swap kein Match, springt er sichtbar zurück
// (klassische Match-3-Konvention, verbraucht keinen Zug). Tippen auf einen
// bereits vorhandenen Sonder-Stein löst ihn STATTDESSEN direkt aus (kein
// zweiter Tap/Swap nötig) — orthogonal angrenzende Sonder-Steine werden
// automatisch mitausgelöst (siehe activateSpecial/resolveTapActivation in
// board-match3.ts). Beides verbraucht gleichermaßen einen Zug. Jeder gültige
// Swap/jede Aktivierung wird lokal SOFORT ausgewertet (resolveBoardSession,
// siehe board-match3.ts) — nur für Animation/Feedback, die tatsächlich
// gutgeschriebene Rage berechnet der Server autoritativ neu aus derselben
// Swap-Sequenz, sobald das Zug-Budget aufgebraucht ist und automatisch zur
// Aktions-Auswahl übergeben wird (Anti-Cheat, siehe live-battle.ts). Die drei
// Kachel-Symbole entsprechen den drei CardClass-Werten und nutzen die bereits
// vorhandenen Spielgenre-Icons (Arcade=Support, Shooter=Damage Dealer,
// Racing=Tank).
//
// Steuerung + Feeling (Empires-&-Puzzles-Stil): Steine lassen sich per Wischen/
// Ziehen in Richtung eines Nachbarn tauschen (Tippen-Tippen geht weiterhin).
// Jeder Stein hat eine stabile ID und wird absolut positioniert — dadurch
// tauschen Steine sichtbar die Plätze, rutschen bei der Schwerkraft echt nach
// unten und neue Steine fallen von oberhalb des Bretts herein (siehe advanceIds,
// das die Schwerkraft aus removeAndCascade in board-match3.ts 1:1 nachbildet).
// Nach einigen Sekunden Leerlauf zeigt ein pulsierender Hinweis einen gültigen
// Zug (findHintMove), ab der 2. Kaskade zählt ein Kombo-Label mit.
//
// Animation: resolveBoardSession liefert nicht nur das Endergebnis, sondern
// auch `steps` — einen Eintrag pro Match-Runde (direkter Match + jede weitere
// Kaskade). Das Brett spielt diese Schritte einzeln durch: erst kurz die
// getroffenen Kacheln "zerstören" (gem-destroy-Keyframe, globals.css), dann
// die nachgerückten/neu aufgefüllten Kacheln von oben "reinfallen" lassen
// (CSS-Transition auf transform, siehe fallingCells) — statt nur stumpf das
// Endergebnis einzublenden.

import MobaIcon from "./MobaIcon";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { UnitClass } from "@/lib/battle-engine/types";
import {
  findHintMove,
  resolveBoardSession,
  type BoardAnimationStep,
  type BoardGrid,
  type SpecialGemKind,
  type SpecialGrid,
  type SwapMove,
  type TileClassSymbol,
} from "@/lib/battle-engine/board-match3";
import { BOARD_COLS, BOARD_ROWS } from "@/lib/battle-engine/constants";
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

const DESTROY_ANIM_MS = 240;
const FALL_ANIM_MS = 340;
const SWAP_ANIM_MS = 200;
/** Leerlauf, nach dem ein Zug-Hinweis erscheint. */
const HINT_DELAY_MS = 6000;
const CELL_COUNT = BOARD_ROWS * BOARD_COLS;

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

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Schwerkraft auf Stein-IDs: entfernte Zellen verschwinden, die Überlebenden
 *  je Spalte rutschen nach unten (Reihenfolge bleibt), oben kommen neue IDs
 *  hinzu — exakt dieselbe Logik wie removeAndCascade in board-match3.ts.
 *  `entering` liefert je neuer ID, wie viele Reihen sie oberhalb ihrer Zielzelle
 *  starten muss (= Anzahl neuer Steine in der Spalte). */
function advanceIds(
  ids: number[],
  matched: Set<number>,
  newId: () => number
): { ids: number[]; entering: Map<number, number> } {
  const next: number[] = new Array(CELL_COUNT);
  const entering = new Map<number, number>();
  for (let col = 0; col < BOARD_COLS; col++) {
    const survivors: number[] = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      const cell = row * BOARD_COLS + col;
      if (!matched.has(cell)) survivors.push(ids[cell]);
    }
    const missing = BOARD_ROWS - survivors.length;
    const column: number[] = [];
    for (let i = 0; i < missing; i++) {
      const id = newId();
      entering.set(id, missing);
      column.push(id);
    }
    column.push(...survivors);
    for (let row = 0; row < BOARD_ROWS; row++) next[row * BOARD_COLS + col] = column[row];
  }
  return { ids: next, entering };
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
  const idCounterRef = useRef(CELL_COUNT); // 0..CELL_COUNT-1 sind die Start-IDs
  const newId = () => idCounterRef.current++;
  const freshIds = () => Array.from({ length: CELL_COUNT }, () => newId());
  // Bildschirm-Positionen der Steine (nach Stein-ID) — für den Lichtstrahl-Effekt
  // (onGemsDestroyed) gebraucht. Reine DOM-Refs, keine Neu-Renders.
  const tileElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const boardElRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ cell: number; x: number; y: number; done: boolean } | null>(null);
  const [board, setBoard] = useState<BoardGrid>(initialGrid);
  const [specials, setSpecials] = useState<SpecialGrid>(initialSpecials);
  const [ids, setIds] = useState<number[]>(() => Array.from({ length: CELL_COUNT }, (_, i) => i));
  // Neu hereinfallende Steine: ID -> Start-Versatz in Reihen oberhalb der Zielzelle.
  const [entering, setEntering] = useState<Map<number, number>>(new Map());
  const [swaps, setSwaps] = useState<SwapMove[]>(initialSwaps ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidCell, setInvalidCell] = useState<number | null>(null);
  const [destroyingIds, setDestroyingIds] = useState<Set<number>>(new Set());
  // Match-4/5 (bzw. jede Kaskaden-Runde ab 4 Steinen) ODER das Auslösen eines
  // bereits vorhandenen Sonder-Steins bekommt einen sichtbar größeren
  // Zerstören-Effekt + eigenen Sound statt optisch genauso auszusehen wie ein
  // normaler 3er-Match — vorher kaum zu unterscheiden.
  const [bigMatchIds, setBigMatchIds] = useState<Set<number>>(new Set());
  const [comboLabel, setComboLabel] = useState<{ text: string; key: number } | null>(null);
  // Steine, auf denen GERADE ein neuer Sonder-Stein entstanden ist — kurzes
  // "Aufladen" (gem-special-spawn, globals.css) statt kommentarlosem Erscheinen.
  const [spawningIds, setSpawningIds] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState(false);
  const [hint, setHint] = useState<SwapMove | null>(null);
  // Legende (Symbol→Klasse + Community-Bonus) ist beim allerersten Brett eines
  // Users automatisch offen, danach per Klick auf das Info-Icon jederzeit
  // wieder aufrufbar — reines Komfort-/Onboarding-Feature, kein Blocker.
  const [legendOpen, setLegendOpen] = useState(() => !hasSeenBoardLegend());
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
    setIds(freshIds());
    setEntering(new Map());
    setSwaps(initialSwaps ?? []);
    setSelected(null);
    setInvalidCell(null);
    setDestroyingIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  const remaining = moveBudget - swaps.length;
  const interactionLocked = disabled || remaining <= 0 || animating;

  // Idle-Hinweis: nur am eigenen, entsperrten Brett; jede Brett-Änderung,
  // Auswahl oder Sperre setzt den Timer zurück und blendet den Hinweis aus.
  useEffect(() => {
    if (interactionLocked) return;
    const timer = window.setTimeout(() => setHint(findHintMove(board, specials)), HINT_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setHint(null);
    };
  }, [board, specials, interactionLocked, selected]);

  async function playSteps(steps: BoardAnimationStep[], startGrid: BoardGrid, startIds: number[]) {
    let curGrid = startGrid;
    let curIds = startIds;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Das Kombo-Label zeigt bei Sonder-Stein-Ereignissen (welche Reihen-/
      // Spaltenlänge WIRKLICH ein einzelnes Match hatte) den Sonder-Stein-Text,
      // sonst ab der 2. Kaskaden-Runde einen mitzählenden Kombo-Zähler. Ein
      // bereits vorhandener, jetzt ausgelöster Sonder-Stein zählt als "groß".
      const createdKinds = new Set(step.specialsCreated.map((s) => s.kind));
      const isBig = createdKinds.size > 0 || step.specialsActivated.length > 0;
      const matchedIds = step.matchedCells.map((cell) => curIds[cell]);
      setDestroyingIds(new Set(matchedIds));
      let labelText: string | null = null;
      if (isBig) {
        setBigMatchIds(new Set([...matchedIds, ...step.specialsActivated.map((cell) => curIds[cell])]));
        labelText = createdKinds.has("COLOR_BOMB")
          ? "FARBBOMBE!"
          : createdKinds.has("AREA")
            ? "5ER-KOMBO!"
            : createdKinds.has("LINE_H") || createdKinds.has("LINE_V")
              ? "4ER-KOMBO!"
              : "SONDER-STEIN AUSGELÖST!";
        playCommunityBonusSound();
      } else {
        playMatchSound(i);
      }
      if (i >= 1) labelText = labelText ? `${labelText} · x${i + 1}` : `KOMBO x${i + 1}`;
      if (labelText) {
        setComboLabel({ text: labelText, key: Date.now() });
        window.setTimeout(() => setComboLabel(null), DESTROY_ANIM_MS + 450);
      }

      if (onGemsDestroyed) {
        // Klasse pro zerstörter Zelle kommt aus dem Grid VOR dieser Runde.
        const rectsByClass = new Map<UnitClass, DOMRect[]>();
        step.matchedCells.forEach((cell, idx) => {
          const el = tileElementsRef.current.get(matchedIds[idx]);
          if (!el) return;
          const cls = curGrid[cell];
          const list = rectsByClass.get(cls) ?? [];
          list.push(el.getBoundingClientRect());
          rectsByClass.set(cls, list);
        });
        if (rectsByClass.size > 0) {
          onGemsDestroyed([...rectsByClass.entries()].map(([cls, rects]) => ({ cls, rects })));
        }
      }

      await sleep(DESTROY_ANIM_MS);

      const advanced = advanceIds(curIds, new Set(step.matchedCells), newId);
      curIds = advanced.ids;
      curGrid = step.gridAfter;
      // Neue Steine starten oberhalb des Bretts, überlebende behalten ihre ID und
      // gleiten per CSS-Transition auf ihre neue (tiefere) Zelle.
      setEntering(advanced.entering);
      setIds(curIds);
      setBoard(step.gridAfter);
      setSpecials(step.specialsAfter);
      setDestroyingIds(new Set());
      setBigMatchIds(new Set());
      if (step.specialsCreated.length > 0) {
        setSpawningIds(new Set(step.specialsCreated.map((s) => curIds[s.cell])));
        window.setTimeout(() => setSpawningIds(new Set()), 400);
      }
      // Zwei Frames mit der "angehobenen" Startposition rendern lassen, bevor
      // die Ziel-Position gesetzt wird — sonst läuft die CSS-Transition ins Leere.
      await nextFrame();
      await nextFrame();
      setEntering(new Map());
      await sleep(FALL_ANIM_MS);
    }
  }

  /** Gemeinsamer Abschluss für Swap UND Tap-Aktivierung: Zug-Budget fortschreiben,
   *  Fortschritt sichern, Animations-Schritte abspielen, ggf. Zug beenden. */
  async function commitMove(
    move: SwapMove,
    result: ReturnType<typeof resolveBoardSession>,
    startGrid: BoardGrid,
    startIds: number[]
  ) {
    playSwapSound();
    if (result.rageGrants.some((g) => g.targetClass === "ALL")) {
      playCommunityBonusSound();
    }

    setAnimating(true);
    rngStateRef.current = result.finalRngState;
    const newSwaps = [...swaps, move];
    setSwaps(newSwaps);
    onProgress?.(newSwaps);

    await playSteps(result.steps, startGrid, startIds);
    setAnimating(false);

    // Kein "Zug bestätigen"-Button mehr — sobald das Zug-Budget aufgebraucht
    // ist, geht es automatisch weiter zur Aktions-Auswahl.
    if (newSwaps.length >= moveBudget) {
      onConfirm(newSwaps);
    }
  }

  async function performSwap(fromCell: number, toCell: number) {
    const swap: SwapMove = { fromCell, toCell };
    const result = resolveBoardSession(board, specials, rngStateRef.current, [swap], 1);
    setSelected(null);
    // Sperrt die Interaktion schon während der reinen Swap-Animation, nicht
    // erst ab commitMove — sonst könnte ein zweiter Tap mitten in der
    // Bewegung einen weiteren Swap auslösen.
    setAnimating(true);

    // Steine tauschen sichtbar die Plätze (stabile IDs, Transition auf transform),
    // noch bevor feststeht, ob der Swap ein Match ergibt.
    const swappedBoard = [...board];
    swappedBoard[fromCell] = board[toCell];
    swappedBoard[toCell] = board[fromCell];
    const swappedSpecials = [...specials];
    swappedSpecials[fromCell] = specials[toCell];
    swappedSpecials[toCell] = specials[fromCell];
    const swappedIds = [...ids];
    swappedIds[fromCell] = ids[toCell];
    swappedIds[toCell] = ids[fromCell];
    setBoard(swappedBoard);
    setSpecials(swappedSpecials);
    setIds(swappedIds);
    await sleep(SWAP_ANIM_MS);

    if (result.matchedSwaps === 0) {
      // Kein Match: beide Steine federn sichtbar zurück, kein Zug verbraucht.
      playInvalidSwapSound();
      setBoard(board);
      setSpecials(specials);
      setIds(ids);
      setInvalidCell(toCell);
      await sleep(SWAP_ANIM_MS);
      setAnimating(false);
      window.setTimeout(() => setInvalidCell(null), 300);
      return;
    }

    await commitMove(swap, result, swappedBoard, swappedIds);
  }

  /** Tap-Aktivierung: ein Sonder-Stein wird direkt ausgelöst (kein Swap nötig,
   *  siehe SwapMove-Kommentar in board-match3.ts: fromCell === toCell). Orthogonal
   *  angrenzende Sonder-Steine werden automatisch mitausgelöst. Verbraucht wie ein
   *  normaler Swap einen Zug — es gibt hier bewusst nichts vorab zu "zeigen"
   *  (nichts bewegt sich), es geht direkt in die Zerstören-Animation. */
  async function activateSpecial(cell: number) {
    const tap: SwapMove = { fromCell: cell, toCell: cell };
    const result = resolveBoardSession(board, specials, rngStateRef.current, [tap], 1);

    if (result.matchedSwaps === 0) return; // sollte durch die specials[cell]-Prüfung im Aufrufer nie passieren

    await commitMove(tap, result, board, ids);
  }

  async function handleTap(cell: number) {
    if (interactionLocked) return;

    if (selected !== null && selected !== cell && areAdjacent(selected, cell)) {
      await performSwap(selected, cell);
      return;
    }
    if (selected === cell) {
      setSelected(null);
      return;
    }
    // Ein Sonder-Stein wird per Tap IMMER direkt aktiviert, statt ihn nur
    // auszuwählen — unabhängig davon, ob vorher schon eine andere (nicht
    // angrenzende) Zelle ausgewählt war.
    if (specials[cell]) {
      setSelected(null);
      await activateSpecial(cell);
      return;
    }
    setSelected(cell);
  }

  // Wischen/Ziehen: ab ~35 % Kachelgröße Bewegung wird die dominante Richtung
  // zum Nachbarn getauscht; ohne nennenswerte Bewegung gilt es als Tippen.
  function handlePointerDown(e: React.PointerEvent, cell: number) {
    if (interactionLocked) return;
    dragRef.current = { cell, x: e.clientX, y: e.clientY, done: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer-Capture ist nur Komfort.
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.done || interactionLocked) return;
    const boardWidth = boardElRef.current?.getBoundingClientRect().width ?? 300;
    const threshold = (boardWidth / BOARD_COLS) * 0.35;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
    drag.done = true;
    const row = Math.floor(drag.cell / BOARD_COLS);
    const col = drag.cell % BOARD_COLS;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const targetRow = horizontal ? row : row + (dy > 0 ? 1 : -1);
    const targetCol = horizontal ? col + (dx > 0 ? 1 : -1) : col;
    if (targetRow < 0 || targetRow >= BOARD_ROWS || targetCol < 0 || targetCol >= BOARD_COLS) return;
    void performSwap(drag.cell, targetRow * BOARD_COLS + targetCol);
  }

  function handlePointerUp(cell: number) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.done && drag.cell === cell) void handleTap(cell);
  }

  function toggleLegend() {
    setLegendOpen((prev) => {
      const next = !prev;
      if (!next) markBoardLegendSeen();
      return next;
    });
  }

  // Stabile DOM-Reihenfolge nach ID (nicht nach Zelle) — sonst würde React beim
  // Umsortieren Knoten verschieben und laufende CSS-Transitions/Animationen
  // abbrechen.
  const renderOrder = Array.from({ length: CELL_COUNT }, (_, cell) => cell).sort((a, b) => ids[a] - ids[b]);
  const hintCells = new Set(hint ? [hint.fromCell, hint.toCell] : []);

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
            <MobaIcon name="help" className="w-3 h-3" />
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
              absolute), statt es nach unten zu verdrängen. */}
          <div className="fixed inset-0 z-10" onClick={toggleLegend} />
          <div className="absolute top-5 left-0 right-0 z-20 rounded-lg bg-[#04061a] border border-[color:var(--moba-accent-line)] px-2.5 py-2 space-y-1.5 text-[10px] text-gray-400 leading-snug shadow-xl">
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
              <MobaIcon name="friends" className="w-3.5 h-3.5 shrink-0" />
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
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPECIAL_ICON.AREA.src} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span>Steine zum Tauschen ziehen oder nacheinander antippen. Sonder-Stein antippen = sofort auslösen, angrenzende zünden mit.</span>
            </div>
          </div>
        </>
      )}
      {/* Kombo-Label — macht Größenunterschiede zum normalen 3er-Match und
          Kaskaden-Ketten auch sprachlich sichtbar. */}
      <AnimatePresence>
        {comboLabel && (
          <motion.div
            key={comboLabel.key}
            className="absolute left-1/2 top-1/2 z-30 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: (DESTROY_ANIM_MS + 450) / 1000, times: [0, 0.25, 0.75, 1] }}
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
      {/* Brett-Rahmen im Stil von Empires & Puzzles: dunkle Holz-Platte mit
          leicht abgesetzten Feldern; Steine sitzen absolut darüber und werden
          oben abgeschnitten, damit sie "von außerhalb" hereinfallen. */}
      <div
        className="mx-auto w-full max-w-[400px] lg:max-w-[480px] rounded-xl p-1"
        style={{
          background: "linear-gradient(180deg, #2a1a12 0%, #1a100b 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <div
          ref={boardElRef}
          className="relative w-full overflow-hidden rounded-lg select-none"
          style={{ aspectRatio: `${BOARD_COLS} / ${BOARD_ROWS}`, touchAction: "none" }}
        >
          <div
            className="absolute inset-0 grid pointer-events-none"
            style={{
              gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BOARD_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: CELL_COUNT }, (_, cell) => (
              <div key={cell} className="p-[2px]">
                <div className="w-full h-full rounded-md bg-black/25" />
              </div>
            ))}
          </div>
          {renderOrder.map((cell) => {
            const id = ids[cell];
            const symbol = board[cell];
            const classIcon = TILE_ICON[symbol];
            const special = specials[cell];
            // COLOR_BOMB behält bewusst das Klassen-Icon (siehe SPECIAL_ICON-Kommentar
            // oben) — LINE_H/LINE_V/AREA zeigen stattdessen ihr eigenes Sonder-Icon.
            const icon = special && special !== "COLOR_BOMB" ? SPECIAL_ICON[special] : classIcon;
            const isSelected = selected === cell;
            const isInvalid = invalidCell === cell;
            const isDestroying = destroyingIds.has(id);
            const isBigMatch = bigMatchIds.has(id);
            const isSpawning = spawningIds.has(id);
            const isHint = hintCells.has(cell);
            const row = Math.floor(cell / BOARD_COLS);
            const col = cell % BOARD_COLS;
            const rowOffset = entering.get(id) ?? 0;
            return (
              <div
                key={id}
                ref={(el) => {
                  if (el) tileElementsRef.current.set(id, el);
                  else tileElementsRef.current.delete(id);
                }}
                className="absolute top-0 left-0 p-[2px]"
                style={{
                  width: `${100 / BOARD_COLS}%`,
                  height: `${100 / BOARD_ROWS}%`,
                  transform: `translate(${col * 100}%, ${(row - rowOffset) * 100}%)`,
                  // Kein Übergang beim Spawnen oberhalb des Bretts — nur bei der
                  // Bewegung auf die Zielzelle (leichter Überschwinger = "Landen").
                  transition:
                    rowOffset > 0 ? "none" : `transform ${FALL_ANIM_MS}ms cubic-bezier(0.34, 1.2, 0.64, 1)`,
                  zIndex: isSelected || isDestroying ? 5 : 1,
                }}
              >
                <button
                  type="button"
                  disabled={interactionLocked}
                  onPointerDown={(e) => handlePointerDown(e, cell)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={() => handlePointerUp(cell)}
                  onPointerCancel={() => {
                    dragRef.current = null;
                  }}
                  onClick={(e) => {
                    // Maus/Touch laufen über die Pointer-Events (Tippen + Ziehen);
                    // click mit detail 0 ist die Tastatur-Aktivierung.
                    if (e.detail === 0) void handleTap(cell);
                  }}
                  className={`relative w-full h-full rounded-lg flex items-center justify-center transition-[transform,box-shadow] duration-150 active:scale-95 disabled:opacity-60 ${
                    isDestroying ? (isBigMatch ? "gem-destroy-big" : "gem-destroy") : ""
                  } ${isInvalid ? "hit-shake" : ""} ${
                    special === "COLOR_BOMB" ? "gem-bomb" : special ? "gem-special" : ""
                  } ${isSpawning ? "gem-special-spawn" : ""} ${isHint && !isDestroying ? "gem-hint" : ""}`}
                  style={
                    {
                      // "Gem"-Look statt flacher Fläche: heller Glanzpunkt oben links,
                      // dunklerer Rand unten (Bevel) — rein über CSS.
                      background: `radial-gradient(circle at 32% 26%, ${classIcon.color}66 0%, ${classIcon.color}30 45%, ${classIcon.color}14 100%)`,
                      transform: `scale(${isSelected ? 1.1 : 1})`,
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
                  {/* Glanzpunkt — ein weicher heller Fleck oben links verkauft das
                      Glas-Highlight. Rein dekorativ, pointer-events aus. */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse 55% 35% at 30% 18%, rgba(255,255,255,0.35), transparent 70%)",
                    }}
                  />
                  <div className="w-3/4 h-3/4 flex items-center justify-center pointer-events-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={icon.src}
                      alt={icon.alt}
                      draggable={false}
                      className="w-full h-full object-contain"
                      style={{ filter: "drop-shadow(0 1.5px 2px rgba(0,0,0,0.55))" }}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
