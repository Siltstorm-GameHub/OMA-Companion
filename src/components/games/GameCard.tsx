import Link from "next/link";
import GameCover from "@/components/GameCover";
import { StarDisplay } from "./StarRating";
import { Check, Heart, Users } from "@/components/icons";
import type { GameListItem } from "@/lib/games/filter";
import { GAME_MODES, formatPlayers, subscriptionBadges } from "@/lib/games/options";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";

export default function GameCard({ game }: { game: GameListItem }) {
  const avg = averageRating(game.ratingSum, game.ratingCount);
  const players = formatPlayers(game.minPlayers, game.maxPlayers);
  const facts = [
    game.modes.map(m => GAME_MODES[m]).join(" · ") || null,
    players,
  ].filter(Boolean);

  return (
    <Link
      href={`/spiele/${game.slug}`}
      className="group surface rounded-2xl overflow-hidden flex flex-col hover:ring-1 hover:ring-teal-500/30 transition-all active:scale-[0.99]"
    >
      <div className="relative">
        <GameCover
          game={game.name}
          coverUrl={game.coverUrl}
          className="w-full aspect-[46/21]"
          rounded="rounded-none"
          fallbackVariant="plain"
          imgClassName="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {/* Store: kostenlos / Rabatt / Abo */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
          {game.isFree && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white">Kostenlos</span>
          )}
          {game.discountPercent > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400 text-gray-950" title="Gerade im Angebot auf Steam">
              −{game.discountPercent} %
            </span>
          )}
          {subscriptionBadges(game.subscriptions).map(b => (
            <span key={b} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-950/80 text-lime-300 border border-lime-400/30">{b}</span>
          ))}
        </div>
        {/* Eigene Markierung */}
        {(game.myStatus === "in" || game.myStatus === "wish") && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {game.myStatus === "in" ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Am Start
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/90 text-white flex items-center gap-1">
                <Heart className="w-2.5 h-2.5" /> Würde ich holen
              </span>
            )}
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <p className="font-semibold text-sm text-white leading-tight line-clamp-2 group-hover:text-teal-200 transition-colors">{game.name}</p>
        {facts.length > 0 && <p className="text-[11px] text-gray-500 truncate">{facts.join(" · ")}</p>}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2 text-[11px]">
          {avg !== null && game.ratingCount >= MIN_RATINGS_FOR_AVERAGE ? (
            <span className="flex items-center gap-1.5 text-gray-300">
              <StarDisplay value={avg} className="w-3 h-3" />
              {formatRating(avg)} <span className="text-gray-600">({game.ratingCount})</span>
            </span>
          ) : (
            <span className="text-gray-600">{game.ratingCount > 0 ? `${game.ratingCount} Bewertung${game.ratingCount === 1 ? "" : "en"}` : "Noch nicht bewertet"}</span>
          )}
          {game.playingCount > 0 && (
            <span className="flex items-center gap-1 text-teal-300/90 shrink-0" title="Mitglieder, die das gerade zocken">
              <Users className="w-3 h-3" /> {game.playingCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
