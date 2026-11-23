"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "@/components/icons";
import { FIELD_CLASSES } from "@/components/ui/field-styles";

/**
 * Suche in großen Teilnehmerlisten (ab 20): blendet Zeilen per data-person aus, ohne die
 * (serverseitig gerenderte) Liste neu zu bauen.
 */
export default function ParticipantSearch({ children }: { children: ReactNode }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const term = q.trim().toLowerCase();
    let n = 0;
    root.querySelectorAll<HTMLElement>("[data-person]").forEach(el => {
      const ok = !term || (el.dataset.person ?? "").includes(term);
      el.hidden = !ok;
      if (ok) n++;
    });
    setHits(term ? n : null);
  }, [q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Teilnehmer suchen" aria-label="Teilnehmer suchen"
          className={`${FIELD_CLASSES} min-h-10 pl-9`} />
      </div>
      {hits === 0 && <p className="px-1 text-sm text-muted">Niemand gefunden.</p>}
      <div ref={ref}>{children}</div>
    </div>
  );
}
