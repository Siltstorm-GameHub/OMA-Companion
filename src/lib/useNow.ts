"use client";
import { useState, useEffect } from "react";

/**
 * Tickende "aktuelle Zeit" für Client-Komponenten.
 *
 * `Date.now()` direkt im Render hat zwei Probleme: der Wert friert beim ersten Render ein
 * (eine Umfrage bleibt sichtbar "offen", obwohl ihr Zeitfenster während des Zuschauens
 * abgelaufen ist), und Server- und Client-Render können unterschiedliche Werte sehen.
 * Dieser Hook hält den Wert stattdessen im State und aktualisiert ihn periodisch.
 *
 * @param intervalMs Aktualisierungsintervall. Voreinstellung 30s — fein genug für
 *                   Umfrage-Fenster, ohne unnötig oft neu zu rendern.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
