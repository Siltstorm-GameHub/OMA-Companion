"use client";

import { useEffect, useState } from "react";
import { BRAND_LOGO } from "@/lib/brand";
import { OverlayStage } from "./EventOverlayView";
import { TwitchGlyph } from "./tiles";
import PauseBackground from "./PauseBackground";
import { shuffle, spreadChannels } from "./clip-order";
import SceneLayout from "./SceneLayout";
import { CLIP_ELEMENT_KEYS, CLIP_ELEMENT_SIZE, type ClipElementKey } from "./sceneLayouts";
import {
  DEFAULT_INTRO_TEXT, DEFAULT_OUTRO_TEXT, DEFAULT_PAUSE_TEXT, displayName,
  type OverlayClip, type StreamerOverlayPayload,
} from "./types";

/** Logo-Zwischenkarte zwischen zwei Clips. */
const CARD_MS = 7000;
/** Puffer, bis der Twitch-Player geladen hat und losspielt — sonst wird das Clip-Ende abgeschnitten. */
const CLIP_LOAD_BUFFER_MS = 2500;
/** Clip-Liste regelmäßig neu holen (neue Clips, Sperren, geänderte Quelle). */
const REFRESH_MS = 15 * 60_000;

type Variant = "intro" | "clips" | "outro";

/**
 * Community-Clip-Loop (Szenen `&scene=intro|clips|outro` des festen Streamer-Links): spielt Clips
 * der Community-Kanäle über den offiziellen Twitch-Clip-Player ab, dazwischen eine Karte mit
 * Logo und Link zur App. Intro zeigt zusätzlich einen per Live-Steuerung gestarteten Countdown.
 * Ohne freigegebene Clips bleibt die Logo-Karte stehen — die Szene ist also nie leer.
 */
