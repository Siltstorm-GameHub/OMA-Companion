"use client";
// ============================================
// OMA Gems — eine Runde spielen (klassisch oder Tages-Herausforderung)
// ============================================
// Ablauf: Start → Server vergibt Seed (/api/gems/runs) → spielen → bei Spielende (oder „Beenden“) werden die Züge
// eingereicht (/api/gems/runs/[id]); der Server spielt nach und wertet. Der Spielstand (Run-ID, Seed, Züge) liegt
// nach jedem Zug im localStorage — wer die Seite schließt oder neu lädt, kann die Runde fortsetzen.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  COLOR_NAMES,
  COLS,
  applyMove,
  encodeMove,
  findHint,
  goalProgress,
  newGame,
  replayGame,
  type GameMode,
  type GameState,
  type LevelDef,
  type Piece,
} from "@/lib/gems/engine";
import { getSoundSettings, playSfx, setSoundSettings } from "@/lib/game-sfx";
import GemsBoard, { type Blast, type ScorePopup } from "./GemsBoard";
import GemIcon from "./GemIcon";
import FullscreenShell, { requestBrowserFullscreen } from "@/components/blocks/FullscreenShell";
import { Button, Modal } from "@/components/ui";
import { ArrowLeft, BellOff, Flag, Lightbulb, Play, RotateCcw, Trophy, Volume2 } from "@/components/icons";

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
  boards: { board: string; isNew: boolean; best: number; place: number | null }[];
}

const saveKey = (mode: GameMode) => `oma-gems-run-v1:${mode}`;
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

/** Ziel eines Levels in Worten. */
export function goalText(def: LevelDef): string {
  const g = def.goal;
  if (g.type === "score") return `Erreiche ${fmt(g.target)} Punkte in ${def.moves} Zügen`;
  if (g.type === "collect") return `Sammle ${g.count} × ${COLOR_NAMES[g.color]} in ${def.moves} Zügen`;
  if (g.type === "stones") return `Zerstöre ${g.count} Felsen in ${def.moves} Zügen`;
  return `So viele Punkte wie möglich in ${def.moves} Zügen`;
}

function noveltyText(def: LevelDef): string | null {
  if (def.novelty === "color") return `Neu: eine weitere Edelsteinfarbe (${def.colors} Farben)!`;
  if (def.novelty === "stones") return "Felsen! Sie lassen sich nicht kombinieren — nur Explosionen von Sondersteinen zerstören sie.";
  return null;
}

