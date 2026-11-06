"use client";
// ============================================
// OMA Gems — eine Runde spielen (klassisch oder Tages-Herausforderung)
// ============================================
// Ablauf: Start → Server vergibt Seed (/api/gems/runs) → spielen → bei Spielende (oder „Beenden“) werden die Züge
// eingereicht (/api/gems/runs/[id]); der Server spielt nach und wertet. Der Spielstand (Run-ID, Seed, Züge inkl.
// Joker) liegt nach jedem Zug im localStorage — wer die Seite schließt oder neu lädt, kann die Runde fortsetzen.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  COLOR_NAMES,
  COLS,
  JOKER_CODE,
  JOKER_MOVES,
  applyMove,
  encodeMove,
  findHint,
  goalProgress,
  newGame,
  replayGame,
  playJoker as applyJoker,
  type BlastKind,
  type GameMode,
  type GameState,
  type Goal,
  type LevelDef,
  type Piece,
  type Step,
} from "@/lib/gems/engine";
import { getSoundSettings, playSfx, setSoundSettings, type Sfx } from "@/lib/game-sfx";
import GemsBoard, { type Blast, type Burst, type ScorePopup } from "./GemsBoard";
import { CountUp, Flash, GemsLogo, GoalBadge, HowToPlay, LevelCard, MovesRing, NeonBackground, Praise, type LevelCardData } from "./GemsUi";
import FullscreenShell, { requestBrowserFullscreen } from "@/components/blocks/FullscreenShell";
import { Button, Modal } from "@/components/ui";
import { ArrowLeft, BellOff, Flag, Lightbulb, Play, RotateCcw, Star, Volume2, Zap } from "@/components/icons";

type Phase = "menu" | "loading" | "playing" | "submitting" | "result";

interface RunInfo {
  id: string;
  seed: number;
  mode: GameMode;
  day: string | null;
}

interface SavedRun extends RunInfo {
  moves: number[];
  savedAt: number;
}

interface SubmitResult {
  score: number;
  level: number;
  moves: number;
  stars: number;
  boards: { board: string; isNew: boolean; best: number; place: number | null }[];
}

// v2: Regeln mit Kombos, Eis, Ketten, Joker — ältere Spielstände passen nicht mehr dazu.
const saveKey = (mode: GameMode) => `oma-gems-run-v2:${mode}`;
const HINT_AFTER_MS = 7000;
const fmt = (n: number) => n.toLocaleString("de-DE");
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function readSaved(mode: GameMode): SavedRun | null {
  try {
    const raw = localStorage.getItem(saveKey(mode));
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedRun;
    if (typeof s.id !== "string" || typeof s.seed !== "number" || !Array.isArray(s.moves) || s.mode !== mode) return null;
    return s;
  } catch {
    return null;
  }
}

function writeSaved(run: SavedRun | null, mode: GameMode) {
  try {
    if (run) localStorage.setItem(saveKey(mode), JSON.stringify(run));
    else localStorage.removeItem(saveKey(mode));
  } catch {
    /* privater Modus o.ä. — dann eben ohne Fortsetzen */
  }
}

/** Ein Ziel in Worten (ohne Zugzahl). */
function singleGoalText(g: Goal): string {
  if (g.type === "score") return `${fmt(g.target)} Punkte`;
  if (g.type === "collect") return `${g.count} × ${COLOR_NAMES[g.color]} sammeln`;
  if (g.type === "stones") return `${g.count} Felsen zerstören`;
  if (g.type === "ice") return `${g.count} Steine aus dem Eis befreien`;
  return "so viele Punkte wie möglich";
}

/** Ziel(e) eines Levels in Worten. */
export function goalText(def: LevelDef): string {
  const goals = def.goals.filter((g) => g.type !== "none");
  if (goals.length === 0) return `So viele Punkte wie möglich in ${def.moves} Zügen`;
  const parts = goals.map(singleGoalText);
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;
  return `${text[0].toUpperCase()}${text.slice(1)} in ${def.moves} Zügen`;
}

function noveltyText(def: LevelDef): string | null {
  switch (def.novelty) {
    case "color":
      return `Neu: eine weitere Edelsteinfarbe (${def.colors} Farben)!`;
    case "stones":
      return "Felsen! Sie lassen sich nicht kombinieren — nur Explosionen von Sondersteinen zerstören sie. Zwei Sondersteine liegen schon bereit.";
    case "ice":
      return "Eis! Eingefrorene Steine lassen sich nicht tauschen. Bau sie in eine Reihe ein oder sprenge sie, dann bricht das Eis.";
    case "chains":
      return "Ketten! Angekettete Steine lassen sich nicht tauschen, aber ganz normal kombinieren.";
    case "double":
      return "Ab jetzt hat jedes Level zwei Ziele — beide müssen geschafft werden.";
    default:
      return null;
  }
}

