"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Wenn der Spieltag noch aktiv ist, aktualisiert diese Komponente die Seite
 * automatisch alle 30 Sekunden, damit neue Ergebnisse erscheinen.
 */
export default function LiveRefresh({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "active") return;

    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => clearInterval(interval);
  }, [status, router]);

  if (status !== "active") return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400/80">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Live
    </span>
  );
}
