"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Tv2, Check, RefreshCw, Save, Loader2, Radio, Move, Zap,
  Clapperboard, Moon, Smartphone, Rocket, LogOut, Music, Timer, LayoutGrid, Sparkles, Settings, Wand2,
} from "@/components/icons";
import { OverlayConnectionStatus, useOverlayConnection } from "@/components/overlay/OverlayConnectionStatus";
import HelpTip from "@/components/overlay/HelpTip";
import OverlaySetupWizard, { WIZARD_DONE_KEY } from "./OverlaySetupWizard";
import LiveControlQr from "./LiveControlQr";
import EventModeHint from "@/components/overlay/EventModeHint";
import type { EventModeReason } from "@/lib/overlay-state";
import { useRouter } from "next/navigation";
import type { SettingsTab } from "./settingsTabs";
import OverlayLayoutsEditor, { type OverlayLayouts, type LayoutTab } from "@/components/overlay/OverlayLayoutsEditor";
import { PAUSE_TEXT_MAX } from "@/components/overlay/layout";
import {
  DEFAULT_PAUSE_TEXT, DEFAULT_INTRO_TEXT, DEFAULT_OUTRO_TEXT, type ClipSceneConfig, type ClipSource,
} from "@/components/overlay/types";
import { formatBerlinDate } from "@/lib/time";
import { PAUSE_BACKGROUNDS, pauseThumbnail } from "@/components/overlay/pauseBackgrounds";
import MyClipsPanel from "./MyClipsPanel";
import SceneLink, { obsDragUrl } from "./SceneLink";


const TABS: { key: SettingsTab; label: string; icon: typeof Tv2 }[] = [
  { key: "look",     label: "Aussehen",  icon: Sparkles },
  { key: "clips",    label: "Clips",     icon: Clapperboard },
  { key: "layout",   label: "Layout",    icon: LayoutGrid },
  { key: "advanced", label: "Erweitert", icon: Settings },
];

const CLIP_SOURCE_OPTIONS: { key: ClipSource; label: string; hint: string }[] = [
  { key: "all",    label: "Alle",            hint: "alle Clips der Community, bunt gemischt" },
  { key: "top",    label: "Beliebteste",     hint: "meistgesehene Clips der letzten 90 Tage" },
  { key: "recent", label: "Neueste",         hint: "frische Clips der letzten 30 Tage" },
  { key: "game",   label: "Aktuelles Spiel", hint: "passend zu deinem Twitch-Spiel, sonst Beliebteste" },
];


