import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/icons";

/**
 * Gemeinsames Gerüst der Startseiten-Kacheln (Events, Clip des Monats): Medium 16:9 →
 * Hauptzeile mit einer Aktion → genau zwei Listenzeilen → Fußzeile. Feste Höhen pro Feld,
 * damit nebeneinanderstehende Kacheln immer gleich hoch sind, egal welcher Zustand gerade
 * gezeigt wird. Fehlende Listenzeilen füllt ein ruhiger Platzhalter.
 */
export type HubAccent = "teal" | "violet";

const ACCENT: Record<HubAccent, { border: string; borderStrong: string; footer: string; hover: string }> = {
  teal:   { border: "border-primary/25",  borderStrong: "border-primary/50",  footer: "text-primary-fg",   hover: "hover:bg-primary/[0.06]" },
  violet: { border: "border-[#9146ff]/30", borderStrong: "border-[#9146ff]/55", footer: "text-violet-300", hover: "hover:bg-violet-400/[0.06]" },
};

export type HubRow = {
  key: string;
  href?: string;
  /** schmale linke Spalte, z.B. "SO 23", "#2" */
  lead: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
};

export default function HubTile({
  accent, media, main, rows, placeholderRow, footer, highlighted = false, className = "", ariaLabel, stage = false,
}: {
  /** "Bühne" der Übersicht: ab lg Medium links, Inhalt rechts (statt untereinander) */
  stage?: boolean;
  accent: HubAccent;
  media: ReactNode;
  main: ReactNode;
  rows: HubRow[];
  /** Ersatz, falls weniger als zwei Zeilen da sind */
  placeholderRow: { label: string; href: string };
  footer: { label: ReactNode; href: string };
  /** stärkerer Rahmen, z.B. wenn die Kachel gerade etwas Persönliches zeigt */
  highlighted?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const a = ACCENT[accent];
  const filled = rows.slice(0, 2);

  return (
    <section aria-label={ariaLabel}
      className={`surface flex h-full flex-col overflow-hidden rounded-card border ${stage ? "lg:flex-row" : ""} ${highlighted ? a.borderStrong : a.border} shadow-card ${className}`}>
      <div className={`relative aspect-video shrink-0 overflow-hidden ${stage ? "lg:aspect-auto lg:min-h-[19rem] lg:w-1/2" : ""}`}>{media}</div>

      <div className="flex min-w-0 flex-1 flex-col">

      {/* Bühne ab lg: Titel groß über der Hauptaktion (volle Breite) statt alles in einer Zeile */}
      <div className={stage
        ? "flex shrink-0 items-center gap-3 px-4 py-3.5 lg:flex-1 lg:flex-col lg:items-stretch lg:justify-center lg:gap-4 lg:px-5 lg:py-5"
        : "flex h-[68px] shrink-0 items-center gap-3 px-3.5"}>{main}</div>

      <ul className="shrink-0">
        {filled.map(r => (
          <li key={r.key} className="h-10 border-t border-line">
            <RowInner row={r} hover={a.hover} />
          </li>
        ))}
        {filled.length < 2 && (
          <li className={`border-t border-line ${filled.length === 0 ? "h-20" : "h-10"}`}>
            <Link href={placeholderRow.href} className={`flex h-full items-center px-3.5 text-xs text-subtle transition-colors ${a.hover} hover:text-fg`}>
              {placeholderRow.label}
            </Link>
          </li>
        )}
      </ul>

      <Link href={footer.href}
        className={`${stage ? "" : "mt-auto"} flex h-11 shrink-0 items-center justify-between border-t border-line px-3.5 text-xs font-semibold ${a.footer} transition-colors ${a.hover}`}>
        <span>{footer.label}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
      </div>
    </section>
  );
}

function RowInner({ row, hover }: { row: HubRow; hover: string }) {
  const inner = (
    <>
      <span className="w-14 shrink-0 text-xs font-medium text-subtle tabular-nums">{row.lead}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{row.label}</span>
      {row.hint && <span className="shrink-0 text-xs">{row.hint}</span>}
    </>
  );
  return row.href
    ? <Link href={row.href} className={`flex h-full items-center gap-2 px-3.5 transition-colors ${hover}`}>{inner}</Link>
    : <div className="flex h-full items-center gap-2 px-3.5">{inner}</div>;
}