const COMBO_NAMES: Partial<Record<BlastKind, string>> = {
  cross: "Kreuz-Kombo!",
  cross3: "Riesenkreuz!",
  bomb5: "Mega-Bombe!",
  prism: "Prisma-Kombo!",
  board: "Brett-Räumer!",
};

/** Lob für lange Kaskaden. */
function praiseFor(cascade: number): string | null {
  if (cascade >= 6) return "Unglaublich!";
  if (cascade >= 5) return "Fantastisch!";
  if (cascade >= 4) return "Super!";
  return null;
}

/** Klang je Explosion. */
function sfxForBlast(kind: BlastKind): Sfx {
  switch (kind) {
    case "row":
    case "col":
      return "hit2";
    case "bomb":
      return "fire";
    case "prism":
      return "spell";
    case "ice":
      return "ice";
    default:
      return "boss";
  }
}

export default function GemsGameClient({
  mode,
  title,
  subtitle,
  bestLabel,
  initialBest,
  bestLevel = 0,
}: {
  mode: GameMode;
  title: string;
  subtitle: string;
  /** z.B. „Bestwert im November 2026“ */
  bestLabel: string;
  initialBest: number;
  /** Höchstes Level des Bestwerts (klassisch). */
  bestLevel?: number;
}) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [game, setGame] = useState<GameState | null>(null);
  const [cells, setCells] = useState<(Piece | null)[]>([]);
  const [spawnFrom, setSpawnFrom] = useState<Record<number, number>>({});
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [shake, setShake] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [banner, setBanner] = useState<LevelCardData | null>(null);
  const [praise, setPraise] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [saved, setSaved] = useState<SavedRun | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [muted, setMuted] = useState(false);
  const [best, setBest] = useState(initialBest);

  const movesRef = useRef<number[]>([]);
  const gameRef = useRef<GameState | null>(null);
  const runRef = useRef<RunInfo | null>(null);
  const alive = useRef(true);
  const keyCounter = useRef(0);
  const nextKey = (p: string) => `${p}${keyCounter.current++}`;

  useEffect(() => {
    alive.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readSaved(mode));
    setMuted(getSoundSettings().muted);
    return () => {
      alive.current = false;
    };
  }, [mode]);

  const showBoard = useCallback((state: GameState, drop: boolean) => {
    if (drop) {
      const from: Record<number, number> = {};
      state.board.forEach((p) => (from[p.id] = COLS + 1));
      setSpawnFrom(from);
    } else setSpawnFrom({});
    setCells(state.board.slice());
  }, []);

  const levelBanner = useCallback((def: LevelDef, extra: string[] = [], stars: number | null = null) => {
    setBanner({
      title: def.goals[0]?.type === "none" ? "Tages-Herausforderung" : `Level ${def.level}`,
      lines: [...extra, goalText(def)],
      novelty: noveltyText(def),
      def,
      stars,
    });
  }, []);

  /** Startet das Spiel mit einem Zustand (neu oder aus Fortsetzen). */
  const begin = useCallback(
    (info: RunInfo, state: GameState, moves: number[]) => {
      runRef.current = info;
      gameRef.current = state;
      movesRef.current = moves;
      setGame(state);
      setLiveScore(state.score);
      setResult(null);
      setError(null);
      setHint(null);
      setPhase("playing");
      showBoard(state, true);
      if (moves.length === 0) levelBanner(state.def);
    },
    [levelBanner, showBoard],
  );

  const persist = useCallback(() => {
    const info = runRef.current;
    if (info) writeSaved({ ...info, moves: movesRef.current, savedAt: Date.now() }, mode);
  }, [mode]);

  const submit = useCallback(async () => {
    const info = runRef.current;
    if (!info) return;
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/gems/runs/${info.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves: movesRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(data.error ?? "Ergebnis konnte nicht gespeichert werden.");
      writeSaved(null, mode);
      setSaved(null);
      if (res.ok) {
        setResult(data as SubmitResult);
        const top = (data as SubmitResult).boards[0];
        if (top) setBest((b) => Math.max(b, top.best));
      }
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ergebnis konnte nicht gespeichert werden.");
      setPhase("result");
    }
  }, [mode]);

  const start = useCallback(async () => {
    requestBrowserFullscreen();
    setPhase("loading");
    setError(null);
    // Eine liegengebliebene Runde erst werten, damit ihre Punkte nicht verloren gehen.
    const old = readSaved(mode);
    if (old && old.moves.length > 0) {
      await fetch(`/api/gems/runs/${old.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves: old.moves }),
      }).catch(() => {});
    }
    writeSaved(null, mode);
    setSaved(null);
    try {
      const res = await fetch("/api/gems/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Konnte keine Runde starten.");
      const info: RunInfo = { id: data.runId, seed: data.seed, mode, day: data.day ?? null };
      writeSaved({ ...info, moves: [], savedAt: Date.now() }, mode);
      begin(info, newGame(mode, info.seed), []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte keine Runde starten.");
      setPhase("menu");
    }
  }, [begin, mode]);

  const resume = useCallback(() => {
    const s = readSaved(mode);
    if (!s) return;
    requestBrowserFullscreen();
    const rep = replayGame(mode, s.seed, s.moves);
    if (!rep.ok) {
      writeSaved(null, mode);
      setSaved(null);
      setError("Der gespeicherte Spielstand war beschädigt und wurde verworfen.");
      return;
    }
    begin({ id: s.id, seed: s.seed, mode, day: s.day }, rep.state, s.moves);
    if (rep.state.over) void submit();
  }, [begin, mode, submit]);

  /** Spielt die Schritte eines Zugs nacheinander ab (Abräumen, Nachfallen, Mischen, Levelwechsel). */
  const playSteps = useCallback(
    async (steps: Step[], startScore: number) => {
      let score = startScore;
      for (const step of steps) {
        if (!alive.current) return;
        if (step.type === "clear") {
          score += step.points;
          setLiveScore(score);
          const comboLabel = step.combo ? (COMBO_NAMES[step.combo] ?? null) : null;
          setCombo(step.cascade);
          const cheer = comboLabel ?? praiseFor(step.cascade);
          if (cheer) {
            setPraise(cheer);
            setFlash((n) => n + 1);
          }
          const newBlasts: Blast[] = [
            ...step.fired.map((f) => ({ key: nextKey("b"), index: f.index, kind: f.kind })),
            ...step.unfrozen.map((i) => ({ key: nextKey("i"), index: i, kind: "ice" as const })),
          ];
          setBlasts(newBlasts);
          setBursts(step.cleared.slice(0, 40).map((c) => ({ key: nextKey("s"), index: c.index, color: c.kind === "stone" ? -1 : c.color })));
          // Klänge: die „größte“ Explosion zählt, sonst Match-Klang je Kaskade
          if (step.combo) playSfx(sfxForBlast(step.combo), 0.9);
          else if (step.fired.length > 0) playSfx(sfxForBlast(step.fired[0].kind), 0.75);
          else playSfx(step.cascade === 1 ? "click" : "ping", 0.5 + Math.min(0.4, step.cascade * 0.1));
          if (step.created.length > 0) playSfx("buff", 0.6);
          if (step.unfrozen.length > 0) playSfx("ice", 0.7);
          if (step.cleared.some((c) => c.kind === "stone")) playSfx("block", 0.8);
          if (step.combo || step.fired.some((f) => f.kind === "bomb" || f.kind === "prism")) setShake((n) => n + 1);
          const spots = step.cleared.length > 0 ? step.cleared : step.created;
          if (spots.length > 0) {
            const mid = spots[Math.floor(spots.length / 2)].index;
            setPopups((p) => [...p.slice(-6), { key: nextKey("p"), index: mid, text: `+${fmt(step.points)}`, big: !!step.combo || step.points >= 1000 }]);
          }
          setSpawnFrom({});
          setCells(step.board);
          await sleep(step.combo ? 420 : step.fired.length > 0 ? 300 : 220);
        } else if (step.type === "fall") {
          const perCol = new Map<number, number>();
          step.board.forEach((p, i) => {
            if (step.spawned.includes(p.id)) perCol.set(i % COLS, (perCol.get(i % COLS) ?? 0) + 1);
          });
          const from: Record<number, number> = {};
          step.board.forEach((p, i) => {
            if (step.spawned.includes(p.id)) from[p.id] = perCol.get(i % COLS) ?? 1;
          });
          setSpawnFrom(from);
          setCells(step.board);
          setBlasts([]);
          await sleep(300);
        } else if (step.type === "shuffle") {
          setNotice("Keine Züge mehr — die Steine werden gemischt");
          await sleep(700);
          setSpawnFrom({});
          setCells(step.board);
          await sleep(500);
          setNotice(null);
        } else if (step.type === "level") {
          playSfx("level", 0.9);
          score += step.bonus;
          setLiveScore(score);
          await sleep(350);
          const from: Record<number, number> = {};
          step.board.forEach((p) => (from[p.id] = COLS + 1));
          setCells([]);
          setBursts([]);
          await sleep(200);
          levelBanner(
            step.def,
            [`Level ${step.def.level - 1} geschafft!`, ...(step.bonus > 0 ? [`Bonus für übrige Züge: +${fmt(step.bonus)}`] : [])],
            step.stars,
          );
          setSpawnFrom(from);
          setCells(step.board);
        }
      }
    },
    [levelBanner],
  );

  const swap = useCallback(
    async (a: number, b: number) => {
      const state = gameRef.current;
      if (!state || busy || phase !== "playing" || banner || state.outOfMoves) return;
      setHint(null);
      const res = applyMove(state, a, b);
      const swapped = state.board.slice() as (Piece | null)[];
      [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
      setBusy(true);
      setSpawnFrom({});

      if (!res.ok) {
        playSfx("error", 0.6);
        // Hindernisse wackeln nur, getauscht wird nichts
        if (swapped[a]?.kind === "gem" && swapped[b]?.kind === "gem" && !swapped[a]?.lock && !swapped[b]?.lock) {
          setCells(swapped);
          await sleep(190);
          if (!alive.current) return;
          setCells(state.board.slice());
        }
        await sleep(190);
        setBusy(false);
        return;
      }

      setCells(swapped);
      playSfx("click", 0.6);
      movesRef.current = [...movesRef.current, encodeMove(a, b)];
      persist();
      await sleep(170);
      await playSteps(res.steps, state.score);
      if (!alive.current) return;
      setCombo(0);
      setPraise(null);
      setPopups([]);
      setBursts([]);
      gameRef.current = res.state;
      setGame(res.state);
      setLiveScore(res.state.score);
      setBusy(false);
      if (res.state.outOfMoves) {
        playSfx("hurt", 0.7);
      } else if (res.state.over) {
        playSfx(res.state.mode === "daily" ? "win" : "lose", 0.8);
        setNotice(res.state.mode === "daily" ? "Alle Züge gespielt!" : "Keine Züge mehr — Ziel verfehlt");
        await sleep(1400);
        if (!alive.current) return;
        setNotice(null);
        void submit();
      }
    },
    [banner, busy, persist, phase, playSteps, submit],
  );

  const takeJoker = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    const next = applyJoker(state);
    if (!next) return;
    playSfx("reward", 0.9);
    movesRef.current = [...movesRef.current, JOKER_CODE];
    persist();
    gameRef.current = next;
    setGame(next);
    setCells(next.board.slice());
  }, [persist]);

  // Hinweis nach etwas Leerlauf
  useEffect(() => {
    if (phase !== "playing" || busy || banner || !game || game.over || game.outOfMoves) return;
    const t = setTimeout(() => setHint(findHint(game.board)), HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [phase, busy, banner, game]);

  // Level-Ansage schließt sich von selbst
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), banner.lines.length > 3 ? 4200 : 3000);
    return () => clearTimeout(t);
  }, [banner]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundSettings({ muted: next });
  };

  const fullscreen = phase !== "menu";
  const goals = game ? goalProgress(game) : [];
  const showJokerDialog = phase === "playing" && !busy && !!game?.outOfMoves;

  // ── Startbildschirm ──
  if (!fullscreen) {
    const hasSaved = !!saved && saved.moves.length > 0;
    return (
      <div className="space-y-4">
        <Link href="/gems" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> Games
        </Link>
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 space-y-5 gems-hero">
          <GemsLogo />
          <div className="text-center">
            <h1 className="font-display text-xl font-black text-white">{title}</h1>
            <p className="text-sm text-gray-300">{subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            <div className="rounded-2xl px-3 py-2.5 text-center gems-card">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">{bestLabel}</p>
              <p className="font-display text-2xl font-black text-white tabular-nums">{best > 0 ? fmt(best) : "–"}</p>
            </div>
            <div className="rounded-2xl px-3 py-2.5 text-center gems-card">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">{mode === "classic" ? "Bestes Level" : "Züge"}</p>
              <p className="font-display text-2xl font-black text-white tabular-nums">{mode === "classic" ? (bestLevel > 0 ? bestLevel : "–") : 30}</p>
            </div>
          </div>

          {error && <p className="text-center text-sm text-rose-300">{error}</p>}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              type="button"
              onClick={hasSaved ? resume : start}
              className="gems-play-button inline-flex items-center gap-3 rounded-full px-10 py-4 font-display text-xl font-black text-gray-950"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Play className="w-6 h-6" />
              {hasSaved ? "Fortsetzen" : "Spielen"}
            </motion.button>
            {hasSaved && (
              <>
                <button type="button" onClick={start} className="text-sm font-semibold text-gray-300 hover:text-white inline-flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Neue Runde
                </button>
                <p className="text-[11px] text-gray-500 text-center">
                  Angefangene Runde: {saved!.moves.length} {saved!.moves.length === 1 ? "Zug" : "Züge"}. Bei „Neue Runde“ wird sie mit ihrem bisherigen Stand gewertet.
                </p>
              </>
            )}
          </div>

          <div className="max-w-sm mx-auto">
            <HowToPlay mode={mode} />
          </div>
        </div>
      </div>
    );
  }

  // ── Spiel / Ergebnis (Vollbild) ──
  const finished = phase === "submitting" || phase === "result";
  return (
    <FullscreenShell active={fullscreen}>
      <NeonBackground />
      <div className="max-w-[560px] mx-auto space-y-3">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-3">
            <GemsLogo small />
            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
              {game?.mode === "classic" ? (
                <>
                  <span className="font-bold text-white">Level {game.level}</span> ·
                  <Star className="w-3 h-3 text-amber-300" /> {game.stars}
                  {game.jokers > 0 && <span className="text-teal-300 inline-flex items-center gap-0.5"> · <Zap className="w-3 h-3" /> Joker</span>}
                </>
              ) : (
                subtitle
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={toggleMute} className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.06]" aria-label={muted ? "Ton an" : "Ton aus"}>
              {muted ? <BellOff className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {phase === "playing" && (
              <>
                <button
                  type="button"
                  onClick={() => game && setHint(findHint(game.board))}
                  disabled={busy || !!game?.outOfMoves}
                  className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                  aria-label="Tipp anzeigen"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  disabled={busy}
                  className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                  aria-label="Runde beenden"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Spielkopf: Punkte, Züge, Ziele */}
        {game && (
          <div className="rounded-2xl px-3 py-2.5 gems-card flex items-center gap-3">
            <MovesRing left={game.movesLeft} total={game.def.moves} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Punkte</p>
              <CountUp value={liveScore} className="block font-display text-3xl font-black tabular-nums gems-neon-text leading-tight" />
            </div>
            {goals.length === 0 && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-gray-400">{bestLabel.split(" ")[0]}</p>
                <p className="font-display text-lg font-black text-white tabular-nums">{best > 0 ? fmt(best) : "–"}</p>
              </div>
            )}
          </div>
        )}
        {game && goals.length > 0 && (
          <div className={`grid gap-2 ${goals.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {goals.map((g, k) => (
              <div key={k} className="rounded-2xl px-3 py-2 gems-card">
                <GoalBadge goal={g.goal} value={g.value} target={g.target} uid={`hud-goal-${k}`} />
              </div>
            ))}
          </div>
        )}

        {/* Brett */}
        <div className="relative">
          <GemsBoard
            cells={cells}
            spawnFrom={spawnFrom}
            disabled={busy || phase !== "playing" || !!banner || !!game?.outOfMoves}
            hint={hint}
            blasts={blasts}
            popups={popups}
            bursts={bursts}
            shake={shake}
            onSwap={swap}
          />
          <Flash n={flash} />
          <Praise text={praise} />
          <AnimatePresence>
            {combo >= 2 && !praise && (
              <motion.div
                key={`combo-${combo}`}
                className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-display font-black pointer-events-none whitespace-nowrap z-10 text-gray-950"
                style={{ background: "linear-gradient(90deg,#5eead4,#a78bfa)", fontSize: 14 + Math.min(8, combo * 1.5), boxShadow: "0 0 18px rgba(167,139,250,0.7)" }}
                initial={{ opacity: 0, scale: 0.5, y: -6 }}
                animate={{ opacity: 1, scale: [0.5, 1.15, 1], y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                Kaskade ×{combo}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>{banner && <LevelCard data={banner} onClose={() => setBanner(null)} />}</AnimatePresence>
          <AnimatePresence>
            {notice && !banner && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center p-6 rounded-[22px] bg-[#05060f]/65 backdrop-blur-[2px] text-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="font-display text-2xl font-black gems-neon-text">
                  {notice}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Joker */}
          <AnimatePresence>
            {showJokerDialog && !banner && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-[22px] bg-[#05060f]/70 backdrop-blur-[3px] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div initial={{ y: 40, scale: 0.9 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-[300px] rounded-2xl p-5 space-y-3 gems-card">
                  <motion.div
                    className="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-teal-400/15 text-teal-300"
                    animate={{ boxShadow: ["0 0 0px rgba(45,212,191,0)", "0 0 28px rgba(45,212,191,0.9)", "0 0 0px rgba(45,212,191,0)"] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    <Zap className="w-7 h-7" />
                  </motion.div>
                  <p className="font-display text-2xl font-black gems-neon-text">Keine Züge mehr!</p>
                  <p className="text-sm text-gray-300">
                    Dein Joker gibt dir {JOKER_MOVES} Extra-Züge für dieses Level. Danach gibt es für das Level höchstens einen Stern.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={takeJoker} className="gems-play-button rounded-full px-5 py-2.5 font-display font-black text-gray-950 inline-flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" /> Joker einsetzen (+{JOKER_MOVES})
                    </button>
                    <Button variant="ghost" onClick={() => void submit()}>
                      Aufhören & werten
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ergebnis */}
          <AnimatePresence>
            {finished && (
              <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center p-4 rounded-[22px] bg-[#05060f]/75 backdrop-blur-[4px] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-full max-w-[320px] rounded-2xl p-5 space-y-3 gems-card"
                  initial={{ y: 80, scale: 0.85 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                >
                  {phase === "submitting" ? (
                    <>
                      <p className="font-display text-2xl font-black gems-neon-text">Runde vorbei</p>
                      <p className="text-sm text-gray-300">Ergebnis wird gewertet …</p>
                    </>
                  ) : error ? (
                    <>
                      <p className="font-display text-2xl font-black text-white">Hoppla</p>
                      <p className="text-sm text-rose-300">{error}</p>
                      <Button onClick={submit} icon={<RotateCcw className="w-4 h-4" />}>
                        Nochmal senden
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300">Ergebnis</p>
                      <CountUp value={result?.score ?? liveScore} className="block font-display text-5xl font-black tabular-nums gems-neon-text" />
                      <p className="text-xs text-gray-400 -mt-1">Punkte</p>
                      {mode === "classic" && result && (
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-200">
                          <span>
                            Level <span className="font-black text-white">{result.level}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-300" /> <span className="font-black text-white">{result.stars}</span> Sterne
                          </span>
                        </div>
                      )}
                      <div className="space-y-1.5 pt-1">
                        {result?.boards.map((b) => (
                          <div
                            key={b.board}
                            className={`rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2 ${b.isNew ? "bg-amber-300/10 border border-amber-300/30" : "bg-white/[0.04]"}`}
                          >
                            <span className="text-gray-300">
                              {b.isNew ? "🎉 Neuer Bestwert" : "Bestwert"} {boardName(b.board)}
                            </span>
                            <span className="font-black text-white tabular-nums">
                              {fmt(b.best)}
                              {b.place && <span className="text-teal-300 font-semibold"> · #{b.place}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 pt-1">
                        <button type="button" onClick={start} className="gems-play-button rounded-full px-5 py-3 font-display text-lg font-black text-gray-950 inline-flex items-center justify-center gap-2">
                          <RotateCcw className="w-5 h-5" /> Nochmal
                        </button>
                        <Link href="/gems" className="text-sm font-semibold text-gray-300 hover:text-white inline-flex items-center justify-center gap-1.5 py-1">
                          <ArrowLeft className="w-4 h-4" /> Zur Übersicht
                        </Link>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="Runde beenden?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-300">Deine Runde wird mit dem aktuellen Stand ({fmt(liveScore)} Punkte) gewertet.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Weiterspielen
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmEnd(false);
                void submit();
              }}
            >
              Beenden & werten
            </Button>
          </div>
        </div>
      </Modal>
    </FullscreenShell>
  );
}

function boardName(board: string): string {
  if (board === "classic:all") return "aller Zeiten";
  if (board.startsWith("classic:")) return "im Monat";
  return "heute";
}