export default function StreamerOverlaySettings({
  overlayUrl: initialUrl, initialLayouts, initialPauseText, initialLite, initialPauseBackground, initialClips, activeEvent, streamingEvents,
  initialSettingsTab = "look", everConnected, eventReason,
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
  /** Reiter beim Öffnen (z.B. ?tab=layout aus der Live-Steuerung). */
  initialSettingsTab?: SettingsTab;
  /** Wurde der Link schon einmal geöffnet? Sonst startet der Einrichtungs-Assistent. */
  everConnected: boolean;
  /** Ohne Turniermodus: laufende Events und warum sie nicht greifen. */
  eventReason: EventModeReason | null;
}) {
  const [overlayUrl, setOverlayUrl] = useState(initialUrl);
  const [tab, setTab] = useState<SettingsTab>(initialSettingsTab);
  const connection = useOverlayConnection(5000);
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  // Assistent beim ersten Besuch: Link noch nie geöffnet und Assistent nicht schon geschlossen.
  useEffect(() => {
    if (everConnected) return;
    const t = setTimeout(() => {
      let done = false;
      try { done = localStorage.getItem(WIZARD_DONE_KEY) === "1"; } catch { /* ohne Speicher: anzeigen */ }
      if (!done) setWizardOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [everConnected]);
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

  const sectionTitle = "text-xs font-semibold text-gray-400 uppercase tracking-wide";
  const settingsTab = tab === "look" || tab === "clips";

  if (wizardOpen) {
    return (
      <div className="flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-teal-400" />
            <h1 className="text-lg font-semibold text-white">Overlay einrichten</h1>
          </div>
          <OverlaySetupWizard
            overlayUrl={overlayUrl}
            layouts={initialLayouts}
            pauseBackground={initialPauseBackground}
            // Neu laden: Der Assistent speichert direkt, die Seite soll den aktuellen Stand zeigen.
            onClose={() => window.location.assign("/profile/overlay")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Tv2 className="w-5 h-5 text-teal-400" />
              <h1 className="text-lg font-semibold text-white">OBS-Overlay</h1>
            </div>
            <p className="text-sm text-gray-500">
              Ein Link für alle Streams: Turnierinfos während Events, sonst Rang, Community-Events und Clips –
              plus Pause, Intro und Outro.
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-teal-300 hover:border-teal-500/30"
          >
            <Wand2 className="w-3.5 h-3.5" /> Einrichtungs-Assistent
          </button>
        </div>

        {/* ── Schnellstart ── */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex gap-3">
            <StepNumber n={1} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100">In OBS einfügen</p>
              <p className="text-xs text-gray-500 mb-2.5">
                Den Griff <Move className="w-3 h-3 inline -mt-0.5" /> in OBS ziehen (Größe 1920×1080 wird automatisch
                gesetzt) oder den Link als Browser-Quelle einfügen. Lege die Quelle in jede Szene, in der das Overlay
                erscheinen soll.
              </p>
              <SceneLink icon={Tv2} label="Dein Overlay-Link" hint="bleibt immer gleich" url={overlayUrl} dragUrl={obsDragUrl(overlayUrl, "OMA Overlay")} />
              <div className="mt-2.5"><OverlayConnectionStatus connection={connection} /></div>
            </div>
          </div>
          <div className="flex gap-3">
            <StepNumber n={2} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100">Während des Streams steuern</p>
              <p className="text-xs text-gray-500 mb-2.5">
                Szene wechseln (Spiel, Pause, Intro, Clips, Outro), Tabellen groß einblenden, Countdown starten – am
                besten am Handy.
              </p>
              <Link
                href="/profile/overlay/live"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-teal-500/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 font-medium transition-all"
              >
                <Smartphone className="w-4 h-4" /> Live-Steuerung öffnen
              </Link>
              <div className="hidden sm:block mt-3"><LiveControlQr size={104} /></div>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-gray-500 border-t border-white/[0.06] pt-3">
            <Radio className={`w-3.5 h-3.5 shrink-0 ${activeEvent ? "text-rose-400" : "text-gray-600"}`} />
            {activeEvent
              ? <>Gerade: <span className="text-gray-300">Turnier läuft · {activeEvent.title}</span> – dein Overlay zeigt die Turnier-Ansicht.</>
              : <>Gerade: <span className="text-gray-300">Normales Streamen</span> – spielst du bei einem laufenden OMA-Turnier mit oder bist dort als Streamer angemeldet, wechselt dein Overlay automatisch in die Turnier-Ansicht.</>}
          </p>
          {!activeEvent && <EventModeHint reason={eventReason} onChanged={() => setTimeout(() => router.refresh(), 1500)} />}
        </div>

        {/* ── Reiter ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium transition-all ${
                tab === t.key ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "look" && (
          <>
            <div className="glass rounded-2xl p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={lite} onChange={e => setLite(e.target.checked)} className="accent-teal-400 mt-1" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-200 font-medium">
                    <Zap className="w-3.5 h-3.5 text-amber-300" /> Leicht-Modus
                    <HelpTip text="Spart Rechenleistung: keine Glas- und Unschärfe-Effekte, keine Dauer-Animationen. Einschalten, wenn dein Stream ruckelt." />
                  </span>
                  <span className="block text-xs text-gray-500">
                    Ohne Glas-, Unschärfe- und Dauer-Animationen. Empfohlen, wenn OBS ruckelt oder das Overlay flackert.
                  </span>
                </span>
              </label>
            </div>

            <div className="glass rounded-2xl p-5 space-y-3">
              <h2 className={sectionTitle}>Texte</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <TextField id="pause-text" icon={Moon} label="Pause" value={pauseText} placeholder={DEFAULT_PAUSE_TEXT} onChange={setPauseText} />
                <TextField id="intro-text" icon={Rocket} label="Intro" value={introText} placeholder={DEFAULT_INTRO_TEXT} onChange={setIntroText} />
                <TextField id="outro-text" icon={LogOut} label="Outro" value={outroText} placeholder={DEFAULT_OUTRO_TEXT} onChange={setOutroText} />
              </div>
              <p className="text-xs text-gray-500">Die Clip-Pause zeigt den Text der Pause.</p>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className={sectionTitle}>Hintergrund für Pause, Intro, Clips und Outro</h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Im Stream leicht animiert (Sterne, Regen, Lichter …) – im Leicht-Modus still.
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
          </>
        )}

        {tab === "clips" && (
          <>
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <h2 className={sectionTitle}>Community-Clips in Intro, Clip-Pause und Outro</h2>
                <p className="text-xs text-gray-500 mt-1.5">
                  Laufen über den offiziellen Twitch-Player, dazwischen eine Karte mit OMA-Logo und Link zur App.
                  Clips mit Alters-Hinweis von Twitch werden ausgelassen; einen einzelnen Clip überspringst du in der
                  Live-Steuerung.
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
                    Achtung: Läuft in einem fremden Clip geschützte Musik, kann das in deinem Stream zu Stummschaltung oder
                    einer Meldung führen. Lautstärke regelst du im OBS-Mixer.
                  </span>
                </span>
              </label>
              <p className="flex items-start gap-1.5 text-xs text-gray-500">
                <Timer className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Den Countdown fürs Intro startest du in der <Link href="/profile/overlay/live" className="text-teal-300 hover:underline">Live-Steuerung</Link>.</span>
              </p>
            </div>
            <MyClipsPanel />
          </>
        )}

        {/* Bleibt beim Reiterwechsel erhalten (nur versteckt), damit nichts verloren geht. */}
        <div hidden={tab !== "layout"}>
          <OverlayLayoutsEditor initial={initialLayouts} initialTab={initialTab} overlayUrl={overlayUrl} />
        </div>

        {tab === "advanced" && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <h2 className={`${sectionTitle} flex items-center gap-1.5`}>
                Feste Links je Szene
                <HelpTip text="Normalerweise reicht dein einer Overlay-Link – die Szene wechselst du in der Live-Steuerung. Feste Links zeigen immer dieselbe Szene, egal was die Live-Steuerung sagt." />
              </h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Nur nötig, wenn du in OBS eigene Szenen hast, die immer dasselbe zeigen sollen – unabhängig von der
                Live-Steuerung.
              </p>
              <div className="space-y-3">
                <SceneLink icon={Moon} label="Pause" hint="immer Pausen-Szene" url={pauseUrl} dragUrl={obsDragUrl(pauseUrl, "OMA Pause")} />
                <SceneLink icon={Rocket} label="Intro" hint="Clips + Countdown" url={introUrl} dragUrl={obsDragUrl(introUrl, "OMA Intro")} />
                <SceneLink icon={Clapperboard} label="Clips" hint="Clip-Pause" url={clipsUrl} dragUrl={obsDragUrl(clipsUrl, "OMA Clips")} />
                <SceneLink icon={LogOut} label="Outro" hint="Clips zum Schluss" url={outroUrl} dragUrl={obsDragUrl(outroUrl, "OMA Outro")} />
              </div>
            </div>
            {streamingEvents.filter(e => e.id !== activeEvent?.id).length > 0 && (
              <div className="border-t border-white/[0.06] pt-4">
                <h2 className={sectionTitle}>Als Streamer angemeldet</h2>
                <p className="text-xs text-gray-500 mt-1 mb-2">Erscheinen automatisch, sobald sie losgehen:</p>
                <ul className="space-y-0.5 text-xs">
                  {streamingEvents.filter(e => e.id !== activeEvent?.id).map(e => (
                    <li key={e.id}>
                      <Link href={`/tournament/${e.id}`} className="text-teal-300 hover:underline">{e.title}</Link>
                      <span className="text-gray-500"> · {formatBerlinDate(new Date(e.startAt), { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-white/[0.06] pt-4">
              <h2 className={sectionTitle}>Sicherheit</h2>
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="mt-2 flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-white/[0.08] text-gray-300 hover:text-rose-300 hover:border-rose-400/40 transition-all disabled:opacity-50"
              >
                {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Links neu erzeugen
              </button>
              <p className="text-xs text-gray-500 mt-1.5">Z.B. wenn ein Link versehentlich im Stream zu sehen war. Danach in OBS ersetzen.</p>
            </div>
          </div>
        )}

        {/* ── Speichern (Aussehen & Clips) ── */}
        {(settingsTab || dirty) && (
          <div className="sticky bottom-4 glass rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xs text-gray-500 flex-1">
              {dirty ? "Ungespeicherte Änderungen an Aussehen oder Clips" : "Aussehen und Clips gespeichert"}
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
        )}
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="w-7 h-7 shrink-0 rounded-full border border-teal-500/40 bg-teal-500/10 text-teal-300 text-sm font-semibold flex items-center justify-center">
      {n}
    </span>
  );
}

function TextField({
  id, icon: Icon, label, value, placeholder, onChange,
}: { id: string; icon: typeof Tv2; label: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5" htmlFor={id}>
        <Icon className="w-3.5 h-3.5 text-teal-300" /> {label}
      </label>
      <input id={id} value={value} maxLength={PAUSE_TEXT_MAX} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="input-glass" />
    </div>
  );
}
