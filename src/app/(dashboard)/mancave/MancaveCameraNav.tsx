"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * DOM-Overlay für den Kamera-Ansichtswechsel — Geschwister vom `<Canvas>`,
 * absolut positioniert wie der bestehende Hinweistext in MancaveScene3D.tsx.
 * Reine Anzeige/Steuerung, kein eigener State — `activeIndex`/`views` kommen
 * von außen, `onNavigate` ruft dort `setActiveViewIndex` auf.
 */
export function MancaveCameraNav({ activeIndex, views, onNavigate }: {
  activeIndex: number;
  views: { id: string; label: string }[];
  onNavigate: (delta: 1 | -1) => void;
}) {
  return (
    <>
      <button onClick={() => onNavigate(-1)} aria-label="Vorherige Ansicht"
        className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
        style={{ background: "rgba(4,10,9,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <ChevronLeft className="w-5 h-5 text-gray-200" />
      </button>
      <button onClick={() => onNavigate(1)} aria-label="Nächste Ansicht"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
        style={{ background: "rgba(4,10,9,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <ChevronRight className="w-5 h-5 text-gray-200" />
      </button>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full pointer-events-none"
        style={{ background: "rgba(4,10,9,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {views.map((v, i) => (
          <span key={v.id} title={v.label} aria-label={v.label}
            className="rounded-full transition-all"
            style={{
              width: i === activeIndex ? 16 : 6, height: 6,
              background: i === activeIndex ? "#2dd4bf" : "rgba(255,255,255,0.3)",
            }} />
        ))}
      </div>
    </>
  );
}
