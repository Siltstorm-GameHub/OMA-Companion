"use client";
// ============================================
// OMA Blocks — Solo (Marathon) mit Highscore-Wertung
// ============================================
// Ablauf: Start → Server vergibt Seed (/api/blocks/runs) → Countdown → Spiel → beim Game Over werden
// Eingaben + Frames eingereicht (/api/blocks/runs/[id]); der Server spielt nach und wertet.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BlocksEngine, EngineStats } from "@/lib/blocks/engine";
import { FPS } from "@/lib/blocks/engine";
import BlocksPlayfield from "./BlocksPlayfield";
import SettingsPanel from "./SettingsPanel";
import FullscreenShell, { requestPhoneFullscreen, useIsPhone } from "./FullscreenShell";
import { useBlocksSettings } from "./settings";
import type { BlocksRunner, RunnerResult } from "./runner";
import { Button, Modal } from "@/components/ui";
import { ArrowLeft, Pause, Play, RotateCcw, Settings, Trophy } from "@/components/icons";

type Phase = "idle" | "loading" | "countdown" | "playing" | "paused" | "submitting" | "result";

interface SubmitResult {
  score: number;
  lines: number;
  level: number;
  newMonthBest: boolean;
  newAllTimeBest: boolean;
  monthBest: number;
  allTimeBest: number;
  monthPlace: number | null;
  allTimePlace: number | null;
}

interface Hud {
  score: number;
  lines: number;
  level: number;
  frame: number;
  pieces: number;
}

