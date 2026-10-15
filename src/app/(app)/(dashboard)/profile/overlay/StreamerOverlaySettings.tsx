"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Tv2, Copy, Check, ExternalLink, RefreshCw, Save, Loader2, Radio, Move, Zap,
  Clapperboard, Moon, Smartphone, Rocket, LogOut, Music, Timer, LayoutGrid,
} from "@/components/icons";
import OverlayLayoutsEditor, { type OverlayLayouts, type LayoutTab } from "@/components/overlay/OverlayLayoutsEditor";
import { PAUSE_TEXT_MAX } from "@/components/overlay/layout";
import {
  DEFAULT_PAUSE_TEXT, DEFAULT_INTRO_TEXT, DEFAULT_OUTRO_TEXT, type ClipSceneConfig, type ClipSource,
} from "@/components/overlay/types";
import { formatBerlinDate } from "@/lib/time";
import { PAUSE_BACKGROUNDS, pauseThumbnail } from "@/components/overlay/pauseBackgrounds";
import MyClipsPanel from "./MyClipsPanel";

const CLIP_SOURCE_OPTIONS: { key: ClipSource; label: string; hint: string }[] = [
  { key: "all",    label: "Alle",            hint: "alle Clips der Community, bunt gemischt" },
  { key: "top",    label: "Beliebteste",     hint: "meistgesehene Clips der letzten 90 Tage" },
  { key: "recent", label: "Neueste",         hint: "frische Clips der letzten 30 Tage" },
  { key: "game",   label: "Aktuelles Spiel", hint: "passend zu deinem Twitch-Spiel, sonst Beliebteste" },
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
  overlayUrl: initialUrl, initialLayouts, initialPauseText, initialLite, initialPauseBackground, initialClips, activeEvent, streamingEvents,
}: {
  overlayUrl: string;
  initialLayouts: OverlayLayouts;
  initialPauseText: string | null;
  initialLite: boolean;
  initialPauseBackground: string;
  initialClips: ClipSceneConfig;
  activeEvent: { id: string; title: string } | null;
  /** Kommende Events, für die der User als Streamer angemeldet ist. */
  streamingEvents: { id: string; title: string; startAt: string }[];
}) {
  const [overlayUrl, setOverlayUrl] = useState(initialUrl);
  const initialTab: LayoutTab = activeEvent || streamingEvents.length > 0 ? "event" : "profile";
  const [pauseText, setPauseText] = useState(initialPauseText ?? "");
  const [lite, setLite] = useState(initialLite);
  const [pauseBackground, setPauseBackground] = useState(initialPauseBackground);
  const [clipSource, setClipSource] = useState<ClipSource>(initialClips.source);
  const [clipsMuted, setClipsMuted] = useState(initialClips.muted);
  const [introText, setIntroText] = useState(initialClips.introText ?? "");
  const [outroText, setOutroText] = useState(initialClips.outroText ?? "");
  const clipsBody = () => ({ source: clipSource, muted: clipsMuted, introText: introText.trim() || null, outroText: outroText.trim() || null });
  const snapshot = () => JSON.stringify({ pauseText: pauseText.trim(), lite, pauseBackground, clips: clipsBody() });
  const [saved, setSaved] = useState(() => JSON.stringify({
    pauseText: initialPauseText ?? "", lite: initialLite, pauseBackground: initialPauseBackground,
    clips: { source: initialClips.source, muted: initialClips.muted, introText: initialClips.introText, outroText: initialClips.outroText },
  }));
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const dirty = snapshot() !== saved;

  const sceneUrl = (scene: string) => { const u = new URL(overlayUrl); u.searchParams.set("scene", scene); return u.toString(); };
  const pauseUrl = sceneUrl("pause");
  const introUrl = sceneUrl("intro");
  const clipsUrl = sceneUrl("clips");
  const outroUrl = sceneUrl("outro");

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/overlay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pauseText: pauseText.trim() || null, lite, pauseBackground, clips: clipsBody() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      setSaved(snapshot());
      toast.success("Gespeichert – dein Overlay in OBS übernimmt es in wenigen Sekunden");
    } finally {
      setSaving(false);
    }
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
            <span className="block text-xs text-teal-200/70">Während des Streams Szene wechseln (Spiel, Pause, Intro, Clips, Outro), Tabellen groß einblenden, Elemente verschieben – ideal am Handy.</span>
          </span>
        </Link>

        {/* ── Links ── */}
        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dein OBS-Link</h2>
          <div className="space-y-3 mb-3">
            <SceneLink icon={Tv2} label="OMA-Overlay" hint="einmal in OBS einfügen – Szene wechselst du in der Live-Steuerung" url={overlayUrl} dragUrl={obsDragUrl(overlayUrl, "OMA Overlay")} />
          </div>
          <details className="mb-4 group">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-200 select-none">
              Optional: feste Links je Szene (für eigene OBS-Szenen, die immer dasselbe zeigen sollen)
            </summary>
            <div className="space-y-3 mt-3">
              <SceneLink icon={Moon} label="Pause" hint="immer Pausen-Szene" url={pauseUrl} dragUrl={obsDragUrl(pauseUrl, "OMA Pause")} />
              <SceneLink icon={Rocket} label="Intro" hint="immer Intro mit Clips + Countdown" url={introUrl} dragUrl={obsDragUrl(introUrl, "OMA Intro")} />
              <SceneLink icon={Clapperboard} label="Clips" hint="immer Clip-Pause" url={clipsUrl} dragUrl={obsDragUrl(clipsUrl, "OMA Clips")} />
              <SceneLink icon={LogOut} label="Outro" hint="immer Outro mit Clips" url={outroUrl} dragUrl={obsDragUrl(outroUrl, "OMA Outro")} />
            </div>
          </details>
          <div className="text-xs text-gray-500 leading-relaxed border-t border-white/[0.06] pt-3 space-y-1.5">
            <p>
              <span className="text-gray-300">Am einfachsten:</span> den Griff <Move className="w-3 h-3 inline -mt-0.5" /> direkt
              in OBS ziehen – Name und Größe (1920×1080) werden automatisch gesetzt. Alternativ Link kopieren
              und unter <span className="text-gray-300">Quellen → Hinzufügen → Browser-Quelle</span> einfügen. Lege die
              Quelle in jede OBS-Szene, in der das Overlay erscheinen soll; was es zeigt, steuerst du dann über die
              Live-Steuerung. Änderungen erscheinen nach dem Speichern von selbst.
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
                      backgroundImage: bg.image ? `${bg.overlay}, url(${pauseThumbnail(bg)})` : `${bg.overlay}, repeating-conic-gradient(#2a2a32 0% 25%, #1c1c22 0% 50%) 50% / 16px 16px`,
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

        {/* ── Clip-Szenen ── */}
        <div className="glass rounded-2xl p-5 mb-4 space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Clip-Szenen (Intro, Clip-Pause, Outro)</h2>
            <p className="text-xs text-gray-500 mt-1.5">
              Spielen Clips von Community-Kanälen über den offiziellen Twitch-Player ab, dazwischen eine Karte mit
              OMA-Logo und Link zur App. Es laufen nur Clips von Mitgliedern, die zugestimmt haben. Den Hintergrund
              übernehmen die Szenen von der Pausen-Szene.
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5">
              <Clapperboard className="w-3.5 h-3.5 text-teal-300" /> Welche Clips?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CLIP_SOURCE_OPTIONS.map(o => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setClipSource(o.key)}
                  aria-pressed={clipSource === o.key}
                  className={`text-left rounded-xl px-3 py-2.5 border transition-all ${
                    clipSource === o.key ? "bg-teal-500/15 border-teal-500/40" : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <span className={`block text-sm font-medium ${clipSource === o.key ? "text-teal-200" : "text-gray-200"}`}>{o.label}</span>
                  <span className="block text-[11px] text-gray-500">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={!clipsMuted} onChange={e => setClipsMuted(!e.target.checked)} className="accent-teal-400 mt-1" />
            <span>
              <span className="flex items-center gap-1.5 text-sm text-gray-200 font-medium"><Music className="w-3.5 h-3.5 text-teal-300" /> Clips mit Ton abspielen</span>
              <span className="block text-xs text-gray-500">
                Achtung: Läuft in einem fremden Clip urheberrechtlich geschützte Musik, kann das in deinem Stream zu
                Stummschaltung oder einer Meldung führen. Ohne Haken laufen die Clips stumm. Die Lautstärke regelst
                du wie gewohnt im OBS-Mixer.
              </span>
            </span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5" htmlFor="intro-text">
                <Rocket className="w-3.5 h-3.5 text-teal-300" /> Text der Intro-Szene
              </label>
              <input id="intro-text" value={introText} maxLength={PAUSE_TEXT_MAX} placeholder={DEFAULT_INTRO_TEXT} onChange={e => setIntroText(e.target.value)} className="input-glass" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5" htmlFor="outro-text">
                <LogOut className="w-3.5 h-3.5 text-teal-300" /> Text der Outro-Szene
              </label>
              <input id="outro-text" value={outroText} maxLength={PAUSE_TEXT_MAX} placeholder={DEFAULT_OUTRO_TEXT} onChange={e => setOutroText(e.target.value)} className="input-glass" />
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-gray-500">
            <Timer className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Den Countdown fürs Intro (z.B. „Start in 05:00“) startest du in der{" "}
              <Link href="/profile/overlay/live" className="text-teal-300 hover:underline">Live-Steuerung</Link>. Die
              Clip-Pause zeigt den Text der Pausen-Szene.
            </span>
          </p>
        </div>

        {/* ── Speichern der Einstellungen oben ── */}
        <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-3">
          <span className="text-xs text-gray-500 flex-1">
            {dirty ? "Ungespeicherte Änderungen an Darstellung und Clip-Szenen" : "Darstellung und Clip-Szenen gespeichert"}
          </span>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition-all font-medium disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Speichern
          </button>
        </div>

        <MyClipsPanel />

        {/* ── Layouts aller Szenen ── */}
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          <LayoutGrid className="w-3.5 h-3.5" /> Position, Größe & Sichtbarkeit
        </h2>
        <OverlayLayoutsEditor initial={initialLayouts} initialTab={initialTab} />
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
