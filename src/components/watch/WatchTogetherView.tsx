"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, ExternalLink, LayoutGrid, Maximize2, Volume2 } from "@/components/icons";
import type { WatchMember } from "@/lib/watch-together";
import TwitchLivePlayer from "./TwitchLivePlayer";
import MultiChatPanel, { type ChatChannel } from "./MultiChatPanel";

const MAX_TILES = 4;
const REFRESH_MS = 60_000;
/** Kanal-Farben im gemeinsamen Chat und an den Kacheln. */
const CHANNEL_COLORS = ["#2dd4bf", "#a78bfa", "#fbbf24", "#f472b6"];

/**
 * Bis zu 4 Streams gleichzeitig mit gemeinsamem Chat. Raster (2 nebeneinander, 3–4 als 2×2) oder
 * Fokus (einer groß, die anderen daneben). Ton hat immer nur ein Stream. Am Handy läuft nur ein
 * Stream mit Umschalter — vier Videos gleichzeitig wären dort zu viel.
 *
 * Die Player bleiben immer in derselben DOM-Reihenfolge; Raster/Fokus ordnen sie nur per CSS an.
 * Ein im DOM verschobenes iframe würde sonst neu laden.
 */
export default function WatchTogetherView({
  title, subtitle, initialMembers, refreshUrl,
}: {
  title: string;
  subtitle?: string | null;
  initialMembers: WatchMember[];
  /** Liefert { members } bzw. Event-Daten mit members — für Live-Status und neu gestartete Streams. */
  refreshUrl: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const live = members.filter(m => m.live).slice(0, MAX_TILES);
  const offline = members.filter(m => !live.includes(m));
  // Alle starten stumm: Browser blockieren automatisches Abspielen mit Ton, der Stream bliebe sonst
  // stehen. Der erste Klick auf "Ton" ist eine Nutzer-Aktion — danach darf Ton laufen.
  const [audio, setAudio] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    const t = setTimeout(update, 0);
    mq.addEventListener("change", update);
    return () => { clearTimeout(t); mq.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(refreshUrl, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { members?: WatchMember[] };
      if (data.members) setMembers(data.members);
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [refreshUrl]);

  // Ton/Fokus auf einem Stream, der nicht mehr läuft → wieder stumm bzw. Raster.
  const audioLogin = live.some(m => m.twitchLogin === audio) ? audio : null;
  // Am Handy läuft genau ein Stream: der mit Ton, sonst der erste.
  const mobileLogin = audioLogin ?? live[0]?.twitchLogin ?? null;
  const focusLogin = live.some(m => m.twitchLogin === focus) ? focus : null;
  const colorOf = (login: string) => CHANNEL_COLORS[Math.max(0, members.findIndex(m => m.twitchLogin === login)) % CHANNEL_COLORS.length];
  const chatChannels: ChatChannel[] = live.map(m => ({ login: m.twitchLogin, name: m.name, color: colorOf(m.twitchLogin) }));

  // Kachel-Platzierung per CSS-Grid (Reihenfolge im DOM bleibt fest).
  const n = live.length;
  const gridStyle: React.CSSProperties = focusLogin && n > 1
    ? { gridTemplateColumns: "minmax(0,3fr) minmax(0,1fr)", gridAutoRows: "min-content" }
    : { gridTemplateColumns: n <= 1 ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))" };
  const placement = (login: string): React.CSSProperties => {
    if (!focusLogin || n <= 1) return {};
    if (login === focusLogin) return { gridColumn: 1, gridRow: `1 / span ${n - 1}` };
    const others = live.filter(m => m.twitchLogin !== focusLogin).map(m => m.twitchLogin);
    return { gridColumn: 2, gridRow: others.indexOf(login) + 1 };
  };
  const shown = mobile ? live.filter(m => m.twitchLogin === mobileLogin) : live;

  return (
    <div className="flex flex-col min-h-[100dvh] p-3 sm:p-4 gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/zusammen" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-teal-300">
          <ArrowLeft className="w-4 h-4" /> Übersicht
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
        <div className="flex-1" />
        {!mobile && n > 1 && (
          <button
            onClick={() => setFocus(f => (f ? null : audioLogin ?? live[0]?.twitchLogin ?? null))}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-300 hover:border-teal-500/40"
          >
            {focusLogin ? <><LayoutGrid className="w-3.5 h-3.5" /> Raster</> : <><Maximize2 className="w-3.5 h-3.5" /> Fokus</>}
          </button>
        )}
        <span className="text-[11px] text-gray-500">powered by <Link href="/dashboard" className="text-teal-300 hover:underline">OMA</Link></span>
      </header>

      {n === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-sm p-8">
          Gerade ist keiner dieser Kanäle live.
          <br />Die Seite aktualisiert sich von selbst, sobald jemand startet.
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
          {/* Streams */}
          <div className="lg:flex-1 min-w-0">
            {!audioLogin && (
              <p className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
                <Volume2 className="w-3.5 h-3.5 text-teal-300" /> Alle Streams starten stumm – klick bei einem Stream auf „Ton“.
              </p>
            )}
            {mobile && n > 1 && (
              <div className="flex gap-1.5 mb-2 overflow-x-auto">
                {live.map(m => (
                  <button
                    key={m.twitchLogin}
                    onClick={() => setAudio(m.twitchLogin)}
                    className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                      m.twitchLogin === mobileLogin ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-white/[0.08] text-gray-300"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: colorOf(m.twitchLogin) }} /> {m.name}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-3" style={mobile ? undefined : gridStyle}>
              {shown.map(m => {
                const hasAudio = m.twitchLogin === audioLogin;
                return (
                  <div key={m.twitchLogin} className="min-w-0 flex flex-col" style={mobile ? undefined : placement(m.twitchLogin)}>
                    <div
                      className="relative w-full rounded-xl overflow-hidden bg-black"
                      style={{ aspectRatio: "16 / 9", boxShadow: hasAudio ? `0 0 0 2px ${colorOf(m.twitchLogin)}` : "0 0 0 1px rgba(255,255,255,0.08)" }}
                    >
                      <TwitchLivePlayer channel={m.twitchLogin} muted={!hasAudio} />
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorOf(m.twitchLogin) }} />
                      <span className="text-sm font-medium text-gray-100 truncate">{m.name}</span>
                      {m.game && <span className="text-xs text-gray-500 truncate hidden sm:inline">· {m.game}</span>}
                      <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0"><Eye className="w-3 h-3" />{m.viewers}</span>
                      <div className="flex-1" />
                      {!hasAudio && (
                        <button
                          onClick={() => setAudio(m.twitchLogin)}
                          className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-white/[0.08] text-gray-300 hover:border-teal-500/40 hover:text-teal-200"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Ton
                        </button>
                      )}
                      {!mobile && n > 1 && focusLogin !== m.twitchLogin && (
                        <button
                          onClick={() => setFocus(m.twitchLogin)}
                          title="Groß anzeigen"
                          className="shrink-0 p-1 rounded-md border border-white/[0.08] text-gray-400 hover:text-teal-200"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a
                        href={`https://twitch.tv/${m.twitchLogin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Auf Twitch öffnen"
                        className="shrink-0 p-1 text-gray-500 hover:text-teal-300"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            {offline.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Gerade offline: {offline.map(m => m.name).join(", ")}
                {members.filter(m => m.live).length > MAX_TILES && ` · gezeigt werden höchstens ${MAX_TILES} Streams`}
              </p>
            )}
          </div>

          {/* Gemeinsamer Chat */}
          <div className="lg:w-[340px] shrink-0 h-[420px] lg:h-auto lg:min-h-[480px] lg:max-h-[calc(100dvh-90px)]">
            <MultiChatPanel channels={chatChannels} activeChannel={mobile ? mobileLogin : audioLogin} />
          </div>
        </div>
      )}
    </div>
  );
}
