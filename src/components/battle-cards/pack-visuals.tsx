// ============================================
// Gemeinsame Pack-Cover-Optik — Shop & Pack-Öffnen
// ============================================
// Jede Pack-Sorte hat zwei per Canva generierte Bilder (siehe
// public/battle-cards/packs/): eine abstrakte Foil-Textur als Untergrund
// und ein gemaltes Helden-Artwork (je Sorte ein anderer Charakter/Stimmung,
// im Stil des OMA-Gems-Turnier-Covers). Das Artwork liegt per
// mix-blend-mode "screen" über der Textur — sein dunkler Hintergrund wird
// dadurch transparent und die Foil-Textur scheint drumherum durch, während
// der leuchtende Charakter klar sichtbar bleibt. OMA-Logo + "Battle
// Cards"-Schriftzug sitzen als eigene, undurchsichtige Banner-Leiste ganz
// unten — echte HTML-Ebene statt ins Bild gebackener Text, bleibt scharf
// und deckt zuverlässig jeden Bildinhalt darunter ab. Wird sowohl im Shop
// (BuyPack.tsx) als auch beim Pack-Öffnen (PackOpener.tsx) verwendet.

export type PackVisualKind = "STANDARD" | "PREMIUM" | "COMMUNITY";

export const PACK_TEXTURE: Record<PackVisualKind, string> = {
  STANDARD: "/battle-cards/packs/standard-texture.png",
  PREMIUM: "/battle-cards/packs/premium-texture.png",
  COMMUNITY: "/battle-cards/packs/community-texture.png",
};

const PACK_ART: Record<PackVisualKind, string> = {
  STANDARD: "/battle-cards/packs/standard-art.png",
  PREMIUM: "/battle-cards/packs/premium-art.png",
  COMMUNITY: "/battle-cards/packs/community-art.png",
};

export const PACK_COVER_LABEL: Record<PackVisualKind, string> = {
  STANDARD: "Standard",
  PREMIUM: "Premium",
  COMMUNITY: "Community",
};

// Marken-Akzent je Sorte — Teal/Maroon aus dem OMA-Logo für Standard/Premium,
// Violett für Community. Färbt die Textur leicht ein und dient als Akzent
// für Badge/Trennlinie im Banner unten.
const PACK_ACCENT: Record<PackVisualKind, { tint: string; badge: string }> = {
  STANDARD: { tint: "rgba(15,118,110,0.35)", badge: "#2dd4bf" },
  PREMIUM: { tint: "rgba(127,29,29,0.35)", badge: "#f87171" },
  COMMUNITY: { tint: "rgba(88,28,135,0.35)", badge: "#c084fc" },
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

/** Volles Pack-Cover: Foil-Textur + Helden-Artwork (screen-geblendet) +
 *  Logo/Schriftzug-Banner. `cropped` schneidet die Crimp-Zacken zu
 *  (Öffnen-Animation), sonst abgerundetes Rechteck (Shop). */
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
  const accent = PACK_ACCENT[kind];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={cropped ? { clipPath: PACK_CLIP_PATH } : { borderRadius: 14 }}
    >
      <img src={PACK_TEXTURE[kind]} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: accent.tint }} />
      <img
        src={PACK_ART[kind]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ mixBlendMode: "screen" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.04) 56%, transparent 70%)",
        }}
      />

      {/* Undurchsichtige Banner-Leiste unten — deckt zuverlässig alles darüber ab,
          damit Logo/Schriftzug immer lesbar bleiben, egal was im Artwork darüber liegt. */}
      <div
        className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-1 pt-5 pb-2"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(4,4,7,0.75) 40%, rgba(4,4,7,0.97) 75%, #040407 100%)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <img src="/brand/logo-64.png" alt="" className="w-5 h-5" />
          <p className="text-[11px] font-black uppercase tracking-wider text-white leading-none">Battle Cards</p>
        </div>
        {showLabel && (
          <span
            className="text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
            style={{ color: "#040407", background: accent.badge }}
          >
            {PACK_COVER_LABEL[kind]}
          </span>
        )}
      </div>
    </div>
  );
}
