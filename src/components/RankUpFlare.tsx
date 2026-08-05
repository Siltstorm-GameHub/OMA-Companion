"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getRank } from "@/lib/ranks";

interface RankUpFlareProps {
  /** Eigene User-ID — der Merker wird pro Account gespeichert. */
  userId: string;
  rankPoints: number;
  children: ReactNode;
}

/** "6-III" → vergleichbare Zahl (Rang wiegt schwerer als Stufe) */
function toOrdinal(key: string): number | null {
  const [tier, label] = key.split("-");
  const t = Number(tier);
  if (!Number.isFinite(t) || !label) return null;
  return t * 10 + label.length;
}

/**
 * Lässt den Rang-Ring einmal aufflackern, wenn der eigene Rang seit dem letzten
 * Besuch gestiegen ist.
 *
 * Der Merker liegt in localStorage statt in der DB: es braucht kein Schema, und der
 * Effekt ist ohnehin pro Gerät sinnvoll — wer auf dem Handy schon gefeiert hat, muss
 * es am Desktop nicht nochmal sehen.
 */
export default function RankUpFlare({ userId, rankPoints, children }: RankUpFlareProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const rank    = getRank(rankPoints);
    const key     = `oma:rank:${userId}`;
    const current = `${rank.tier}-${rank.tierLabel}`;

    let previous: string | null = null;
    try {
      previous = localStorage.getItem(key);
      localStorage.setItem(key, current);
    } catch {
      return; // Privater Modus o.ä. — dann eben ohne Feier
    }

    // Beim allerersten Besuch nichts feiern, sonst flackert es für jeden Neuling grundlos.
    if (!previous || previous === current) return;

    // Nur bei Aufstieg. Ein Abstieg (Punktekorrektur durch Admins) wird nicht gefeiert.
    const before = toOrdinal(previous);
    const after  = toOrdinal(current);
    if (before === null || after === null || after <= before) return;

    const el = ref.current?.querySelector<HTMLElement>(".rank-ring");
    if (!el) return;

    el.classList.add("rr-flare");
    const done = (e: AnimationEvent) => {
      // Nur die eigene Animation abräumen — animationend blubbert auch von Kindern hoch.
      if (e.animationName !== "rr-flare") return;
      el.classList.remove("rr-flare");
      el.removeEventListener("animationend", done);
    };
    el.addEventListener("animationend", done);
    return () => el.removeEventListener("animationend", done);
  }, [userId, rankPoints]);

  // display:contents — der Wrapper darf das Layout des Avatars nicht verändern.
  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
