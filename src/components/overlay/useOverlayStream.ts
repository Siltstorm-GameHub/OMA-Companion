"use client";

import { useEffect, useState } from "react";

const RETRY_MIN_MS = 1500;
const RETRY_MAX_MS = 30_000;
const BUILD_ID = process.env.OMA_BUILD_ID ?? "dev";
const RELOAD_KEY = "oma-overlay-reloaded-for";

/**
 * Läuft auf dem Server bereits ein neueres Deployment, lädt sich das Overlay einmal neu, damit es
 * den aktuellen Code bekommt. OBS-Browserquellen werden sonst nie neu geladen — ein Overlay vom
 * Vortag würde z.B. neue Hintergründe nicht kennen und stattdessen den Standard zeigen.
 * Höchstens ein Neuladen je Server-Build (sessionStorage), damit z.B. ein noch gecachter alter
 * Stand nie zu einer Neulade-Schleife führt.
 */
function reloadIfOutdated(raw: string) {
  let serverBuild: string;
  try { serverBuild = JSON.parse(raw); } catch { return; }
  if (!serverBuild || serverBuild === BUILD_ID || serverBuild === "dev" || BUILD_ID === "dev") return;
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === serverBuild) return;
    sessionStorage.setItem(RELOAD_KEY, serverBuild);
  } catch { /* ohne sessionStorage trotzdem einmal neu laden */ }
  window.location.reload();
}

/**
 * Abonniert einen Overlay-SSE-Stream und liefert jeweils den letzten Stand. `initial` kommt vom
 * Server-Render der Seite, damit das Overlay in OBS sofort Inhalt zeigt statt kurz leer zu sein.
 * Nach einem Deployment lädt sich das Overlay beim nächsten Verbindungsaufbau selbst neu
 * (spätestens nach 4 Minuten, siehe reloadIfOutdated). Bei Verbindungsabbruch (u.a. das reguläre
 * Stream-Ende nach 4 Minuten) bleibt der letzte Stand stehen und es wird neu verbunden — bei wiederholten Fehlern (z.B. Link neu erzeugt → 403) mit
 * wachsender Pause, statt den Server im Sekundentakt anzufragen.
 */
export function useOverlayStream<T>(url: string, initial: T): T {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryMs = RETRY_MIN_MS;

    function connect() {
      if (cancelled) return;
      es = new EventSource(url);
      es.addEventListener("build", (e) => reloadIfOutdated((e as MessageEvent).data));
      es.addEventListener("update", (e) => {
        retryMs = RETRY_MIN_MS;
        try { setState(JSON.parse((e as MessageEvent).data)); } catch { /* ignore */ }
      });
      es.onerror = () => {
        es?.close();
        if (cancelled) return;
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, [url]);

  return state;
}
