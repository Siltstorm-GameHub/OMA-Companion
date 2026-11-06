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
import GemIcon from "./GemIcon";
import FullscreenShell, { requestBrowserFullscreen } from "@/components/blocks/FullscreenShell";
import { Button, Modal } from "@/components/ui";
import { ArrowLeft, BellOff, Flag, Lightbulb, Play, RotateCcw, Star, Trophy, Volume2, Zap } from "@/components/icons";

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

function GoalIcon({ goal, uid }: { goal: Goal; uid: string }) {
  if (goal.type === "collect") return <GemIcon piece={{ kind: "gem", color: goal.color, special: "none" }} uid={uid} />;
  if (goal.type === "stones") return <GemIcon piece={{ kind: "stone", color: -1, special: "none" }} uid={uid} />;
  if (goal.type === "ice") return <GemIcon piece={{ kind: "gem", color: 3, special: "none", lock: "ice" }} uid={uid} />;
  return <Trophy className="w-full h-full text-amber-300" />;
}

function Stars({ count, max = 3, className = "w-5 h-5" }: { count: number; max?: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`${className} ${i < count ? "text-amber-300" : "text-white/15"}`} />
      ))}
    </span>
  );
}

const COMBO_NAMES: Partial<Record<BlastKind, string>> = {
  cross: "Kreuz-Kombo!",
  cross3: "Riesenkreuz!",
  bomb5: "Mega-Bombe!",
  prism: "Prisma-Kombo!",
  board: "Brett-Räumer!",
};

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
}: {
  mode: GameMode;
  title: string;
  subtitle: string;
  /** z.B. „Bestwert im November 2026“ */
  bestLabel: string;
  initialBest: number;
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
  const [banner, setBanner] = useState<{ title: string; lines: string[]; def: LevelDef | null; stars: number | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [combo, setCombo] = useState<{ n: number; label: string | null } | null>(null);
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
    const nov = noveltyText(def);
    setBanner({
      title: def.goals[0]?.type === "none" ? "Tages-Herausforderung" : `Level ${def.level}`,
      lines: [...extra, goalText(def), ...(nov ? [nov] : [])],
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
          if (step.cascade >= 2 || comboLabel) setCombo({ n: step.cascade, label: comboLabel });
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
      setCombo(null);
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

  // ── Menü ──
  if (!fullscreen) {
    return (
      <div className="space-y-4">
        <Link href="/gems" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> Games
        </Link>
        <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0">
              <GemIcon piece={{ kind: "gem", color: 3, special: "none" }} uid="menu-gem" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white">{title}</h1>
              <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
          </div>
          <ul className="text-sm text-gray-300 space-y-1.5 list-disc pl-5">
            <li>Tausche zwei benachbarte Steine, sodass 3 oder mehr gleiche in einer Reihe liegen.</li>
            <li>4 in einer Reihe ergibt einen Linien-Stein, eine L- oder T-Form eine Bombe, 5 in einer Reihe ein Prisma.</li>
            <li>Tausche zwei Sondersteine miteinander für eine Kombo — Kreuz, Mega-Bombe oder Prisma-Kombo.</li>
            <li>Felsen zerstören nur Explosionen. Eis bricht, wenn du den Stein in eine Reihe einbaust. Angekettete Steine kann man nicht tauschen, aber kombinieren.</li>
            {mode === "classic" ? (
              <li>
                Jedes Level hat ein Ziel (ab Level 10 zwei) und begrenzte Züge. Übrige Züge bringen Bonus und bis zu 3 Sterne. Einmal pro
                Runde rettet dich ein Joker mit {JOKER_MOVES} Extra-Zügen.
              </li>
            ) : (
              <li>Alle spielen heute dasselbe Brett mit demselben Nachschub: 30 Züge, so viele Punkte wie möglich. Dein bester Versuch zählt.</li>
            )}
          </ul>
          <p className="text-xs text-gray-500">
            {bestLabel}: <span className="font-bold text-white tabular-nums">{best > 0 ? fmt(best) : "–"}</span>
          </p>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {saved && saved.moves.length > 0 ? (
              <>
                <Button onClick={resume} icon={<Play className="w-4 h-4" />}>
                  Fortsetzen ({saved.moves.length} {saved.moves.length === 1 ? "Zug" : "Züge"})
                </Button>
                <Button variant="outline" onClick={start} icon={<RotateCcw className="w-4 h-4" />}>
                  Neue Runde
                </Button>
              </>
            ) : (
              <Button onClick={start} icon={<Play className="w-4 h-4" />}>
                Spielen
              </Button>
            )}
          </div>
          {saved && saved.moves.length > 0 && (
            <p className="text-[11px] text-gray-500">Bei „Neue Runde“ wird die angefangene Runde mit ihrem bisherigen Stand gewertet.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Spiel / Ergebnis (Vollbild) ──
  return (
    <FullscreenShell active={fullscreen}>
      <div className="max-w-[560px] mx-auto space-y-3">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg font-black text-white leading-tight truncate">{title}</p>
            <p className="text-[11px] text-gray-500 truncate flex items-center gap-1.5">
              {game?.mode === "classic" ? (
                <>
                  Level {game.level} · {game.def.colors} Farben ·
                  <Star className="w-3 h-3 text-amber-300" /> {game.stars}
                  {game.jokers > 0 && <span className="text-teal-300"> · Joker bereit</span>}
                </>
              ) : (
                subtitle
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={toggleMute} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06]" aria-label={muted ? "Ton an" : "Ton aus"}>
              {muted ? <BellOff className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {phase === "playing" && (
              <>
                <button
                  type="button"
                  onClick={() => game && setHint(findHint(game.board))}
                  disabled={busy || !!game?.outOfMoves}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                  aria-label="Tipp anzeigen"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  disabled={busy}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                  aria-label="Runde beenden"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* HUD */}
        {game && (
          <div className={`grid gap-2 ${goals.length > 1 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
            <Stat label="Punkte" value={fmt(liveScore)} />
            <Stat label="Züge" value={String(game.movesLeft)} warn={game.movesLeft <= 5} />
            {goals.length > 0 ? (
              goals.map((g, k) => {
                const done = g.value >= g.target;
                return (
                  <div key={k} className={`glass rounded-xl px-3 py-2 ${done ? "ring-1 ring-emerald-400/40" : ""}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 shrink-0">
                        <GoalIcon goal={g.goal} uid={`hud-goal-${k}`} />
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${done ? "text-emerald-300" : "text-white"}`}>
                        {g.goal.type === "score" ? `${Math.round((g.value / g.target) * 100)} %` : `${g.value}/${g.target}`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-300 transition-all duration-300" style={{ width: `${Math.min(100, (g.value / g.target) * 100)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <Stat label={bestLabel.split(" ")[0]} value={best > 0 ? fmt(best) : "–"} />
            )}
          </div>
        )}
        {game && goals.length > 0 && <p className="text-[11px] text-gray-400 text-center">{goalText(game.def)}</p>}

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
          <AnimatePresence>
            {combo && (
              <motion.div
                key={`combo-${combo.n}-${combo.label}`}
                className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-gray-900 font-black pointer-events-none whitespace-nowrap z-10"
                style={{
                  background: combo.label ? "linear-gradient(90deg,#f472b6,#facc15,#34d399,#60a5fa)" : "rgba(251,191,36,0.92)",
                  fontSize: combo.label ? 18 : 14 + Math.min(8, combo.n * 1.5),
                  boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
                }}
                initial={{ opacity: 0, scale: 0.5, y: -6 }}
                animate={{ opacity: 1, scale: [0.5, 1.15, 1], y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                {combo.label ?? `Kombo ×${combo.n}`}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {(banner || notice) && (
              <motion.button
                type="button"
                onClick={() => setBanner(null)}
                className="absolute inset-0 z-20 flex items-center justify-center p-6 rounded-2xl bg-black/60 backdrop-blur-[2px] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="space-y-2 max-w-xs">
                  {banner ? (
                    <>
                      {banner.stars !== null && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
                          <Stars count={banner.stars} className="w-8 h-8" />
                        </motion.div>
                      )}
                      {banner.def && (
                        <div className="flex justify-center gap-2">
                          {banner.def.goals
                            .filter((g) => g.type !== "score" && g.type !== "none")
                            .map((g, k) => (
                              <div key={k} className="w-11 h-11">
                                <GoalIcon goal={g} uid={`banner-goal-${k}`} />
                              </div>
                            ))}
                        </div>
                      )}
                      <p className="font-display text-3xl font-black text-white">{banner.title}</p>
                      {banner.lines.map((l, i) => {
                        const isNovelty = i === banner.lines.length - 1 && !!banner.def && noveltyText(banner.def) === l;
                        return (
                          <p key={i} className={isNovelty ? "text-sm text-amber-200" : "text-sm text-gray-200"}>
                            {l}
                          </p>
                        );
                      })}
                      <p className="text-[10px] text-gray-400 pt-1">Tippen zum Weiterspielen</p>
                    </>
                  ) : (
                    <p className="font-display text-xl font-black text-white">{notice}</p>
                  )}
                </motion.div>
              </motion.button>
            )}
          </AnimatePresence>
          {/* Joker */}
          <AnimatePresence>
            {showJokerDialog && !banner && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center p-6 rounded-2xl bg-black/65 backdrop-blur-[2px] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="space-y-3 max-w-xs">
                  <p className="font-display text-2xl font-black text-white">Keine Züge mehr!</p>
                  <p className="text-sm text-gray-300">
                    Du hast noch deinen Joker: {JOKER_MOVES} Extra-Züge für dieses Level. Danach gibt es für das Level höchstens einen Stern.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={takeJoker} icon={<Zap className="w-4 h-4" />}>
                      Joker einsetzen (+{JOKER_MOVES} Züge)
                    </Button>
                    <Button variant="ghost" onClick={() => void submit()}>
                      Aufhören & werten
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ergebnis */}
        {(phase === "submitting" || phase === "result") && (
          <div className="glass rounded-2xl p-4 space-y-3">
            {phase === "submitting" ? (
              <p className="text-sm text-gray-300">Ergebnis wird gewertet …</p>
            ) : error ? (
              <>
                <p className="text-sm text-rose-300">{error}</p>
                <Button onClick={submit} icon={<RotateCcw className="w-4 h-4" />}>
                  Nochmal senden
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-2xl font-black text-white tabular-nums">{fmt(result?.score ?? liveScore)} Punkte</p>
                  {mode === "classic" && result && (
                    <p className="text-sm text-gray-400 flex items-center gap-1.5">
                      Level {result.level} · <Star className="w-4 h-4 text-amber-300" /> {result.stars}
                    </p>
                  )}
                </div>
                {result?.boards.map((b) => (
                  <p key={b.board} className="text-sm text-gray-300">
                    {b.isNew ? "🎉 Neuer Bestwert" : "Bestwert"} {boardName(b.board)}: <span className="font-bold text-white">{fmt(b.best)}</span>
                    {b.place && <span className="text-gray-400"> · Platz {b.place}</span>}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={start} icon={<RotateCcw className="w-4 h-4" />}>
                    Nochmal
                  </Button>
                  <Link href="/gems" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-sm px-3 py-2">
                    <ArrowLeft className="w-4 h-4" /> Zur Übersicht
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
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

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="glass rounded-xl px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`text-lg font-black tabular-nums leading-tight ${warn ? "text-rose-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
