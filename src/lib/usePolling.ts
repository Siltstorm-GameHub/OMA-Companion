"use client";
import { useEffect, useRef } from "react";

/**
 * Ruft `fn` sofort und danach alle `intervalMs` auf — aber nur, solange der Tab sichtbar ist.
 *
 * Hintergrund-Tabs pollen sonst endlos weiter und erzeugen Vercel-Function-Aufrufe (und damit
 * "Fluid Active CPU"), obwohl niemand hinschaut. Wird der Tab wieder sichtbar, wird sofort
 * nachgeladen, falls der letzte Aufruf länger als ein Intervall zurückliegt.
 *
 * `intervalMs = null` deaktiviert das Polling. `fn` darf sich bei jedem Render ändern
 * (wird über eine Ref gelesen), ein neues Intervall startet nur bei geändertem `intervalMs`.
 */
export function usePolling(fn: () => unknown, intervalMs: number | null, { immediate = true } = {}) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (intervalMs == null) return;
    let timer: ReturnType<typeof setInterval> | undefined;

    const run = () => {
      lastRunRef.current = Date.now();
      void fnRef.current();
    };
    const start = () => {
      if (timer) return;
      timer = setInterval(run, intervalMs);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) return stop();
      if (Date.now() - lastRunRef.current >= intervalMs) run();
      start();
    };

    if (!document.hidden) {
      if (immediate) run();
      else lastRunRef.current = Date.now();
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, immediate]);
}
