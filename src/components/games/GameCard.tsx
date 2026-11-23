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
      className="group rounded-card border border-line bg-surface overflow-hidden flex flex-col hover:border-line-strong hover:bg-surface-2 transition-colors"
    >
      <div className="relative">
        <GameCover
          game={game.name}
          coverUrl={game.coverUrl}
          className="w-full aspect-[46/21]"
          rounded="rounded-none"
          fallbackVariant="plain"
          imgClassName="w-full h-full object-cover"
        />
        {/* Store: kostenlos / Rabatt / Abo */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
          {game.isFree && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white">Kostenlos</span>
          )}
          {game.discountPercent > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-gray-950" title="Gerade im Angebot auf Steam">
              −{game.discountPercent} %
            </span>
          )}
          {subscriptionBadges(game.subscriptions).map(b => (
            <span key={b} className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-950/80 text-lime-300 border border-lime-400/30">{b}</span>
          ))}
        </div>
        {/* Eigene Markierung */}
        {(game.myStatus === "in" || game.myStatus === "wish") && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {game.myStatus === "in" ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Am Start
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/90 text-white flex items-center gap-1">
                <Heart className="w-2.5 h-2.5" /> Würde ich holen
              </span>
            )}
          </div>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
        <p className="font-bold text-[15px] text-fg leading-tight line-clamp-2 group-hover:text-primary-fg transition-colors">{game.name}</p>
        {facts.length > 0 && <p className="text-xs text-gray-500 truncate">{facts.join(" · ")}</p>}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2 text-xs">
          {avg !== null && game.ratingCount >= MIN_RATINGS_FOR_AVERAGE ? (
            <span className="flex items-center gap-1.5 text-gray-300">
              <StarDisplay value={avg} className="w-3 h-3" />
              {formatRating(avg)} <span className="text-gray-600">({game.ratingCount})</span>
            </span>
          ) : (
            <span className="text-gray-600">{game.ratingCount > 0 ? `${game.ratingCount} Bewertung${game.ratingCount === 1 ? "" : "en"}` : "Noch nicht bewertet"}</span>
          )}
          {game.playingCount > 0 && (
            <span className="flex items-center gap-1 text-primary-fg/90 shrink-0" title="Mitglieder, die das gerade zocken">
              <Users className="w-3 h-3" /> {game.playingCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
