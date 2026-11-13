import Link from "next/link";
import GameCover from "@/components/GameCover";
import { ChevronRight, Heart, Tag } from "@/components/icons";
import { listGamesOnSale } from "@/lib/games/service";
import { formatPrice } from "@/lib/games/options";

/** „Gerade im Angebot“: Spiele der Spieleliste, die bei Steam reduziert sind (Preise täglich abgeglichen).
 *  Eigene Wunschspiele („Würde ich zocken“) zuerst. Ohne Angebote wird nichts angezeigt. */
export default async function GameSalesStrip({ userId }: { userId: string }) {
  const { total, games } = await listGamesOnSale(userId, 8);
  if (games.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
          <Tag className="w-4 h-4 text-rose-300" /> Gerade im Angebot
        </h2>
        <Link href="/spiele?sort=sale" className="flex items-center gap-0.5 text-xs font-semibold text-teal-300 hover:text-teal-200 shrink-0">
          {total > games.length ? `Alle ${total}` : "Spieleliste"} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x">
        {games.map((g) => {
          const price = formatPrice(g.priceCents, g.priceCurrency);
          const before = formatPrice(g.priceInitialCents, g.priceCurrency);
          return (
            <Link
              key={g.slug}
              href={`/spiele/${g.slug}`}
              className={`group snap-start shrink-0 w-40 rounded-xl overflow-hidden border bg-white/[0.02] hover:bg-white/[0.05] transition-colors ${
                g.onMyList ? "border-rose-400/40" : "border-white/[0.08] hover:border-white/20"
              }`}
            >
              <div className="relative">
                <GameCover game={g.name} coverUrl={g.coverUrl} className="w-full aspect-[16/9]" rounded="rounded-none" fallbackVariant="plain" />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-black text-white tabular-nums">
                  −{g.discountPercent} %
                </span>
              </div>
              <div className="p-2 space-y-0.5">
                <p className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">{g.name}</p>
                {price && (
                  <p className="text-[11px] tabular-nums">
                    <span className="text-white font-semibold">{price}</span>
                    {before && <span className="ml-1.5 text-gray-500 line-through">{before}</span>}
                  </p>
                )}
                <p className={`flex items-center gap-1 text-[10px] ${g.onMyList ? "text-rose-300" : "text-gray-500"}`}>
                  <Heart className="w-2.5 h-2.5 shrink-0" />
                  {g.onMyList
                    ? "Auf deiner Liste"
                    : g.wantCount > 0
                      ? `${g.wantCount} ${g.wantCount === 1 ? "will" : "wollen"} es zocken`
                      : "Noch auf niemandes Liste"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
