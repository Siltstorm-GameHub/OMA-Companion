"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Eye, EyeOff, Maximize2, X, Smartphone, Settings, Radio, Loader2, Timer, Swords, Moon, Rocket, Clapperboard, LogOut, LayoutGrid, Tv2,
  ArrowRight as SkipForward,
} from "@/components/icons";
import { SCENE_LABELS, type OverlayControl, type OverlayScene } from "@/components/overlay/types";
import OverlayLayoutsEditor, { type OverlayLayouts } from "@/components/overlay/OverlayLayoutsEditor";

type ElementInfo = { key: string; label: string; available: boolean; zoomable: boolean };
type ControlState = {
  mode: "event" | "profile";
  title: string | null;
  eventZoom: string | null;
  elements: ElementInfo[];
  control: OverlayControl;
  /** Anzahl Clips im Community-Clip-Loop dieses Streamers. */
  clipCount: number;
};

const SCENES: { key: OverlayScene; icon: typeof Swords; hint: string }[] = [
  { key: "gameplay", icon: Swords,       hint: "Kacheln übers Spiel" },
  { key: "pause",    icon: Moon,         hint: "Vollbild-Pause" },
  { key: "intro",    icon: Rocket,       hint: "Clips + Countdown" },
  { key: "clips",    icon: Clapperboard, hint: "Community-Clips" },
  { key: "outro",    icon: LogOut,       hint: "Clips zum Schluss" },
];
const CLIP_SCENES: OverlayScene[] = ["intro", "clips", "outro"];

const POLL_MS = 4000;
const DURATIONS: { label: string; seconds: number | null }[] = [
  { label: "10 s", seconds: 10 },
  { label: "30 s", seconds: 30 },
  { label: "Dauerhaft", seconds: null },
];
const COUNTDOWN_MINUTES = [3, 5, 10, 15];

/**
 * Fernbedienung fürs eigene OBS-Overlay: Szene wechseln (Spiel, Pause, Intro, Clips, Outro — es
 * reicht EINE Browser-Quelle in OBS), Elemente groß einblenden (zeitlich begrenzt oder dauerhaft),
 * ein-/ausblenden und Position/Größe aller Bausteine anpassen. Fragt den Zustand regelmäßig ab,
 * damit ein Wechsel zwischen Event- und Profil-Modus (Event startet/endet) ohne Neuladen ankommt.
 */
