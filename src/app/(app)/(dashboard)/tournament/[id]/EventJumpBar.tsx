"use client";
import { useEffect, useRef, useState } from "react";
import SectionJumpLink from "@/components/SectionJumpLink";

/** Sichtbares Ziel eines Abschnitts: das Element mit der id oder eine sichtbare Alternative (data-jump-target) */
function visibleTarget(id: string): HTMLElement | null {
  const all = [document.getElementById(id), ...Array.from(document.querySelectorAll<HTMLElement>(`[data-jump-target="${id}"]`))]
    .filter((el): el is HTMLElement => !!el);
  return all.find(el => el.offsetParent !== null) ?? null;
}

type Badge = { text?: string; tone: "count" | "alert" | "live" };

/**
 * Sprungleiste der Eventseite (klebt unter der Kopfzeile). Der Abschnitt, in dem man gerade ist,
 * wird hervorgehoben und in der Leiste sichtbar gehalten. Badges: Anzahl, Ungelesenes/Offenes, live.
 */

export default function EventJumpBar({ links }: { links: { target: string; label: string; badge?: Badge }[] }) {
  const [active, setActive] = useState(links[0]?.target ?? "");
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // Aktiv = letzter Abschnitt, dessen Anfang oberhalb der Leiste (+ etwas Luft) liegt
      const line = (barRef.current?.getBoundingClientRect().bottom ?? 120) + 24;
      let current = links[0]?.target ?? "";
      for (const l of links) {
        const el = visibleTarget(l.target);
        if (el && el.getBoundingClientRect().top <= line) current = l.target;
      }
      // Ganz unten angekommen: letzter Abschnitt
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = links[links.length - 1]?.target ?? current;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [links]);

  // Aktiven Chip in der (horizontal scrollbaren) Leiste sichtbar halten
  useEffect(() => {
    // Nur horizontal scrollen (scrollIntoView würde auch die Seite bewegen)
    const nav = barRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!nav || !chip) return;
    const left = chip.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    if (left < nav.scrollLeft || left + chip.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: Math.max(0, left - 20), behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav ref={barRef} aria-label="Abschnitte"
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-[4.5rem] z-20 -mx-5 sm:mx-0 px-5 sm:px-0 py-2.5 mb-4 bg-canvas flex gap-1.5 overflow-x-auto scrollbar-none">
      {links.map(l => {
        const on = l.target === active;
        return (
          <span key={l.target} data-chip={l.target} className="shrink-0">
            <SectionJumpLink target={l.target}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
                on ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg"
              }`}>
              {l.label}
              {l.badge?.tone === "live" && <span className="size-1.5 rounded-full bg-live animate-pulse" aria-label="läuft" />}
              {l.badge?.text && (
                <span className={`rounded-full px-1.5 text-[11px] font-bold leading-4 tabular-nums ${
                  l.badge.tone === "alert" ? "bg-warning text-canvas" : "bg-surface-3 text-muted"
                }`}>{l.badge.text}</span>
              )}
            </SectionJumpLink>
          </span>
        );
      })}
    </nav>
  );
}
