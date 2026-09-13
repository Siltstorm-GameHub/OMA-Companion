// ============================================
// Gemeinsame Pack-Cover-Optik — Shop & Pack-Öffnen
// ============================================
// Jede Pack-Sorte hat eine per Canva generierte Foil-Textur (rein
// Hintergrundmuster, kein Text/Logo — siehe public/battle-cards/packs/),
// darüber liegen echtes OMA-Logo + "Battle Cards"-Schriftzug als normale
// HTML-Ebene (scharf bei jeder Auflösung, keine Neu-Generierung bei
// Text-Änderungen). Wird sowohl im Shop (BuyPack.tsx) als auch beim
// Pack-Öffnen (PackOpener.tsx) verwendet, damit beide Stellen exakt
// gleich aussehen.

export type PackVisualKind = "STANDARD" | "PREMIUM" | "COMMUNITY";

export const PACK_TEXTURE: Record<PackVisualKind, string> = {
  STANDARD: "/battle-cards/packs/standard-texture.png",
  PREMIUM: "/battle-cards/packs/premium-texture.png",
  COMMUNITY: "/battle-cards/packs/community-texture.png",
};

export const PACK_COVER_LABEL: Record<PackVisualKind, string> = {
  STANDARD: "Standard",
  PREMIUM: "Premium",
  COMMUNITY: "Community",
};

// Farbwäsche über der Textur je Sorte — Teal/Maroon aus dem OMA-Logo für
// Standard/Premium, Violett für Community — sorgt für Markenbezug und
// genug Kontrast, damit Logo/Schriftzug lesbar bleiben.
const PACK_TINT: Record<PackVisualKind, string> = {
  STANDARD: "linear-gradient(165deg, rgba(15,118,110,0.5) 0%, rgba(8,47,44,0.78) 100%)",
  PREMIUM: "linear-gradient(165deg, rgba(127,29,29,0.5) 0%, rgba(69,10,10,0.8) 100%)",
  COMMUNITY: "linear-gradient(165deg, rgba(88,28,135,0.42) 0%, rgba(30,10,60,0.78) 100%)",
};

/** Gezackte Crimp-Kante wie bei echten Booster-Packs, oben und unten. */
function crimpClipPath(teeth = 14): string {
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100;
    pts.push(`${x}% ${i % 2 === 0 ? 0 : 6}%`);
  }
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    pts.push(`${x}% ${i % 2 === 0 ? 100 : 94}%`);
  }
  return `polygon(${pts.join(", ")})`;
}
export const PACK_CLIP_PATH = crimpClipPath();

/** Volles Pack-Cover mit Logo + Schriftzug. `cropped` schneidet die
 *  Crimp-Zacken zu (Öffnen-Animation), sonst abgerundetes Rechteck (Shop). */
export function PackCoverArt({
  kind,
  cropped = false,
  showLabel = true,
  className = "",
}: {
  kind: PackVisualKind;
  cropped?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={cropped ? { clipPath: PACK_CLIP_PATH } : { borderRadius: 14 }}
    >
      <img src={PACK_TEXTURE[kind]} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: PACK_TINT[kind] }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.32) 45%, rgba(255,255,255,0.05) 56%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
        <img
          src="/brand/logo-64.png"
          alt="OMA"
          className="w-8 h-8"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
        />
        <p
          className="text-[11px] font-black uppercase tracking-wide text-white"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}
        >
          Battle Cards
        </p>
        {showLabel && (
          <p
            className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/85"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}
          >
            {PACK_COVER_LABEL[kind]}
          </p>
        )}
      </div>
    </div>
  );
}
