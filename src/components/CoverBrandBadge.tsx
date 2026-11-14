/**
 * Marken-Rahmen für Cover: Diagonalstreifen in den oberen Ecken, farbige
 * Eckakzente, obere Trennlinie, "OLD MASTERS ALLIES"-Wasserzeichen und Vignette
 * — auf jedes Cover ohne eigenes Branding komponiert. Das Logo-Siegel
 * "OMA Original" unten rechts kommt nur bei OMA Originals dazu (lib/oma-original.ts),
 * (Steam-Cover, eigener Upload, Reihen-Cover oder Gradient-Fallback), damit
 * jedes große Cover dieselbe erkennbare Optik trägt. Spiegelt 1:1 den
 * Server-Renderer in lib/branded-cover.ts (Discord/OG-Bilder).
 *
 * Nur für großformatige Cover gedacht (Hero-Banner, Karten) — bei kleinen
 * Thumbnails (w-10 h-10 o.ä.) würde das nur unruhig wirken, siehe
 * `brandBadge`-Prop an GameCover/EventCoverDefault.
 */
export default function CoverBrandBadge({ omaOriginal = false }: { omaOriginal?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 680 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cbb-teal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cbb-red" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b2020" stopOpacity="0" />
            <stop offset="100%" stopColor="#8b2020" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="cbb-top" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cbb-div" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
            <stop offset="30%" stopColor="#14b8a6" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#8b2020" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8b2020" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points="0,0 300,0 0,210" fill="url(#cbb-teal)" />
        <polygon points="680,0 380,0 680,210" fill="url(#cbb-red)" />

        <line x1="0" y1="34" x2="34" y2="0" stroke="#14b8a6" strokeOpacity="0.85" strokeWidth="2" />
        <line x1="0" y1="26" x2="26" y2="0" stroke="#14b8a6" strokeOpacity="0.5" strokeWidth="1.2" />
        <line x1="680" y1="34" x2="646" y2="0" stroke="#8b2020" strokeOpacity="0.85" strokeWidth="2" />
        <line x1="680" y1="26" x2="654" y2="0" stroke="#8b2020" strokeOpacity="0.5" strokeWidth="1.2" />

        <line x1="0" y1="1" x2="680" y2="1" stroke="url(#cbb-top)" strokeWidth="2.5" />
        <line x1="26" y1="330" x2="290" y2="330" stroke="url(#cbb-div)" strokeWidth="1.2" />

        <rect x="0" y="180" width="4" height="36" rx="2" fill="#14b8a6" fillOpacity="0.9" />
        <rect x="676" y="180" width="4" height="36" rx="2" fill="#8b2020" fillOpacity="0.9" />

        <circle cx="18" cy="354" r="2.5" fill="#14b8a6" fillOpacity="0.8" />
        <text
          x="30" y="358" textAnchor="start"
          fontFamily="system-ui,ui-sans-serif,sans-serif"
          fontSize="12" fontWeight="800" letterSpacing="5"
          fill="#ffffff" fillOpacity="0.55"
        >
          OLD MASTERS ALLIES
        </text>
      </svg>

      {omaOriginal && (
        <div
          className="absolute bottom-2 right-2 flex flex-col items-center gap-1 rounded-xl bg-black/85 border-2 border-teal-400/75 shadow-lg shadow-black/50 px-3 pt-2.5 pb-1.5"
          title="OMA Original"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- statisches Asset, next/image lohnt sich für ein kleines Icon nicht */}
          <img src="/brand/logo-256.png" alt="OMA Original" className="h-9 w-auto object-contain" />
          <span className="text-[9px] font-extrabold uppercase leading-none tracking-[0.18em] whitespace-nowrap">
            <span className="text-teal-300">OMA</span> <span className="text-white">Original</span>
          </span>
        </div>
      )}
    </div>
  );
}
