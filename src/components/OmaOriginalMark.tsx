// Kleiner Hinweis "OMA Original" für Listen und kleine Vorschaubilder, wo das Logo-Siegel
// auf dem Cover zu klein wäre (siehe CoverBrandBadge für große Cover, lib/oma-original.ts).
// Das rote Hexagon stammt aus dem OMA-Logo und ist dessen kleine Form.

/** Rotes Hexagon aus dem Logo — bleibt bis ~10 px erkennbar. */
export function OmaHex({ className = "w-3 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 112" className={`shrink-0 ${className}`} aria-hidden>
      <polygon points="50,4 95,30 95,82 50,108 5,82 5,30" fill="#9b1c24" stroke="#f4f5f5" strokeWidth="9" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * - "chip": Hexagon + "OMA Original" als Etikett, für Zeilen in Listen
 * - "icon": nur das Hexagon (mit Tooltip), für sehr enge Stellen
 */
export default function OmaOriginalMark({ variant = "chip", className = "" }: { variant?: "chip" | "icon"; className?: string }) {
  if (variant === "icon") {
    return (
      <span className={`inline-flex shrink-0 ${className}`} title="OMA Original" aria-label="OMA Original" role="img">
        <OmaHex />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 border border-teal-500/30 bg-teal-500/10 text-[10px] font-bold uppercase leading-none tracking-[0.12em] whitespace-nowrap ${className}`}
      title="Eigenes Event der Old Masters Allies"
    >
      <OmaHex className="w-2.5 h-3" />
      <span><span className="text-teal-300">OMA</span> <span className="text-gray-200">Original</span></span>
    </span>
  );
}
