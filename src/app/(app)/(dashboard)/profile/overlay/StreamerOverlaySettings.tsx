"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Tv2, Copy, Check, ExternalLink, RefreshCw, RotateCcw, Save, Loader2, Radio, Move, Zap,
  Sparkles, Table2, Users, LayoutGrid, Trophy, Swords, TrendingUp, CalendarClock, Clapperboard, Moon, Smartphone,
} from "@/components/icons";
import LayoutEditor, { type EditorElementOption } from "@/components/overlay/LayoutEditor";
import {
  DEFAULT_EVENT_POSITIONS, DEFAULT_PROFILE_POSITIONS, PAUSE_TEXT_MAX,
  defaultStreamerEventLayout, defaultProfileLayout,
} from "@/components/overlay/layout";
import {
  ELEMENT_SIZE, PROFILE_ELEMENT_SIZE, STACKABLE_ELEMENTS, PROFILE_STACKABLE, DEFAULT_PAUSE_TEXT,
  type ElementKey, type ProfileElementKey, type OverlayLayout,
} from "@/components/overlay/types";
import { formatBerlinDate } from "@/lib/time";
import { PAUSE_BACKGROUNDS } from "@/components/overlay/pauseBackgrounds";

type Mode = "event" | "profile";

const EVENT_OPTIONS: EditorElementOption<ElementKey>[] = [
  { key: "brand",        label: "OMA-Logo & Ich",       icon: Sparkles,   fixed: true },
  { key: "liveinfo",     label: "Live / Event / Spiel", icon: Tv2 },
  { key: "ticker",       label: "Aktuelles Match",      icon: Swords },
  { key: "bracket",      label: "Turnierbaum",          icon: LayoutGrid, hint: "nur K.-o.-Turniere" },
  { key: "table",        label: "Tabelle",              icon: Table2,     hint: "Liga, Runden, FFA" },
  { key: "seriesTable",  label: "Gesamttabelle",        icon: Trophy,     hint: "nur Eventreihen" },
  { key: "participants", label: "Teilnehmer",           icon: Users },
];

const PROFILE_OPTIONS: EditorElementOption<ProfileElementKey>[] = [
  { key: "brand",       label: "OMA-Logo & Ich", icon: Sparkles, fixed: true },
  { key: "rank",        label: "Rang",           icon: TrendingUp },
  { key: "nextEvent",   label: "Nächstes Event", icon: CalendarClock, hint: "passend zu deinem Spiel zuerst" },
  { key: "community",   label: "Community",      icon: Clapperboard,  hint: "Clip, Umfrage, Wanderpokal" },
  { key: "liveMembers", label: "Gerade live",    icon: Radio,         hint: "Raid-Tipps" },
];

/** OBS übernimmt beim Hineinziehen eines Links diese Parameter für die neue Browser-Quelle
 *  (Name und Größe) — die Overlay-Seite selbst ignoriert sie. */
function obsDragUrl(url: string, name: string) {
  const u = new URL(url);
  u.searchParams.set("layer-name", name);
  u.searchParams.set("layer-width", "1920");
  u.searchParams.set("layer-height", "1080");
  return u.toString();
}

