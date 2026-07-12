"use client";
import { useState } from "react";
import { HelpCircle } from "lucide-react";

// Kleines Info-Icon mit Klartext-Erklärung für komplexere Admin-Bereiche (Bracket, Punkte-Konfiguration, ...).
export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setOpen(false)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Erklärung anzeigen"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute z-20 left-0 top-5 w-64 rounded-lg border border-white/10 bg-gray-900 p-2.5 text-[11px] leading-relaxed text-gray-300 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}
