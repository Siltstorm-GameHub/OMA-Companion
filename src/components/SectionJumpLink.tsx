"use client";
import type { ReactNode } from "react";

/** Event, das eingeklappte Bereiche (z.B. Absprachen) auf einen Sprung hin öffnet. */
export const SECTION_JUMP_EVENT = "oma:section-jump";

/**
 * Sprung zu einem Abschnitt derselben Seite — ohne neuen History-Eintrag. Ein normaler `#`-Link legt
 * einen an und löst `popstate` aus; das hält ExitAppGuard für "Zurück" und leitet weg.
 * Ist das Ziel unsichtbar (mobil eingeklappt), wird eine sichtbare Alternative mit
 * `data-jump-target="<id>"` genommen und, falls es ein <details> ist, aufgeklappt.
 */
export default function SectionJumpLink({ target, className, children }: { target: string; className?: string; children: ReactNode }) {
  function jump(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // neuer Tab o.ä. normal lassen
    e.preventDefault();
    const candidates = [
      document.getElementById(target),
      ...Array.from(document.querySelectorAll<HTMLElement>(`[data-jump-target="${target}"]`)),
    ].filter((el): el is HTMLElement => !!el);
    const el = candidates.find(c => c.offsetParent !== null) ?? candidates[0];
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    window.dispatchEvent(new CustomEvent(SECTION_JUMP_EVENT, { detail: target }));
    // Nach dem Aufklappen scrollen (ein Frame später steht das Layout)
    requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    history.replaceState(history.state, "", `#${target}`);
  }
  return <a href={`#${target}`} onClick={jump} className={className}>{children}</a>;
}
