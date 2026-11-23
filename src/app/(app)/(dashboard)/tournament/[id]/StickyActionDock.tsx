"use client";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Handy: Sobald die Aktionsleiste (Element mit `watchId`) nach oben aus dem Bild gescrollt ist,
 * erscheint über der unteren Navigation eine schmale Leiste mit dem Hauptknopf — "Anmelden",
 * "Bin bereit", "Ergebnis melden" … bleibt so immer erreichbar. Ab lg (Seitenleiste) nicht nötig.
 */
export default function StickyActionDock({ watchId, title, children }: { watchId: string; title: ReactNode; children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(watchId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      // Nur zeigen, wenn die Leiste OBEN herausgescrollt ist (nicht, solange sie noch unten kommt)
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watchId]);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 z-30 px-3 transition-all duration-200 lg:hidden bottom-[calc(3.4375rem+max(env(safe-area-inset-bottom),0.5rem))] ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}>
      <div className="mb-2 flex items-center gap-3 rounded-card border border-line-strong bg-surface-2/95 px-3 py-2 shadow-card backdrop-blur">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-fg">{title}</p>
        <div className="flex shrink-0 items-center gap-2 [&_.flex-col]:items-end">{children}</div>
      </div>
    </div>
  );
}
