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

/**
 * Siegel "OMA Original" mit dem echten Logo, für Kacheln (Event-Karten, Home-Kachel).
 * Steht im Inhalt der Kachel statt unten rechts auf dem Cover, wo es von Titel und Verlauf
 * verdeckt würde. Logo ab 28 px, darunter wäre es nur noch ein Farbfleck.
 */
export function OmaOriginalSeal({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 shrink-0 rounded-full pl-0.5 pr-3 py-0.5 border border-teal-400/60 bg-black/70 shadow-card whitespace-nowrap ${className}`}
      title="Eigenes Event der Old Masters Allies"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- statisches Asset, next/image lohnt sich für ein kleines Icon nicht */}
      <img
        src="/brand/logo-128.webp"
        alt=""
        className="w-7 h-7 rounded-full bg-black p-px"
        style={{ boxShadow: "0 0 0 1.5px rgba(45,212,191,0.8)" }}
      />
      <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.16em]">
        <span className="text-teal-300">OMA</span> <span className="text-white">Original</span>
      </span>
    </span>
  );
}

/** Trägt der Titel "OMA" schon am Anfang (z. B. "OMA Turnier Night")? Dann kein zweiter Vorsatz. */
export function titleHasOmaPrefix(title: string): boolean {
  return /^\s*oma\b/i.test(title);
}

/** Vorsatz "OMA" vor dem Titel eines Originals — klein, gesperrt, in Teal (wie in der Wortmarke). */
export function OmaTitlePrefix({ title, className = "" }: { title: string; className?: string }) {
  if (titleHasOmaPrefix(title)) return null;
  return (
    <span className={`font-semibold tracking-[0.18em] text-teal-300 text-[0.68em] align-[0.12em] mr-[0.4em] ${className}`}>OMA</span>
  );
}
