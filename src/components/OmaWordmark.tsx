// Wortmarke für eigene OMA-Produkte (OMA Blocks, …): "OMA" klein, gesperrt, in Teal —
// der Produktname fett in der Zweitfarbe des Produkts. Ein Muster für alle Produkte, damit sie
// sofort als Teil der Old Masters Allies erkennbar sind.

export const OMA_PRODUCTS = {
  blocks: { name: "Blocks", color: "#a78bfa" }, // Violett
} as const;

export type OmaProduct = keyof typeof OMA_PRODUCTS;

const SIZES = {
  sm: { name: "text-sm", oma: "text-[0.6rem]" },
  md: { name: "text-xl", oma: "text-[0.7rem]" },
  lg: { name: "text-3xl", oma: "text-sm" },
} as const;

export default function OmaWordmark({
  product,
  size = "md",
  suffix,
  className = "",
}: {
  product: OmaProduct;
  size?: keyof typeof SIZES;
  /** Zusatz hinter dem Namen in Weiß, z. B. "Versus" */
  suffix?: string;
  className?: string;
}) {
  const p = OMA_PRODUCTS[product];
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-baseline gap-[0.35em] font-display leading-none whitespace-nowrap ${className}`}>
      <span className={`${s.oma} font-semibold tracking-[0.2em] text-teal-300`}>OMA</span>
      <span className={`${s.name} font-black tracking-tight`} style={{ color: p.color }}>{p.name}</span>
      {suffix && <span className={`${s.name} font-black tracking-tight text-white`}>· {suffix}</span>}
    </span>
  );
}
