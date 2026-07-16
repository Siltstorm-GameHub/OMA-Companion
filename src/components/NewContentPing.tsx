"use client";
import { useEffect, useRef, useState } from "react";
import { playNotifySound } from "@/lib/notify-sound";

/**
 * Erkennt neuen Content seit dem letzten Besuch (per localStorage-Vergleich der `id`)
 * und lässt die Kind-Icons kurz "bouncen" + spielt einen dezenten Sound ab.
 */
export function NewContentPing({
  id,
  storageKey,
  sound = true,
  children,
}: {
  id: string | null;
  storageKey: string;
  sound?: boolean;
  children: React.ReactNode;
}) {
  const [bounce, setBounce] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    if (!id) return;
    const seen = localStorage.getItem(storageKey);
    if (seen === id) return;
    setBounce(true);
    if (sound && !played.current) {
      played.current = true;
      playNotifySound();
    }
    localStorage.setItem(storageKey, id);
    const t = setTimeout(() => setBounce(false), 1600);
    return () => clearTimeout(t);
  }, [id, storageKey, sound]);

  return <span className={bounce ? "icon-bounce-new" : undefined}>{children}</span>;
}
