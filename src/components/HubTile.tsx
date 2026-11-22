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
  teal:   { border: "border-teal-400/25",  borderStrong: "border-teal-400/50",  footer: "text-teal-300",   hover: "hover:bg-teal-400/[0.06]" },
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
      <div className={`relative aspect-video shrink-0 overflow-hidden ${stage ? "lg:aspect-auto lg:min-h-[17rem] lg:w-[58%]" : ""}`}>{media}</div>

      <div className="flex min-w-0 flex-1 flex-col">

      <div className="flex h-[64px] shrink-0 items-center gap-3 px-3.5">{main}</div>

      <ul className="shrink-0">
        {filled.map(r => (
          <li key={r.key} className="h-[34px] border-t border-line">
            <RowInner row={r} hover={a.hover} />
          </li>
        ))}
        {filled.length < 2 && (
          <li className={`border-t border-line ${filled.length === 0 ? "h-[68px]" : "h-[34px]"}`}>
            <Link href={placeholderRow.href} className={`flex h-full items-center px-3.5 text-[11px] text-gray-500 transition-colors ${a.hover} hover:text-gray-300`}>
              {placeholderRow.label}
            </Link>
          </li>
        )}
      </ul>

      <Link href={footer.href}
        className={`mt-auto flex h-[38px] shrink-0 items-center justify-between border-t border-line px-3.5 text-[11px] font-semibold ${a.footer} transition-colors ${a.hover}`}>
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
      <span className="w-12 shrink-0 text-[11px] font-medium text-gray-500 tabular-nums">{row.lead}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-gray-200">{row.label}</span>
      {row.hint && <span className="shrink-0 text-[11px]">{row.hint}</span>}
    </>
  );
  return row.href
    ? <Link href={row.href} className={`flex h-full items-center gap-2 px-3.5 transition-colors ${hover}`}>{inner}</Link>
    : <div className="flex h-full items-center gap-2 px-3.5">{inner}</div>;
}
