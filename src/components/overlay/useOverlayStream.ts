"use client";

import { useEffect, useState } from "react";

const RETRY_MIN_MS = 1500;
const RETRY_MAX_MS = 30_000;

/**
 * Abonniert einen Overlay-SSE-Stream und liefert jeweils den letzten Stand. `initial` kommt vom
 * Server-Render der Seite, damit das Overlay in OBS sofort Inhalt zeigt statt kurz leer zu sein.
 * Bei Verbindungsabbruch (u.a. das reguläre Stream-Ende nach 4 Minuten) bleibt der letzte Stand
 * stehen und es wird neu verbunden — bei wiederholten Fehlern (z.B. Link neu erzeugt → 403) mit
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
