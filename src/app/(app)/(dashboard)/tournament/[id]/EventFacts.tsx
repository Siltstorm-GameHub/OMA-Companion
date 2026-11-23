"use client";
import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "@/components/icons";
import { FACT } from "./event-facts-style";

/**
 * Fakten unter dem Kopf: die wichtigsten (Spiel, Plätze, Belohnung) immer sichtbar, der Rest
 * (Format, Kategorie, Zuschauer, Endwertung, Spieleliste …) hinter "Details".
 */
export default function EventFacts({ primary, more }: { primary: ReactNode[]; more: ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const main = primary.filter(Boolean);
  const extra = more.filter(Boolean);
  if (main.length === 0 && extra.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {main.map((n, i) => <Fragment key={i}>{n}</Fragment>)}
        {extra.length > 0 && (
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            className={`${FACT} text-primary-fg hover:border-line-strong hover:text-fg`}>
            {open ? "Weniger" : "Details"}
            <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && extra.length > 0 && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{extra.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</div>}
    </div>
  );
}