export default function ClipLoopView({
  variant, userId, token, payload,
}: { variant: Variant; userId: string; token: string; payload: StreamerOverlayPayload }) {
  const { streamer, lite, clips: config } = payload;
  const [clips, setClips] = useState<OverlayClip[]>([]);
  const [host, setHost] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"card" | "clip">("card");

  // Clip-Liste laden und regelmäßig erneuern. Neu gemischt nur beim ersten Laden — spätere Abrufe
  // ersetzen die Liste, der Loop läuft an derselben Stelle weiter.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/overlay/streamer/${userId}/clips?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { clips: OverlayClip[] };
        if (cancelled) return;
        setHost(window.location.hostname);
        setClips(prev => (prev.length === 0 ? spreadChannels(shuffle(data.clips)) : spreadChannels(data.clips)));
      } catch { /* nächster Versuch beim nächsten Intervall */ }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [userId, token]);

  const current = clips.length ? clips[index % clips.length] : null;

  // Taktgeber: Karte → Clip → Karte (nächster Clip) … Ohne Clips bleibt die Karte stehen.
  // Abhängig von ID/Dauer statt vom Objekt: ein Neuladen der Liste startet den laufenden Takt nicht neu.
  const currentId = current?.id;
  const currentDuration = current?.durationSec ?? 0;
  useEffect(() => {
    if (!currentId) return;
    const ms = phase === "card" ? CARD_MS : currentDuration * 1000 + CLIP_LOAD_BUFFER_MS;
    const t = setTimeout(() => {
      if (phase === "card") setPhase("clip");
      else { setIndex(i => i + 1); setPhase("card"); }
    }, ms);
    return () => clearTimeout(t);
  }, [phase, currentId, currentDuration]);

  const headline = variant === "intro" ? config.introText ?? DEFAULT_INTRO_TEXT
    : variant === "outro" ? config.outroText ?? DEFAULT_OUTRO_TEXT
    : payload.pauseText ?? DEFAULT_PAUSE_TEXT;

  const hasPlayer = !!payload.clipLayout.elements.player;
  const render = (key: ClipElementKey): React.ReactNode => {
    const { width, height } = CLIP_ELEMENT_SIZE[key];
    switch (key) {
      case "title":
        return (
          <div style={{ width, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 52, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>
              {headline}
            </h1>
            {variant === "intro" && payload.countdownUntil
              ? <Countdown until={payload.countdownUntil} />
              : (
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, color: "#c4a3ff", fontWeight: 600 }}>
                  {streamer.twitchLogin && <TwitchGlyph size={20} />}
                  {streamer.twitchLogin ?? displayName(streamer)}
                </span>
              )}
          </div>
        );
      case "player":
        return (
          <div
            style={{
              width, height, borderRadius: 18, overflow: "hidden", background: "rgba(6,6,9,0.72)",
              border: "1px solid rgba(94,234,212,0.28)", boxShadow: "0 0 60px rgba(20,184,166,0.18), 0 20px 60px rgba(0,0,0,0.55)",
            }}
          >
            {phase === "clip" && current && host ? (
              <iframe
                key={current.id}
                title={current.title}
                src={`https://clips.twitch.tv/embed?clip=${encodeURIComponent(current.id)}&parent=${encodeURIComponent(host)}&autoplay=true&muted=${config.muted}&preload=auto`}
                width={width}
                height={height}
                allow="autoplay; fullscreen"
                style={{ display: "block", border: 0 }}
              />
            ) : (
              <BrandCard key={`card-${index}`} next={current} empty={clips.length === 0} />
            )}
          </div>
        );
      case "caption":
        // Bildunterschrift nur, solange ein Clip läuft und der Player überhaupt zu sehen ist.
        if (!hasPlayer || phase !== "clip" || !current) return null;
        return (
          <div key={`caption-${current.id}`} className="oma-anim-slidein" style={{ width, height, display: "flex", alignItems: "center", gap: 14 }}>
            <TwitchGlyph size={30} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {current.title}
              </span>
              <span style={{ fontSize: 17, color: "rgba(255,255,255,0.7)" }}>
                Clip von <span style={{ color: "#c4a3ff", fontWeight: 600 }}>twitch.tv/{current.channelLogin}</span>
                {current.game && <> · {current.game}</>}
                {current.creator && current.creator.toLowerCase() !== current.channelLogin && <> · geclippt von {current.creator}</>}
              </span>
            </div>
          </div>
        );
      case "footer":
        return (
          <div style={{ width, textAlign: "center", fontSize: 18, fontWeight: 600, letterSpacing: "0.08em", color: "#5eead4" }}>
            OLD MASTERS ALLY · www.oma-app.de
          </div>
        );
    }
  };

  return (
    <OverlayStage lite={lite}>
      <PauseBackground backgroundKey={payload.pauseBackground} lite={lite} />
      <SceneLayout layout={payload.clipLayout} order={CLIP_ELEMENT_KEYS} render={render} />
    </OverlayStage>
  );
}

function BrandCard({ next, empty }: { next: OverlayClip | null; empty: boolean }) {
  return (
    <div className="oma-anim-pop" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img src={BRAND_LOGO} alt="" width={170} height={170} className="oma-anim-breathe" style={{ display: "block", filter: "drop-shadow(0 0 28px rgba(20,184,166,0.55))" }} />
      <span style={{ fontSize: 58, fontWeight: 700, letterSpacing: "0.04em", color: "#fff" }}>OLD MASTERS ALLY</span>
      <span style={{ fontSize: 26, color: "rgba(255,255,255,0.75)" }}>
        {empty ? "Gaming-Community · Events, Turniere & mehr" : "Clips aus unserer Community"}
      </span>
      <span style={{ fontSize: 34, fontWeight: 700, color: "#5eead4" }}>www.oma-app.de</span>
      {next && !empty && (
        <span style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 22, color: "rgba(255,255,255,0.8)" }}>
          Als Nächstes: <TwitchGlyph size={20} /> <span style={{ color: "#c4a3ff", fontWeight: 600 }}>{next.channel}</span>
        </span>
      )}
    </div>
  );
}

/** Restzeit bis `until`, sekündlich aktualisiert. Nach Ablauf "Gleich geht's los!". */
function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);
  if (now == null) return null;
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const style = { fontSize: 40, fontWeight: 700, color: "#5eead4", fontVariantNumeric: "tabular-nums" as const, textShadow: "0 0 20px rgba(20,184,166,0.45)" };
  if (left === 0) return <span style={style}>Gleich geht&apos;s los!</span>;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return <span style={style}>{mm}:{ss}</span>;
}
