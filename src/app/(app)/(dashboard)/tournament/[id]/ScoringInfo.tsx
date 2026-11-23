"use client";
import { useState, type ReactNode } from "react";
import { HelpCircle, X } from "@/components/icons";

/**
 * "Wie wird gewertet?" an jeder Turnier-Tabelle: kleiner Knopf in der Überschrift, darunter
 * 2–3 Sätze, was zählt und wofür. Begriffe überall gleich:
 * Eventpunkte (Platzierung in DIESEM Event) · Tabellenpunkte (für die Tabelle der Eventreihe) ·
 * Rang-Punkte (globale Rangliste) · Münzen (Belohnung).
 */
export function ScoringInfoButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
        open ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:text-fg"
      }`}>
      <HelpCircle className="size-3.5" /> Wie wird gewertet?
    </button>
  );
}

export function ScoringInfoPanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="mb-3 rounded-control border border-primary/30 bg-primary-soft/50 px-4 py-3 text-sm leading-relaxed text-fg/90">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
        <button type="button" onClick={onClose} aria-label="Schließen" className="grid size-8 shrink-0 place-items-center rounded-control text-subtle hover:bg-surface-3 hover:text-fg">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Knopf + Panel in einem (wenn Überschrift und Panel direkt untereinander stehen) */
export function useScoringInfo() {
  const [open, setOpen] = useState(false);
  return {
    button: <ScoringInfoButton open={open} onToggle={() => setOpen(o => !o)} />,
    panel: (children: ReactNode) => (open ? <ScoringInfoPanel onClose={() => setOpen(false)}>{children}</ScoringInfoPanel> : null),
  };
}

/** Begriffe der Punkte — gleiche Erklärung überall */
export const POINTS_GLOSSARY = (
  <ul className="mt-1 space-y-0.5 text-xs text-muted">
    <li><b className="text-fg">Eventpunkte</b>: entscheiden die Platzierung in diesem Event.</li>
    <li><b className="text-fg">Tabellenpunkte</b>: zählen für die Tabelle der Eventreihe (nur bei Reihen-Terminen).</li>
    <li><b className="text-fg">Rang-Punkte</b>: gibt es für gute Platzierungen, sie zählen für die Rangliste.</li>
  </ul>
);
