// Lokaler Entwurf des Event-Wizards (nur in diesem Browser) — schützt vor Datenverlust durch Neuladen,
// versehentliches "Zurück zur Auswahl" oder einen geschlossenen Tab.
import { useState, useSyncExternalStore } from "react";

const DRAFT_KEY = "oma-event-wizard-draft";
/** Entwürfe älter als das werden nicht mehr angeboten */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type WizardDraft = { savedAt: string; values: Record<string, unknown> };

export function writeDraft(values: Record<string, unknown>) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: new Date().toISOString(), values })); } catch { /* voll/blockiert */ }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* blockiert */ }
}

function parseDraft(raw: string | null): WizardDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as WizardDraft;
    if (!d || typeof d.savedAt !== "string" || typeof d.values !== "object") return null;
    if (Date.now() - new Date(d.savedAt).getTime() > MAX_AGE_MS) return null;
    return d;
  } catch { return null; }
}

// Pro Wizard-Aufruf genau EINMAL lesen: spätere Autosaves desselben Aufrufs dürfen nicht als
// "gefundener Entwurf" erscheinen. Auf dem Server (und beim Hydrieren) gibt es keinen Entwurf.
const snapshots = new Map<symbol, string | null>();
const noopSubscribe = () => () => {};

/** Beim Öffnen des Wizards vorgefundener Entwurf (null = keiner). */
export function useInitialDraft(): WizardDraft | null {
  const [key] = useState(() => Symbol("wizard"));
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (!snapshots.has(key)) {
        let value: string | null = null;
        try { value = localStorage.getItem(DRAFT_KEY); } catch { /* blockiert */ }
        snapshots.set(key, value);
      }
      return snapshots.get(key) ?? null;
    },
    () => null,
  );
  return parseDraft(raw);
}