export default function StreamerOverlaySettings({
  overlayUrl: initialUrl, initialEvent, initialProfile, initialPauseText, initialLite, initialPauseBackground, activeEvent, streamingEvents,
}: {
  overlayUrl: string;
  initialEvent: OverlayLayout<ElementKey>;
  initialProfile: OverlayLayout<ProfileElementKey>;
  initialPauseText: string | null;
  initialLite: boolean;
  initialPauseBackground: string;
  activeEvent: { id: string; title: string } | null;
  /** Kommende Events, für die der User als Streamer angemeldet ist. */
  streamingEvents: { id: string; title: string; startAt: string }[];
}) {
  const [overlayUrl, setOverlayUrl] = useState(initialUrl);
  const [mode, setMode] = useState<Mode>(activeEvent || streamingEvents.length > 0 ? "event" : "profile");
  const [eventLayout, setEventLayout] = useState(initialEvent);
  const [profileLayout, setProfileLayout] = useState(initialProfile);
  const [pauseText, setPauseText] = useState(initialPauseText ?? "");
  const [lite, setLite] = useState(initialLite);
  const [pauseBackground, setPauseBackground] = useState(initialPauseBackground);
  const snapshot = () => JSON.stringify({ eventLayout, profileLayout, pauseText: pauseText.trim(), lite, pauseBackground });
  const [saved, setSaved] = useState(() => JSON.stringify({ eventLayout: initialEvent, profileLayout: initialProfile, pauseText: initialPauseText ?? "", lite: initialLite, pauseBackground: initialPauseBackground }));
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const dirty = snapshot() !== saved;

  const pauseUrl = (() => { const u = new URL(overlayUrl); u.searchParams.set("scene", "pause"); return u.toString(); })();

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/overlay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventLayout, profile: profileLayout, pauseText: pauseText.trim() || null, lite, pauseBackground }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      setSaved(snapshot());
      toast.success("Gespeichert – dein Overlay in OBS übernimmt es in wenigen Sekunden");
    } finally {
      setSaving(false);
    }
  }

  function resetMode() {
    if (mode === "event") setEventLayout(defaultStreamerEventLayout());
    else setProfileLayout(defaultProfileLayout());
  }

  async function regenerate() {
    if (!confirm("Neue Links erzeugen? Die bisherigen funktionieren danach nicht mehr – du musst sie in OBS ersetzen.")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/profile/overlay/regenerate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.overlayUrl) { toast.error(data.error ?? "Link konnte nicht erneuert werden"); return; }
      setOverlayUrl(data.overlayUrl);
      toast.success("Neue Links erzeugt – jetzt in OBS ersetzen");
    } finally {
      setRegenerating(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-xl border font-medium transition-all ${
      active ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
    }`;

  return (
    <div className="flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2.5 mb-1">
          <Tv2 className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-white">OBS-Overlay</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Einmal einrichten, für jeden Stream: Spielst du bei einem laufenden Event mit und bist live
          (oder hast dich als Streamer angemeldet), zeigt das Overlay automatisch Turnierbaum, Tabelle
          und aktuelles Match. Sonst zeigt es deinen Rang, die nächsten Community-Events und was in der
          Community los ist.
        </p>

        <Link
          href="/profile/overlay/live"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 border border-teal-500/30 bg-teal-500/10 text-teal-200 hover:bg-teal-500/15 transition-all"
        >
          <Smartphone className="w-5 h-5 shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">Live-Steuerung öffnen</span>
            <span className="block text-xs text-teal-200/70">Während des Streams Tabellen groß einblenden, Elemente ausblenden, Pause zeigen – ideal am Handy.</span>
          </span>
        </Link>

        {/* ── Links ── */}
        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Deine OBS-Links</h2>
          <div className="space-y-3 mb-4">
            <SceneLink icon={Swords} label="Spiel-Szene" hint="Kacheln über dem Gameplay" url={overlayUrl} dragUrl={obsDragUrl(overlayUrl, "OMA Overlay")} />
            <SceneLink icon={Moon} label="Pausen-Szene" hint="Vollbild für Pause / gleich zurück" url={pauseUrl} dragUrl={obsDragUrl(pauseUrl, "OMA Pause")} />
          </div>
          <div className="text-xs text-gray-500 leading-relaxed border-t border-white/[0.06] pt-3 space-y-1.5">
            <p>
              <span className="text-gray-300">Am einfachsten:</span> den Griff <Move className="w-3 h-3 inline -mt-0.5" /> direkt
              in die passende OBS-Szene ziehen – Name und Größe (1920×1080) werden automatisch gesetzt. Alternativ
              Link kopieren und unter <span className="text-gray-300">Quellen → Hinzufügen → Browser-Quelle</span> einfügen.
              Änderungen hier erscheinen nach dem Speichern von selbst.
            </p>
            <p className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${activeEvent ? "text-rose-400" : "text-gray-600"}`} />
              {activeEvent
                ? <>Gerade aktiv: <span className="text-gray-300">Event-Modus · {activeEvent.title}</span></>
                : <>Gerade aktiv: <span className="text-gray-300">Profil-Modus</span> (kein laufendes Event, bei dem du live mitspielst oder als Streamer angemeldet bist)</>}
            </p>
            {streamingEvents.filter(e => e.id !== activeEvent?.id).length > 0 && (
              <div className="text-gray-400">
                Als Streamer angemeldet – erscheint automatisch, sobald es losgeht:
                <ul className="mt-1 space-y-0.5">
                  {streamingEvents.filter(e => e.id !== activeEvent?.id).map(e => (
                    <li key={e.id}>
                      <Link href={`/tournament/${e.id}`} className="text-teal-300 hover:underline">{e.title}</Link>
                      <span className="text-gray-500"> · {formatBerlinDate(new Date(e.startAt), { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-rose-300 transition-colors disabled:opacity-50 pt-1"
            >
              {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Links neu erzeugen (z.B. wenn einer versehentlich im Stream zu sehen war)
            </button>
          </div>
        </div>

        {/* ── Darstellung ── */}
        <div className="glass rounded-2xl p-5 mb-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Darstellung</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={lite} onChange={e => setLite(e.target.checked)} className="accent-teal-400 mt-1" />
            <span>
              <span className="flex items-center gap-1.5 text-sm text-gray-200 font-medium"><Zap className="w-3.5 h-3.5 text-amber-300" /> Leicht-Modus</span>
              <span className="block text-xs text-gray-500">
                Ohne Glas- und Unschärfe-Effekte und ohne Dauer-Animationen. Empfohlen, wenn OBS ruckelt oder
                das Overlay kurz flackert – besonders auf schwächeren PCs.
              </span>
            </span>
          </label>
          <div>
            <label className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5" htmlFor="pause-text">
              <Moon className="w-3.5 h-3.5 text-teal-300" /> Text der Pausen-Szene
            </label>
            <input
              id="pause-text"
              value={pauseText}
              maxLength={PAUSE_TEXT_MAX}
              placeholder={DEFAULT_PAUSE_TEXT}
              onChange={e => setPauseText(e.target.value)}
              className="input-glass"
            />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1">
              <Moon className="w-3.5 h-3.5 text-teal-300" /> Hintergrund der Pausen-Szene
            </p>
            <p className="text-xs text-gray-500 mb-2.5">
              Die Bilder sind im Stream leicht animiert (Sterne, Regen, Lichter …) – im Leicht-Modus bleiben sie still.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAUSE_BACKGROUNDS.map(bg => {
                const active = pauseBackground === bg.key;
                return (
                  <button
                    key={bg.key}
                    type="button"
                    onClick={() => setPauseBackground(bg.key)}
                    aria-pressed={active}
                    className={`relative aspect-video rounded-xl overflow-hidden text-left transition-all ${
                      active ? "ring-2 ring-teal-400 ring-offset-2 ring-offset-black/60" : "ring-1 ring-white/10 hover:ring-white/30"
                    }`}
                    style={{
                      backgroundImage: bg.image ? `${bg.overlay}, url(${bg.image})` : `${bg.overlay}, repeating-conic-gradient(#2a2a32 0% 25%, #1c1c22 0% 50%) 50% / 16px 16px`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/85 to-transparent">
                      <span className="block text-xs font-semibold text-white">{bg.label}</span>
                      <span className="block text-[10px] text-gray-300">{bg.hint}</span>
                    </span>
                    {active && <Check className="absolute top-1.5 right-1.5 w-4 h-4 text-teal-300" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Layouts der Spiel-Szene ── */}
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Spiel-Szene</h2>
        <div className="flex gap-2 mb-4">
          <button className={tabClass(mode === "event")} onClick={() => setMode("event")}>
            <Swords className="w-4 h-4" /> Während eines Events
          </button>
          <button className={tabClass(mode === "profile")} onClick={() => setMode("profile")}>
            <Sparkles className="w-4 h-4" /> Ohne Event
          </button>
        </div>

        {mode === "event" ? (
          <LayoutEditor
            options={EVENT_OPTIONS}
            stackable={STACKABLE_ELEMENTS}
            elementSize={ELEMENT_SIZE}
            defaultPositions={DEFAULT_EVENT_POSITIONS}
            value={eventLayout}
            onChange={setEventLayout}
          />
        ) : (
          <LayoutEditor
            options={PROFILE_OPTIONS}
            stackable={PROFILE_STACKABLE}
            elementSize={PROFILE_ELEMENT_SIZE}
            defaultPositions={DEFAULT_PROFILE_POSITIONS}
            value={profileLayout}
            onChange={setProfileLayout}
          />
        )}

        {/* ── Speichern ── */}
        <div className="sticky bottom-4 glass rounded-2xl p-3 flex items-center gap-3">
          <span className="text-xs text-gray-500 flex-1">
            {dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert"}
          </span>
          <button
            onClick={resetMode}
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
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

/** Eine Szene: ziehbarer Griff (für OBS), Link, Kopieren und Vorschau. */
function SceneLink({
  icon: Icon, label, hint, url, dragUrl,
}: { icon: typeof Tv2; label: string; hint: string; url: string; dragUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.message(label, { description: url });
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5">
        <Icon className="w-3.5 h-3.5 text-teal-300" /> {label}
        <span className="text-xs text-gray-500 font-normal">· {hint}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Normaler Link, damit OBS beim Hineinziehen eine Browser-Quelle anlegt. Ein Klick tut
           bewusst nichts (die Vorschau hat einen eigenen Knopf), sonst landet man im Overlay. */}
        <a
          href={dragUrl}
          draggable
          onClick={e => e.preventDefault()}
          title="In OBS ziehen"
          className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-2.5 rounded-lg border border-dashed border-teal-500/40 text-teal-300 cursor-grab active:cursor-grabbing hover:bg-teal-500/10"
        >
          <Move className="w-3.5 h-3.5" /> In OBS ziehen
        </a>
        <code className="flex-1 min-w-0 text-xs text-gray-300 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 overflow-x-auto whitespace-nowrap">
          {url}
        </code>
        <button
          onClick={copy}
          title="Kopieren"
          className="shrink-0 flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition-all font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Vorschau in neuem Tab"
          className="shrink-0 flex items-center px-2.5 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-teal-300"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
