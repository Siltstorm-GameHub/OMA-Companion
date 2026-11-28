"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "@/components/icons";

/**
 * Bilder groß ansehen (z. B. Ergebnis-Screenshots vor dem Senden oder die des Gegners): Pfeile/Wischen zum
 * Blättern, Esc oder Tippen daneben schließt. Rendert per Portal in <body>, damit es auch aus Panels heraus
 * den ganzen Bildschirm füllt.
 */
export default function ImageLightbox({ images, start = 0, onClose }: { images: string[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, images.length - 1));
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setI(v => (v + d + images.length) % images.length);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI(v => (v + 1) % images.length);
      else if (e.key === "ArrowLeft") setI(v => (v - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (images.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Bild ansehen" className="fixed inset-0 z-[70] flex flex-col bg-canvas/95"
      onClick={onClose}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40 && images.length > 1) go(dx < 0 ? 1 : -1);
      }}>
      <div className="flex items-center justify-between p-3 text-sm text-muted">
        <span className="tabular-nums">{images.length > 1 ? `${i + 1} / ${images.length}` : ""}</span>
        <button type="button" onClick={onClose} aria-label="Schließen" className="grid size-11 place-items-center rounded-control hover:bg-surface-2 hover:text-fg">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Upload (Blob) */}
        <img src={images[i]} alt="" className="max-h-full max-w-full rounded-control object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Vorheriges Bild"
              className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-fg max-sm:hidden"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Nächstes Bild"
              className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-fg max-sm:hidden"><ChevronRight className="size-5" /></button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
