"use client";
import { useSyncExternalStore } from "react";

/**
 * Reagiert auf eine CSS-Media-Query (z.B. "(min-width: 1024px)"). Auf dem Server und beim ersten
 * Rendern `false` (kein Hydration-Mismatch), danach der echte Wert — ohne setState im Effekt.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