export default function LiveControl({ layouts }: { layouts: OverlayLayouts }) {
  const [state, setState] = useState<ControlState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState<number | null>(10);
  // Restzeit eines zeitlich begrenzten Zooms in Sekunden — kommt vom Server und wird hier nur
  // heruntergezählt (unabhängig von der Uhr des Geräts).
  const [remaining, setRemaining] = useState<number | null>(null);
  // Restzeit des Intro-Countdowns in Sekunden — ebenfalls vom Server, nur lokal heruntergezählt.
  const [countdown, setCountdown] = useState<number | null>(null);
  const busyRef = useRef(false);
  const applyRemaining = (ms: number | null | undefined) => setRemaining(ms == null ? null : Math.ceil(ms / 1000));
  const applyCountdown = (ms: number | null | undefined) => setCountdown(ms == null ? null : Math.ceil(ms / 1000));

  const load = useCallback(async () => {
    if (busyRef.current) return; // keine laufende Änderung mit älterem Stand überschreiben
    try {
      const res = await fetch("/api/profile/overlay/control", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Konnte nicht geladen werden"); return; }
      setState(data);
      applyRemaining(data.zoomRemainingMs);
      applyCountdown(data.countdownRemainingMs);
      setError(null);
    } catch {
      setError("Keine Verbindung – versuche es gleich erneut");
    }
  }, []);

  useEffect(() => {
    // Erster Abruf direkt, danach im Takt — alles in Callbacks, kein setState im Effect-Körper.
    const first = setTimeout(load, 0);
    const t = setInterval(load, POLL_MS);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  const counting = remaining != null && remaining > 0;
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setRemaining(r => (r != null && r > 0 ? r - 1 : r)), 1000);
    return () => clearInterval(t);
  }, [counting]);

  const countingDown = countdown != null && countdown > 0;
  useEffect(() => {
    if (!countingDown) return;
    const t = setInterval(() => setCountdown(c => (c != null && c > 0 ? c - 1 : c)), 1000);
    return () => clearInterval(t);
  }, [countingDown]);

  async function update(
    patch: Partial<{ zoom: string | null; zoomSeconds: number | null; hidden: string[]; scene: OverlayScene; countdownMinutes: number | null; skipClip: true }>,
    optimistic: Partial<OverlayControl>,
    optimisticRemaining?: number | null,
  ) {
    if (!state) return;
    const previous = state;
    const previousRemaining = remaining;
    const previousCountdown = countdown;
    setState({ ...state, control: { ...state.control, ...optimistic } });
    if (optimisticRemaining !== undefined) setRemaining(optimisticRemaining);
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/profile/overlay/control", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Fehlgeschlagen");
      setState(s => (s ? { ...s, control: data.control } : s));
      applyRemaining(data.zoomRemainingMs);
      applyCountdown(data.countdownRemainingMs);
    } catch (e) {
      setState(previous);
      setRemaining(previousRemaining);
      setCountdown(previousCountdown);
      toast.error(e instanceof Error ? e.message : "Fehlgeschlagen");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <div className="max-w-xl mx-auto w-full p-4 sm:p-8 flex items-center gap-2 text-sm text-gray-400">
        {error ?? <><Loader2 className="w-4 h-4 animate-spin" /> Lade Overlay-Status …</>}
      </div>
    );
  }

  const { control } = state;
  // Abgelaufen, der nächste Abruf räumt es auf — bis dahin schon nicht mehr als aktiv anzeigen.
  const activeZoom = remaining === 0 ? null : control.zoom;
  const zoomable = state.elements.filter(e => e.zoomable);
  const labelOf = (key: string | null) => state.elements.find(e => e.key === key)?.label ?? key;

  const startZoom = (key: string) => update({ zoom: key, zoomSeconds: duration }, { zoom: key }, duration);
  const stopZoom = () => update({ zoom: null }, { zoom: null, zoomUntil: null }, null);
  const setScene = (scene: OverlayScene) => update({ scene }, { scene });
  const skipClip = () => update({ skipClip: true }, {});
  const startCountdown = (minutes: number) => {
    setCountdown(minutes * 60);
    update({ countdownMinutes: minutes }, {});
  };
  const stopCountdown = () => {
    setCountdown(null);
    update({ countdownMinutes: null }, { countdownUntil: null });
  };
  const countdownLabel = countdown != null
    ? `${String(Math.floor(countdown / 60)).padStart(2, "0")}:${String(countdown % 60).padStart(2, "0")}`
    : null;
  const toggleHidden = (key: string) => {
    const hidden = control.hidden.includes(key) ? control.hidden.filter(k => k !== key) : [...control.hidden, key];
    update({ hidden }, { hidden });
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Overlay-Steuerung</h1>
        <p className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
          <Radio className={`w-3.5 h-3.5 ${state.mode === "event" ? "text-rose-400" : "text-gray-500"}`} />
          {state.mode === "event" ? <>Event-Modus · <span className="text-gray-200">{state.title}</span></> : "Profil-Modus (kein laufendes Event)"}
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />}
        </p>
        {error && <p className="text-xs text-amber-300 mt-1">{error}</p>}
      </div>

      {/* ── Szene ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Tv2 className="w-3.5 h-3.5" /> Szene
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {SCENES.map(({ key, icon: Icon, hint }) => {
            const active = control.scene === key;
            return (
              <button
                key={key}
                onClick={() => setScene(key)}
                aria-pressed={active}
                className={`rounded-xl px-2 py-3.5 border transition-all ${
                  active
                    ? "bg-teal-500/20 border-teal-400/60 text-teal-100"
                    : "border-white/[0.08] text-gray-200 hover:border-teal-500/40 hover:bg-teal-500/10"
                }`}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <span className="block text-sm font-semibold">{SCENE_LABELS[key]}</span>
                <span className="block text-[10px] text-gray-500">{hint}</span>
              </button>
            );
          })}
        </div>
        {CLIP_SCENES.includes(control.scene) && (
          <button
            onClick={skipClip}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border border-white/[0.08] text-gray-200 hover:border-teal-500/40 hover:bg-teal-500/10"
          >
            <SkipForward className="w-4 h-4" /> Nächster Clip
          </button>
        )}
        <p className="text-xs text-gray-500">
          {CLIP_SCENES.includes(control.scene)
            ? state.clipCount > 0
              ? <>{state.clipCount} Community-Clips im Loop.</>
              : <span className="text-amber-300">Gerade keine Community-Clips verfügbar – die Szene zeigt so lange die Logo-Karte.</span>
            : <>Gilt für deinen OBS-Link ohne feste Szene. {state.clipCount > 0 && <>{state.clipCount} Community-Clips bereit.</>}</>}
        </p>
      </div>

      {/* ── Intro-Countdown ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" /> Intro-Countdown
          </h2>
          {countdownLabel && (
            <span className="text-sm font-semibold text-teal-200 tabular-nums">
              {countdown === 0 ? "abgelaufen" : `noch ${countdownLabel}`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COUNTDOWN_MINUTES.map(m => (
            <button
              key={m}
              onClick={() => startCountdown(m)}
              className="rounded-xl py-3 text-sm font-semibold border border-white/[0.08] text-gray-200 hover:border-teal-500/40 hover:bg-teal-500/10 transition-all"
            >
              {m} min
            </button>
          ))}
        </div>
        {countdown != null && (
          <button
            onClick={stopCountdown}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border border-rose-400/40 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20"
          >
            <X className="w-4 h-4" /> Countdown beenden
          </button>
        )}
        <p className="text-xs text-gray-500">Erscheint in deiner Intro-Szene (Overlay-Einstellungen → Intro-Szene).</p>
      </div>

      {/* ── Groß einblenden ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" /> Groß einblenden
          </h2>
          <div className="flex rounded-xl border border-white/[0.08] overflow-hidden text-xs">
            {DURATIONS.map(d => (
              <button
                key={d.label}
                onClick={() => setDuration(d.seconds)}
                className={`px-2.5 py-1.5 transition-colors ${duration === d.seconds ? "bg-teal-500/20 text-teal-200" : "text-gray-400 hover:text-gray-200"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {zoomable.map(e => {
            const active = activeZoom === e.key;
            return (
              <button
                key={e.key}
                disabled={!e.available}
                onClick={() => (active ? stopZoom() : startZoom(e.key))}
                className={`rounded-xl px-3 py-4 text-sm font-semibold border transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                  active
                    ? "bg-teal-500/25 border-teal-400/60 text-teal-100"
                    : "border-white/[0.08] text-gray-200 hover:border-teal-500/40 hover:bg-teal-500/10"
                }`}
              >
                {e.label}
                {active && <span className="block text-xs font-normal text-teal-200/80 mt-0.5">{remaining != null ? `noch ${remaining} s` : "dauerhaft"}</span>}
                {!e.available && <span className="block text-[11px] font-normal text-gray-500 mt-0.5">gerade ohne Inhalt</span>}
              </button>
            );
          })}
        </div>

        {activeZoom && (
          <button
            onClick={stopZoom}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border border-rose-400/40 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20"
          >
            <X className="w-4 h-4" /> Zurück zum normalen Overlay
          </button>
        )}
        {!activeZoom && state.eventZoom && (
          <p className="text-xs text-gray-500">
            Gerade vom Turnier-Tisch für alle eingeblendet: <span className="text-gray-300">{labelOf(state.eventZoom)}</span>.
            Dein eigener Zoom hat Vorrang.
          </p>
        )}
      </div>

      {/* ── Ein- und ausblenden ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Ein- und ausblenden
        </h2>
        <div className="space-y-2">
          {state.elements.map(e => {
            const hidden = control.hidden.includes(e.key);
            return (
              <button
                key={e.key}
                onClick={() => toggleHidden(e.key)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm border transition-all ${
                  hidden ? "border-white/[0.06] text-gray-500" : "border-teal-500/30 text-gray-100 bg-teal-500/5"
                }`}
              >
                <span className="text-left">
                  {e.label}
                  {!e.available && <span className="block text-[11px] text-gray-500">gerade ohne Inhalt</span>}
                </span>
                <span className="flex items-center gap-1.5 text-xs shrink-0">
                  {hidden ? <><EyeOff className="w-4 h-4" /> Aus</> : <><Eye className="w-4 h-4 text-teal-300" /> An</>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">
          Gilt nur für Elemente, die in deinem Layout aktiv sind – welche das sind, legst du unten unter „Position, Größe & Sichtbarkeit“ fest.
        </p>
      </div>

      {/* ── Position & Größe ── */}
      <div>
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          <LayoutGrid className="w-3.5 h-3.5" /> Position, Größe & Sichtbarkeit
        </h2>
        <OverlayLayoutsEditor
          initial={layouts}
          initialTab={CLIP_SCENES.includes(control.scene) ? "clips" : control.scene === "pause" ? "pause" : state.mode}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" /> Tipp: Öffne diese Seite auf dem Handy neben dem Stream.
        </span>
        <Link href="/profile/overlay" className="flex items-center gap-1.5 hover:text-teal-300">
          <Settings className="w-3.5 h-3.5" /> Overlay-Einstellungen
        </Link>
      </div>
    </div>
  );
}
