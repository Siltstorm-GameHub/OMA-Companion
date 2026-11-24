// Marke für eigene OMA-Produkte (OMA Blocks, OMA GameSwipe): das runde OMA-Logo direkt vor dem Produktnamen
// in der Produktfarbe. "OMA" steht nicht mehr als Wort da — das Logo ist das "OMA" (Screenreader lesen
// trotzdem "OMA Blocks"). Ein Muster für Überschriften, Seitenleiste, Reiter und Karten.

export const OMA_PRODUCTS = {
  blocks: { name: "Blocks", color: "#a78bfa", tagline: "Das Community-Spiel der Old Masters Allies" }, // Violett
  gameSwipe: { name: "GameSwipe", color: "#fb7185", tagline: "Spiele entdecken, bewerten und Mitspieler finden" }, // Rosé
} as const;

export type OmaProduct = keyof typeof OMA_PRODUCTS;

const SIZES = {
  xs: { logo: "size-4", name: "text-sm font-semibold", gap: "gap-1.5" }, // Seitenleiste, Reiter
  sm: { logo: "size-5", name: "text-sm font-extrabold", gap: "gap-1.5" },
  md: { logo: "size-7", name: "text-xl font-extrabold", gap: "gap-2" },
  lg: { logo: "size-10", name: "text-2xl sm:text-3xl font-extrabold", gap: "gap-2.5" }, // Seitenkopf
} as const;

/** Nur das runde Logo (für Stellen, an denen der Name schon daneben steht). */
export function OmaLogo({ className = "size-5" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- kleines statisches Asset, next/image lohnt sich nicht
    <img src="/brand/logo-64.webp" alt="" aria-hidden className={`shrink-0 rounded-full bg-black ring-1 ring-line-strong ${className}`} />
  );
}

export default function OmaWordmark({
  product,
  size = "md",
  suffix,
  className = "",
  plainName = false,
}: {
  product: OmaProduct;
  size?: keyof typeof SIZES;
  /** Zusatz hinter dem Namen, z. B. "Versus" */
  suffix?: string;
  className?: string;
  /** Name in Textfarbe statt Produktfarbe (z. B. inaktiver Reiter) */
  plainName?: boolean;
}) {
  const p = OMA_PRODUCTS[product];
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center ${s.gap} font-display leading-none whitespace-nowrap ${className}`}>
      <OmaLogo className={s.logo} />
      <span className={`${s.name} tracking-tight`} style={plainName ? undefined : { color: p.color }}>
        <span className="sr-only">OMA </span>{p.name}
      </span>
      {suffix && <span className={`${s.name} tracking-tight text-fg`}>· {suffix}</span>}
    </span>
  );
}
