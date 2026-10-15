"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Swords, Sparkles, Moon, Clapperboard, RotateCcw, Save, Loader2 } from "@/components/icons";
import LayoutEditor from "./LayoutEditor";
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

const TABS: { key: LayoutTab; label: string; icon: typeof Swords }[] = [
  { key: "event",   label: "Spiel · Event",       icon: Swords },
  { key: "profile", label: "Spiel · ohne Event",  icon: Sparkles },
  { key: "pause",   label: "Pause",               icon: Moon },
  { key: "clips",   label: "Intro / Clips / Outro", icon: Clapperboard },
];

const NO_STACK: readonly never[] = [];

/**
 * Position, Größe und Sichtbarkeit aller Bausteine aller Szenen — gemeinsam genutzt von den
 * Overlay-Einstellungen und der Live-Steuerung. Speichert eigenständig; offene OBS-Quellen
 * übernehmen die Änderung binnen ~2s.
 */
export default function OverlayLayoutsEditor({ initial, initialTab = "event" }: { initial: OverlayLayouts; initialTab?: LayoutTab }) {
  const [tab, setTab] = useState<LayoutTab>(initialTab);
  const [layouts, setLayouts] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(layouts) !== saved;

  const set = <T extends LayoutTab>(key: T) => (value: OverlayLayouts[T]) => setLayouts(l => ({ ...l, [key]: value }));

  function reset() {
    const defaults: OverlayLayouts = {
      event: defaultStreamerEventLayout(), profile: defaultProfileLayout(), pause: defaultPauseLayout(), clips: defaultClipLayout(),
    };
    setLayouts(l => ({ ...l, [tab]: defaults[tab] }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/overlay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: layouts.event, profile: layouts.profile, pauseLayout: layouts.pause, clipLayout: layouts.clips }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      setSaved(JSON.stringify(layouts));
      toast.success("Layout gespeichert – dein Overlay übernimmt es in wenigen Sekunden");
    } finally {
      setSaving(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium transition-all ${
      active ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
    }`;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key} className={tabClass(tab === t.key)} onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4 shrink-0" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "event" && (
        <LayoutEditor options={EVENT_EDITOR_OPTIONS} stackable={STACKABLE_ELEMENTS} elementSize={ELEMENT_SIZE}
          defaultPositions={DEFAULT_EVENT_POSITIONS} value={layouts.event} onChange={set("event")} />
      )}
      {tab === "profile" && (
        <LayoutEditor options={PROFILE_EDITOR_OPTIONS} stackable={PROFILE_STACKABLE} elementSize={PROFILE_ELEMENT_SIZE}
          defaultPositions={DEFAULT_PROFILE_POSITIONS} value={layouts.profile} onChange={set("profile")} />
      )}
      {tab === "pause" && (
        <LayoutEditor options={PAUSE_EDITOR_OPTIONS} stackable={NO_STACK} elementSize={PAUSE_ELEMENT_SIZE}
          defaultPositions={DEFAULT_PAUSE_POSITIONS} value={layouts.pause} onChange={set("pause")} stacking={false} />
      )}
      {tab === "clips" && (
        <LayoutEditor options={CLIP_EDITOR_OPTIONS} stackable={NO_STACK} elementSize={CLIP_ELEMENT_SIZE}
          defaultPositions={DEFAULT_CLIP_POSITIONS} value={layouts.clips} onChange={set("clips")} stacking={false} />
      )}

      <div className="sticky bottom-4 glass rounded-2xl p-3 flex items-center gap-3">
        <span className="text-xs text-gray-500 flex-1">{dirty ? "Ungespeicherte Layout-Änderungen" : "Layout gespeichert"}</span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-gray-200 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Standard
        </button>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition-all font-medium disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Layout speichern
        </button>
      </div>
    </div>
  );
}
