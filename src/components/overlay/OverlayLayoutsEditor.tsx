"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Swords, Sparkles, Moon, Clapperboard, RotateCcw, Check, Loader2 } from "@/components/icons";
import LayoutEditor from "./LayoutEditor";
import PresetPicker from "./PresetPicker";
import HelpTip from "./HelpTip";
import { matchingPreset, type LayoutPreset } from "./layoutPresets";
import { EVENT_EDITOR_OPTIONS, PROFILE_EDITOR_OPTIONS, PAUSE_EDITOR_OPTIONS, CLIP_EDITOR_OPTIONS } from "./editorOptions";
import { DEFAULT_EVENT_POSITIONS, DEFAULT_PROFILE_POSITIONS, defaultStreamerEventLayout, defaultProfileLayout } from "./layout";
import {
  PAUSE_ELEMENT_SIZE, CLIP_ELEMENT_SIZE, DEFAULT_PAUSE_POSITIONS, DEFAULT_CLIP_POSITIONS, defaultPauseLayout, defaultClipLayout,
  type PauseElementKey, type ClipElementKey,
} from "./sceneLayouts";
import {
  ELEMENT_SIZE, PROFILE_ELEMENT_SIZE, STACKABLE_ELEMENTS, PROFILE_STACKABLE,
  type ElementKey, type ProfileElementKey, type OverlayLayout,
} from "./types";

export type LayoutTab = "event" | "profile" | "pause" | "clips";

export type OverlayLayouts = {
  event: OverlayLayout<ElementKey>;
  profile: OverlayLayout<ProfileElementKey>;
  pause: OverlayLayout<PauseElementKey>;
  clips: OverlayLayout<ClipElementKey>;
};

const TABS: { key: LayoutTab; label: string; icon: typeof Swords; help: string }[] = [
  { key: "event",   label: "Während eines Turniers", icon: Swords,       help: "So sieht dein Overlay aus, wenn du bei einem OMA-Event mitspielst und live bist (oder dich als Streamer angemeldet hast)." },
  { key: "profile", label: "Normales Streamen",      icon: Sparkles,     help: "So sieht dein Overlay aus, wenn gerade kein Turnier läuft." },
  { key: "pause",   label: "Pause",                  icon: Moon,         help: "Vollbild für Pausen – wechselst du in der Live-Steuerung." },
  { key: "clips",   label: "Intro / Clips / Outro",  icon: Clapperboard, help: "Vollbild mit Community-Clips – für Start, Pause und Ende deines Streams." },
];

const NO_STACK: readonly never[] = [];
const LAYOUT_KEYS: LayoutTab[] = ["event", "profile", "pause", "clips"];
/** Feldnamen der Speicher-API je Layout. */
const API_FIELD: Record<LayoutTab, string> = { event: "event", profile: "profile", pause: "pauseLayout", clips: "clipLayout" };
/** Kurz warten, bis das Ziehen/Klicken vorbei ist — dann automatisch speichern. */
const AUTOSAVE_MS = 700;

const snapshotOf = (l: OverlayLayouts) => Object.fromEntries(LAYOUT_KEYS.map(k => [k, JSON.stringify(l[k])])) as Record<LayoutTab, string>;

/**
 * Position, Größe und Sichtbarkeit aller Bausteine aller Szenen — gemeinsam genutzt von den
 * Overlay-Einstellungen und der Live-Steuerung. Speichert automatisch und nur das jeweils
 * geänderte Layout (so überschreibt eine zweite, ältere offene Seite nicht die übrigen);
 * offene OBS-Quellen übernehmen die Änderung binnen ~2s.
 */