function GoalIcon({ def }: { def: LevelDef }) {
  const g = def.goal;
  if (g.type === "collect") return <GemIcon piece={{ kind: "gem", color: g.color, special: "none" }} uid="goal-icon" />;
  if (g.type === "stones") return <GemIcon piece={{ kind: "stone", color: -1, special: "none" }} uid="goal-stone" />;
  return <Trophy className="w-full h-full text-amber-300" />;
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
  const [liveScore, setLiveScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [banner, setBanner] = useState<{ title: string; lines: string[]; def: LevelDef | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
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

  useEffect(() => {
    alive.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readSaved(mode));
    setMuted(getSoundSettings().muted);
    return () => {
      alive.current = false;
    };
  }, [mode]);

  const sfx = useCallback((...args: Parameters<typeof playSfx>) => playSfx(...args), []);

  const showBoard = useCallback((state: GameState, drop: boolean) => {
    if (drop) {
      const from: Record<number, number> = {};
      state.board.forEach((p) => (from[p.id] = COLS + 1));
      setSpawnFrom(from);
    } else setSpawnFrom({});
    setCells(state.board.slice());
  }, []);

  const levelBanner = useCallback((def: LevelDef, extra: string[] = []) => {
    const nov = noveltyText(def);
    setBanner({
      title: def.goal.type === "none" ? "Tages-Herausforderung" : `Level ${def.level}`,
      lines: [...extra, goalText(def), ...(nov ? [nov] : [])],
      def,
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

  const swap = useCallback(
    async (a: number, b: number) => {
      const state = gameRef.current;
      if (!state || busy || phase !== "playing" || banner) return;
      setHint(null);
      const res = applyMove(state, a, b);
      const swapped = state.board.slice() as (Piece | null)[];
      [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
      setBusy(true);
      setSpawnFrom({});
      setCells(swapped);

      if (!res.ok) {
        sfx("error", 0.6);
        await sleep(190);
        if (!alive.current) return;
        setCells(state.board.slice());
        await sleep(190);
        setBusy(false);
        return;
      }

      sfx("click", 0.6);
      movesRef.current = [...movesRef.current, encodeMove(a, b)];
      const info = runRef.current;
      if (info) writeSaved({ ...info, moves: movesRef.current, savedAt: Date.now() }, mode);
      await sleep(170);

      let score = state.score;
      for (const step of res.steps) {
        if (!alive.current) return;
        if (step.type === "clear") {
          score += step.points;
          setLiveScore(score);
          setCombo(step.cascade);
          if (step.fired.length > 0) {
            setBlasts(step.fired.map((f) => ({ key: `b${keyCounter.current++}`, index: f.index, special: f.special })));
            sfx(step.fired.some((f) => f.special === "prism") ? "spell" : "fire", 0.7);
          } else sfx(step.cascade === 1 ? "click" : "ping", 0.5 + Math.min(0.4, step.cascade * 0.1));
          if (step.created.length > 0) sfx("buff", 0.6);
          if (step.cleared.some((c) => c.kind === "stone")) sfx("block", 0.8);
          const spots = step.cleared.length > 0 ? step.cleared : step.created;
          if (spots.length > 0) {
            const mid = spots[Math.floor(spots.length / 2)].index;
            setPopups((p) => [...p.slice(-6), { key: `p${keyCounter.current++}`, index: mid, text: `+${fmt(step.points)}` }]);
          }
          setSpawnFrom({});
          setCells(step.board);
          await sleep(step.fired.length > 0 ? 300 : 220);
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
          sfx("level", 0.9);
          score += step.bonus;
          setLiveScore(score);
          await sleep(350);
          const from: Record<number, number> = {};
          step.board.forEach((p) => (from[p.id] = COLS + 1));
          setCells([]);
          await sleep(200);
          levelBanner(step.def, [`Level ${step.def.level - 1} geschafft!`, ...(step.bonus > 0 ? [`Bonus für übrige Züge: +${fmt(step.bonus)}`] : [])]);
          setSpawnFrom(from);
          setCells(step.board);
        }
      }
      if (!alive.current) return;
      setCombo(0);
      setPopups([]);
      gameRef.current = res.state;
      setGame(res.state);
      setLiveScore(res.state.score);
      setBusy(false);
      if (res.state.over) {
        sfx(res.state.mode === "daily" ? "win" : "lose", 0.8);
        setNotice(res.state.mode === "daily" ? "Alle Züge gespielt!" : "Keine Züge mehr — Ziel verfehlt");
        await sleep(1400);
        if (!alive.current) return;
        setNotice(null);
        void submit();
      }
    },
    [banner, busy, levelBanner, mode, phase, sfx, submit],
  );

  // Hinweis nach etwas Leerlauf
  useEffect(() => {
    if (phase !== "playing" || busy || banner || !game || game.over) return;
    const t = setTimeout(() => setHint(findHint(game.board)), HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [phase, busy, banner, game]);

  // Level-Ansage schließt sich von selbst
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [banner]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundSettings({ muted: next });
  };

  const fullscreen = phase !== "menu";
  const goal = game ? goalProgress(game) : null;
  const goalDone = goal ? goal.value >= goal.target : false;

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
            <li>Felsen lassen sich nicht kombinieren — nur Explosionen von Sondersteinen zerstören sie.</li>
            {mode === "classic" ? (
              <li>Jedes Level hat ein Ziel und eine begrenzte Zahl an Zügen. Wer sein Ziel verfehlt, ist raus.</li>
            ) : (
              <li>Alle spielen heute dasselbe Brett: 30 Züge, so viele Punkte wie möglich. Dein bester Versuch zählt.</li>
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
            <p className="text-[11px] text-gray-500 truncate">
              {game?.mode === "classic" ? `Level ${game.level} · ${game.def.colors} Farben` : subtitle}
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
                  disabled={busy}
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
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Punkte" value={fmt(liveScore)} />
            <Stat label="Züge" value={String(game.movesLeft)} warn={game.movesLeft <= 5} />
            {goal ? (
              <div className="glass rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 shrink-0">
                    <GoalIcon def={game.def} />
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${goalDone ? "text-emerald-300" : "text-white"}`}>
                    {game.def.goal.type === "score" ? `${Math.round((goal.value / goal.target) * 100)} %` : `${goal.value}/${goal.target}`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-300 transition-all duration-300" style={{ width: `${Math.min(100, (goal.value / goal.target) * 100)}%` }} />
                </div>
              </div>
            ) : (
              <Stat label={bestLabel.split(" ")[0]} value={best > 0 ? fmt(best) : "–"} />
            )}
          </div>
        )}
        {game && game.def.goal.type !== "none" && <p className="text-[11px] text-gray-400 text-center">{goalText(game.def)}</p>}

        {/* Brett */}
        <div className="relative">
          <GemsBoard
            cells={cells}
            spawnFrom={spawnFrom}
            disabled={busy || phase !== "playing" || !!banner}
            hint={hint}
            blasts={blasts}
            popups={popups}
            onSwap={swap}
          />
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                key={`combo-${combo}`}
                className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400/90 text-gray-900 text-sm font-black pointer-events-none"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                Kombo ×{combo}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {(banner || notice) && (
              <motion.button
                type="button"
                onClick={() => setBanner(null)}
                className="absolute inset-0 flex items-center justify-center p-6 rounded-2xl bg-black/55 backdrop-blur-[2px] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="space-y-2 max-w-xs">
                  {banner ? (
                    <>
                      {banner.def && banner.def.goal.type !== "score" && banner.def.goal.type !== "none" && (
                        <div className="w-12 h-12 mx-auto">
                          <GoalIcon def={banner.def} />
                        </div>
                      )}
                      <p className="font-display text-3xl font-black text-white">{banner.title}</p>
                      {banner.lines.map((l, i) => (
                        <p key={i} className={i === banner.lines.length - 1 && banner.def?.novelty !== "none" && banner.def?.novelty !== "start" ? "text-sm text-amber-200" : "text-sm text-gray-200"}>
                          {l}
                        </p>
                      ))}
                      <p className="text-[10px] text-gray-400 pt-1">Tippen zum Weiterspielen</p>
                    </>
                  ) : (
                    <p className="font-display text-xl font-black text-white">{notice}</p>
                  )}
                </motion.div>
              </motion.button>
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
                  {mode === "classic" && result && <p className="text-sm text-gray-400">Level {result.level}</p>}
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
