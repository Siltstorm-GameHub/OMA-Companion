"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Lädt die Seite still neu (router.refresh, Zustand der Client-Komponenten bleibt), solange etwas live ist —
 * z. B. auf der Übersicht, wenn ein Event gleich startet oder läuft oder du ein offenes Match hast. So springt die
 * Bühne von selbst auf "läuft", "dein Match" oder "Ergebnisse". Pausiert bei verborgenem Tab und beim Tippen;
 * beim Zurückkehren in den Tab sofort. Zeigt nichts an (anders als LiveRefresh auf der Turnierseite).
 */
export default function QuietRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const typing = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);
    };
    const refresh = () => {
      if (document.visibilityState !== "visible" || typing()) return;
      router.refresh();
      last.current = Date.now();
    };
    const tick = setInterval(() => { if (Date.now() - last.current >= intervalMs) refresh(); }, 10_000);
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - last.current > 15_000) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onVisible); };
  }, [router, intervalMs]);

  return null;
}