export default function OverlayLayoutsEditor({
  initial, initialTab = "event", overlayUrl,
}: { initial: OverlayLayouts; initialTab?: LayoutTab; /** Fester Overlay-Link — für die Live-Vorschau im Editor. */ overlayUrl?: string }) {
  const [tab, setTab] = useState<LayoutTab>(initialTab);
  // Vorschau-Varianten: Beispielturnier als Liga oder K.-o., Pausen-Szene mit/ohne Turnier.
  const [demo, setDemo] = useState<"liga" | "ko">("liga");
  const [pauseMode, setPauseMode] = useState<"profile" | "event">("profile");
  const [layouts, setLayouts] = useState(initial);
  const [saved, setSaved] = useState(() => snapshotOf(initial));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const current = snapshotOf(layouts);
  const changed = LAYOUT_KEYS.filter(k => current[k] !== saved[k]);
  const changedKey = changed.join(",");
  // Noch nicht gesendete Änderungen — werden beim Verlassen der Seite sofort gespeichert.
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!changedKey) { pendingRef.current = null; return; }
    const keys = changedKey.split(",") as LayoutTab[];
    const body = Object.fromEntries(keys.map(k => [API_FIELD[k], layouts[k]]));
    const snapshot = Object.fromEntries(keys.map(k => [k, JSON.stringify(layouts[k])]));
    pendingRef.current = body;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch("/api/profile/overlay", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setFailed(true); toast.error(data.error ?? "Layout konnte nicht gespeichert werden"); return; }
        if (pendingRef.current === body) pendingRef.current = null;
        setFailed(false);
        setSaved(s => ({ ...s, ...snapshot }));
      } catch {
        setFailed(true);
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [changedKey, layouts]);

  // Seite verlassen, bevor die Wartezeit um ist: trotzdem speichern.
  useEffect(() => {
    const flush = () => {
      if (!pendingRef.current) return;
      fetch("/api/profile/overlay", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingRef.current), keepalive: true,
      }).catch(() => {});
      pendingRef.current = null;
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

  const set = <T extends LayoutTab>(key: T) => (value: OverlayLayouts[T]) => setLayouts(l => ({ ...l, [key]: value }));

  function applyPreset(preset: LayoutPreset) {
    const before = layouts;
    setLayouts(l => ({ ...l, event: preset.event, profile: preset.profile }));
    toast.success(`Vorlage „${preset.label}“ übernommen`, {
      action: { label: "Rückgängig", onClick: () => setLayouts(l => ({ ...l, event: before.event, profile: before.profile })) },
    });
  }

  // URL der echten Overlay-Vorschau je Reiter (zeigt den gespeicherten Stand, also nach dem
  // automatischen Speichern mit wenigen Sekunden Verzögerung).
  const previewSrc = (() => {
    if (!overlayUrl) return undefined;
    const u = new URL(overlayUrl);
    if (tab === "event") { u.searchParams.set("preview", "event"); u.searchParams.set("demo", demo); }
    if (tab === "profile") u.searchParams.set("preview", "profile");
    if (tab === "pause") { u.searchParams.set("scene", "pause"); u.searchParams.set("preview", pauseMode); u.searchParams.set("demo", demo); }
    if (tab === "clips") { u.searchParams.set("scene", "clips"); u.searchParams.set("preview", "profile"); }
    return u.toString();
  })();

  const toggle = (options: { key: string; label: string }[], value: string, onChange: (v: string) => void) => (
    <span className="flex rounded-lg border border-white/[0.08] overflow-hidden text-xs">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 transition-colors ${value === o.key ? "bg-teal-500/20 text-teal-200" : "text-gray-400 hover:text-gray-200"}`}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
  const previewControls = tab === "event"
    ? <span className="flex items-center gap-2 text-xs text-gray-500">Beispiel: {toggle([{ key: "liga", label: "Liga" }, { key: "ko", label: "K.-o." }], demo, v => setDemo(v as "liga" | "ko"))}</span>
    : tab === "pause"
      ? <span className="flex items-center gap-2 text-xs text-gray-500">Ansicht: {toggle([{ key: "profile", label: "Normal" }, { key: "event", label: "Turnier" }], pauseMode, v => setPauseMode(v as "profile" | "event"))}</span>
      : null;
  const preview = previewSrc ? { src: previewSrc, controls: previewControls } : undefined;

  function reset() {
    const defaults: OverlayLayouts = {
      event: defaultStreamerEventLayout(), profile: defaultProfileLayout(), pause: defaultPauseLayout(), clips: defaultClipLayout(),
    };
    setLayouts(l => ({ ...l, [tab]: defaults[tab] }));
  }

  const tabClass = (active: boolean) =>
    `flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium transition-all ${
      active ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
    }`;

  return (
    <div>
      {/* ── Vorlagen: der schnelle Weg ── */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Vorlage wählen
          <HelpTip text="Ein Klick setzt das Layout für „Während eines Turniers“ und „Normales Streamen“. Danach kannst du darunter alles feinjustieren." />
        </h2>
        <p className="text-xs text-gray-500 mb-3">Der schnellste Weg zu einem fertigen Overlay – danach unten nach Belieben anpassen.</p>
        <PresetPicker active={matchingPreset(layouts.event, layouts.profile)} onPick={applyPreset} />
      </div>

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Selbst anpassen</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {TABS.map(t => (
          <button key={t.key} className={tabClass(tab === t.key)} onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4 shrink-0" /> {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-4 px-1">{TABS.find(t => t.key === tab)?.help}</p>

      {tab === "event" && (
        <LayoutEditor options={EVENT_EDITOR_OPTIONS} stackable={STACKABLE_ELEMENTS} elementSize={ELEMENT_SIZE}
          defaultPositions={DEFAULT_EVENT_POSITIONS} value={layouts.event} onChange={set("event")} preview={preview} />
      )}
      {tab === "profile" && (
        <LayoutEditor options={PROFILE_EDITOR_OPTIONS} stackable={PROFILE_STACKABLE} elementSize={PROFILE_ELEMENT_SIZE}
          defaultPositions={DEFAULT_PROFILE_POSITIONS} value={layouts.profile} onChange={set("profile")} preview={preview} />
      )}
      {tab === "pause" && (
        <LayoutEditor options={PAUSE_EDITOR_OPTIONS} stackable={NO_STACK} elementSize={PAUSE_ELEMENT_SIZE}
          defaultPositions={DEFAULT_PAUSE_POSITIONS} value={layouts.pause} onChange={set("pause")} stacking={false} preview={preview} />
      )}
      {tab === "clips" && (
        <LayoutEditor options={CLIP_EDITOR_OPTIONS} stackable={NO_STACK} elementSize={CLIP_ELEMENT_SIZE}
          defaultPositions={DEFAULT_CLIP_POSITIONS} value={layouts.clips} onChange={set("clips")} stacking={false} preview={preview} />
      )}

      <div className="sticky bottom-4 glass rounded-2xl p-3 flex items-center gap-3">
        <span className={`flex items-center gap-1.5 text-xs flex-1 ${failed ? "text-rose-300" : "text-gray-500"}`}>
          {saving || changed.length > 0
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird gespeichert …</>
            : failed
              ? "Speichern fehlgeschlagen – nächste Änderung versucht es erneut"
              : <><Check className="w-3.5 h-3.5 text-teal-300" /> Layout automatisch gespeichert</>}
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-gray-200 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Diese Szene auf Standard
        </button>
      </div>
    </div>
  );
}