const fmt = (n: number) => n.toLocaleString("de-DE");
function fmtTime(frames: number): string {
  const s = Math.floor(frames / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function BlocksSoloClient({
  initialMonthBest,
  initialAllTimeBest,
  seasonLabel,
}: {
  initialMonthBest: number;
  initialAllTimeBest: number;
  seasonLabel: string;
}) {
  const [settings, saveSettings] = useBlocksSettings();
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<{ id: string; seed: number } | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<Hud>({ score: 0, lines: 0, level: 1, frame: 0, pieces: 0 });
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [localStats, setLocalStats] = useState<EngineStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [bests, setBests] = useState({ month: initialMonthBest, all: initialAllTimeBest });
  const runnerRef = useRef<BlocksRunner | null>(null);
  const isPhone = useIsPhone();
  const fullscreen = isPhone && phase !== "idle";
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const start = useCallback(async () => {
    if (isPhone) requestPhoneFullscreen();
    setPhase("loading");
    setError(null);
    setResult(null);
    setLocalStats(null);
    try {
      const res = await fetch("/api/blocks/runs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Konnte keine Runde starten.");
      setRun({ id: data.runId, seed: data.seed });
      setHud({ score: 0, lines: 0, level: 1, frame: 0, pieces: 0 });
      setCountdown(3);
      setPhase("countdown");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte keine Runde starten.");
      setPhase("idle");
    }
  }, [isPhone]);

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Auto-Pause bei Tab-Wechsel
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPhase((p) => (p === "playing" ? "paused" : p));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const submit = useCallback(async (r: RunnerResult) => {
    const current = runRef.current;
    setLocalStats(r.stats);
    if (!current) return;
    setPhase("submitting");
    try {
      const res = await fetch(`/api/blocks/runs/${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handling: runnerRef.current?.engine.handling ?? settings.handling, inputs: r.inputs, frames: r.frames }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ergebnis konnte nicht gespeichert werden.");
      setResult(data);
      setBests({ month: data.monthBest, all: data.allTimeBest });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ergebnis konnte nicht gespeichert werden.");
    } finally {
      setPhase("result");
    }
  }, [settings.handling]);

  const onSync = useCallback((e: BlocksEngine) => {
    const s = e.stats;
    setHud((h) =>
      h.score === s.score && h.lines === s.lines && h.level === s.level && Math.floor(h.frame / FPS) === Math.floor(s.frame / FPS)
        ? h
        : { score: s.score, lines: s.lines, level: s.level, frame: s.frame, pieces: s.pieces },
    );
  }, []);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === "playing" ? "paused" : p === "paused" ? "playing" : p));
  }, []);

  const restart = useCallback(() => {
    if (phase === "playing" || phase === "paused") {
      // Laufende Runde aufgeben — wird trotzdem gewertet.
      runnerRef.current?.forfeit();
      return;
    }
    if (phase === "idle" || phase === "result") void start();
  }, [phase, start]);

  // Enter / Leertaste startet aus Start-/Ergebnis-Bildschirm
  useEffect(() => {
    if (phase !== "idle" && phase !== "result") return;
    const onKey = (e: KeyboardEvent) => {
      if (showSettings) return;
      if (e.code === "Enter") {
        e.preventDefault();
        void start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start, showSettings]);

  const pps = hud.frame > 0 ? (hud.pieces / (hud.frame / FPS)).toFixed(2) : "0.00";
  const finalStats = result ?? (localStats ? { score: localStats.score, lines: localStats.lines, level: localStats.level } : null);

  let overlay: React.ReactNode = null;
  if (phase === "idle" || phase === "loading") {
    overlay = (
      <div className="glass-heavy rounded-2xl p-5 text-center space-y-3 max-w-[85%]">
        <p className="font-display text-xl font-black text-white">Marathon</p>
        <p className="text-xs text-gray-400">Räume Linien, steig im Level auf und hol dir den Highscore. Alle 10 Linien wird es schneller.</p>
        <Button onClick={() => void start()} loading={phase === "loading"} icon={<Play className="w-4 h-4" />} className="w-full">
          Spielen
        </Button>
        <p className="text-[10px] text-gray-500 hidden sm:block">oder Enter drücken</p>
      </div>
    );
  } else if (phase === "countdown") {
    overlay = <p className="font-display text-6xl font-black text-white drop-shadow-lg">{countdown > 0 ? countdown : "LOS"}</p>;
  } else if (phase === "paused") {
    overlay = (
      <div className="glass-heavy rounded-2xl p-5 text-center space-y-3">
        <p className="font-display text-xl font-black text-white">Pause</p>
        <Button onClick={togglePause} icon={<Play className="w-4 h-4" />} className="w-full">Weiter</Button>
        <Button variant="ghost" onClick={restart} className="w-full">Aufgeben</Button>
      </div>
    );
  } else if (phase === "submitting" || phase === "result") {
    overlay = (
      <div className="glass-heavy rounded-2xl p-5 text-center space-y-3 max-w-[90%] w-72">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Game Over</p>
        <p className="font-display text-4xl font-black text-white tabular-nums">{fmt(finalStats?.score ?? 0)}</p>
        <p className="text-xs text-gray-400">{finalStats?.lines ?? 0} Linien · Level {finalStats?.level ?? 1}</p>
        {phase === "submitting" && <p className="text-xs text-gray-500">Wird gewertet …</p>}
        {result && (
          <div className="space-y-1 text-xs">
            {result.newAllTimeBest && <p className="font-bold text-amber-300">Neuer All-Time-Rekord!</p>}
            {!result.newAllTimeBest && result.newMonthBest && <p className="font-bold text-teal-300">Neue Monatsbestleistung!</p>}
            <p className="text-gray-400">
              {result.monthPlace ? `Platz ${result.monthPlace} im ${seasonLabel}` : "Noch nicht in der Monatswertung"}
              {result.allTimePlace ? ` · Platz ${result.allTimePlace} All-Time` : ""}
            </p>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={() => void start()} disabled={phase === "submitting"} icon={<RotateCcw className="w-4 h-4" />} className="flex-1">
            Nochmal
          </Button>
          <Link href="/gems?spiel=blocks" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-sm px-3 py-2">
            <Trophy className="w-4 h-4" /> Rangliste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <FullscreenShell active={fullscreen}>
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/gems?spiel=blocks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> OMA Blocks
        </Link>
        <div className="flex items-center gap-1">
          {(phase === "playing" || phase === "paused") && (
            <Button variant="ghost" size="sm" onClick={togglePause} icon={phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}>
              {phase === "paused" ? "Weiter" : "Pause"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (phase === "playing") setPhase("paused");
              setShowSettings(true);
            }}
            icon={<Settings className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Einstellungen</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Punkte", value: fmt(hud.score) },
          { label: "Linien", value: String(hud.lines) },
          { label: "Level", value: String(hud.level) },
          { label: "Zeit", value: fmtTime(hud.frame), sub: `${pps} T/s` },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl px-2 py-1.5">
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">{s.label}</p>
            <p className="text-sm sm:text-base font-bold text-white tabular-nums leading-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <BlocksPlayfield
        key={run?.id ?? "vorschau"}
        seed={run?.seed ?? 1}
        mode="marathon"
        handling={settings.handling}
        ghost={settings.ghost}
        touchControls={settings.touchControls}
        gestures={settings.gestures}
        haptics={settings.haptics}
        running={phase === "playing"}
        runnerRef={runnerRef}
        onSync={onSync}
        onGameOver={(r) => void submit(r)}
        onPauseKey={togglePause}
        onRestartKey={restart}
        reserveHeight={fullscreen ? 175 : 250}
        overlay={overlay}
      />

      <p className="text-center text-[11px] text-gray-500">
        Bestwert {seasonLabel}: <span className="text-white font-semibold tabular-nums">{fmt(bests.month)}</span> · All-Time:{" "}
        <span className="text-white font-semibold tabular-nums">{fmt(bests.all)}</span>
      </p>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Einstellungen">
        <SettingsPanel settings={settings} onChange={saveSettings} />
        <p className="text-[11px] text-gray-500 mt-4">Geänderte Steuerung gilt ab der nächsten Runde.</p>
      </Modal>
    </div>
    </FullscreenShell>
  );
}
