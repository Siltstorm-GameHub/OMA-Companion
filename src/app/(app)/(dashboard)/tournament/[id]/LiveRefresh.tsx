"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "@/components/icons";

/** Tippt der Nutzer gerade etwas ein? Dann nicht neu laden (Formular-Zustand bleibt zwar erhalten, aber ruhiger). */
function isTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);
}

/**
 * Während ein Event läuft (ausgelost, live, Abstimmung): Seite regelmäßig neu laden — Baum, Tabellen
 * und Meldungen bleiben aktuell, ohne dass man selbst neu laden muss. Pausiert, solange der Tab
 * verborgen ist oder man tippt; beim Zurückkehren in den Tab sofort aktualisieren.
 * Zeigt dezent "aktualisiert vor 20 s". router.refresh() behält den Zustand der Client-Komponenten.
 */
export default function LiveRefresh({ intervalMs = 45_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [last, setLast] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const lastRef = useRef(last);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || isTyping()) return;
      router.refresh();
      lastRef.current = Date.now();
      setLast(lastRef.current);
    };
    const tick = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - lastRef.current >= intervalMs) refresh();
    }, 5_000);
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - lastRef.current > 10_000) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onVisible); };
  }, [router, intervalMs]);

  const secs = Math.max(0, Math.round((now - last) / 1000));
  const label = secs < 10 ? "gerade eben" : secs < 60 ? `vor ${Math.floor(secs / 10) * 10} s` : `vor ${Math.floor(secs / 60)} Min`;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-subtle" title="Die Seite aktualisiert sich automatisch, solange das Event läuft">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-live" />
      </span>
      Live · aktualisiert {label}
      <button type="button" onClick={() => { router.refresh(); lastRef.current = Date.now(); setLast(lastRef.current); setNow(Date.now()); }}
        aria-label="Jetzt aktualisieren" className="grid size-7 place-items-center rounded-control text-subtle hover:bg-surface-3 hover:text-fg">
        <RefreshCw className="size-3.5" />
      </button>
    </span>
  );
}
