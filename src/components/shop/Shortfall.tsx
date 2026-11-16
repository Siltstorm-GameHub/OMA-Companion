import CoinIcon from "@/components/CoinIcon";

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Shop-Karte: statt eines ausgegrauten Kauf-Buttons, wie viel noch fehlt — mit Fortschritt bis zum Preis. */
export default function Shortfall({ price, balance, basePrice }: { price: number; balance: number; basePrice?: number | null }) {
  const pct = price > 0 ? Math.min(100, Math.round((Math.max(0, balance) / price) * 100)) : 0;
  return (
    <div className="space-y-1" title={`Noch ${fmt(price - balance)} Münzen bis zum Kauf`}>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${pct}%` }} />
      </div>
      <p className="flex items-center justify-between gap-1 text-[11px]">
        <span className="text-gray-400">noch <span className="font-semibold text-amber-200 tabular-nums">{fmt(price - balance)}</span></span>
        <span className="inline-flex items-center gap-0.5 text-gray-500 tabular-nums">
          <CoinIcon size={11} /> {fmt(price)}
          {basePrice != null && basePrice > price && <span className="line-through opacity-60">{fmt(basePrice)}</span>}
        </span>
      </p>
    </div>
  );
}
