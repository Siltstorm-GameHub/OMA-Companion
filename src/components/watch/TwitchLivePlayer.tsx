"use client";

import { useEffect, useRef } from "react";

/** Minimaler Ausschnitt der Twitch-Player-Schnittstelle (https://player.twitch.tv/js/embed/v1.js). */
type TwitchPlayer = { setMuted(muted: boolean): void; setVolume(volume: number): void };
type TwitchGlobal = { Player: new (el: HTMLElement, options: Record<string, unknown>) => TwitchPlayer };
declare global {
  interface Window { Twitch?: TwitchGlobal }
}

const SCRIPT_URL = "https://player.twitch.tv/js/embed/v1.js";
let scriptPromise: Promise<TwitchGlobal> | null = null;

/** Lädt das Twitch-Player-Skript genau einmal pro Seite. */
function loadTwitch(): Promise<TwitchGlobal> {
  if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => (window.Twitch ? resolve(window.Twitch) : reject(new Error("Twitch-Player nicht geladen")));
    s.onerror = () => { scriptPromise = null; reject(new Error("Twitch-Player nicht geladen")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Eingebetteter Twitch-Live-Player über Twitchs offizielle Player-Schnittstelle — Ton lässt sich
 * so ohne Neuladen umschalten (immer nur ein Stream mit Ton). Der Player wird einmal erzeugt;
 * Umsortieren übernimmt der Aufrufer per CSS, nie über das DOM (ein verschobenes iframe lädt neu).
 */
export default function TwitchLivePlayer({ channel, muted }: { channel: string; muted: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwitchPlayer | null>(null);
  const mutedRef = useRef(muted);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    loadTwitch().then(Twitch => {
      if (cancelled || !host) return;
      host.innerHTML = "";
      playerRef.current = new Twitch.Player(host, {
        channel,
        parent: [window.location.hostname],
        width: "100%",
        height: "100%",
        autoplay: true,
        muted: mutedRef.current,
      });
    }).catch(() => {
      if (host && !cancelled) host.textContent = "Twitch-Player konnte nicht geladen werden.";
    });
    return () => {
      cancelled = true;
      playerRef.current = null;
      if (host) host.innerHTML = "";
    };
  }, [channel]);

  useEffect(() => {
    mutedRef.current = muted;
    const p = playerRef.current;
    if (!p) return;
    p.setMuted(muted);
    if (!muted) p.setVolume(0.8);
  }, [muted]);

  return <div ref={hostRef} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" />;
}
