/**
 * Dezente Vignette + Logo-Badge unten rechts — auf jedes Cover ohne
 * eigenes Branding komponiert (Steam-Cover, eigener Upload, Reihen-Cover
 * oder der Marken-Gradient-Fallback), damit jedes große Cover gleich
 * "OMA Companion" wirkt. Nur für großformatige Cover gedacht (Hero-Banner,
 * Karten) — bei kleinen Thumbnails (w-10 h-10 o.ä.) würde der Chip nur
 * unruhig wirken, siehe `brandBadge`-Prop an GameCover/EventCoverDefault.
 */
export default function CoverBrandBadge() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
      <div className="absolute bottom-2 right-2 flex items-center justify-center rounded-lg bg-black/55 border border-white/[0.12] px-1.5 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- statisches Asset, next/image lohnt sich für ein 20px-Icon nicht */}
        <img src="/brand/logo-256.png" alt="" className="h-3.5 w-auto object-contain opacity-90" />
      </div>
    </div>
  );
}
