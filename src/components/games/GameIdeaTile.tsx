import Link from "next/link";
import GameCover from "@/components/GameCover";
import { StarDisplay } from "./StarRating";
import { ChevronRight, Dices, Heart } from "@/components/icons";
import { pickGameIdea } from "@/lib/games/service";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";

/** Dashboard-Kachel "Spiel-Idee gefällig?": ein zufälliges beliebtes Spiel aus der Spieleliste. */
export default async function GameIdeaTile() {
  const game = await pickGameIdea();

  if (!game) {
    return (
      <Link href="/spiele" className="flex items-center gap-3 px-3.5 py-3 hover:bg-white/[0.035] transition-colors group">
        <Dices className="w-5 h-5 text-teal-500/70 shrink-0" />
        <span className="flex-1 text-xs text-gray-400 group-hover:text-white transition-colors">
          Noch keine Spiele eingetragen — trag das erste ein!
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
      </Link>
    );
  }

  const avg = averageRating(game.ratingSum, game.ratingCount);
  return (
    <Link href={`/spiele/${game.slug}`} className="flex items-center gap-3 p-3 hover:bg-white/[0.035] transition-colors group">
      <GameCover game={game.name} coverUrl={game.coverUrl} className="w-24 h-11" rounded="rounded-md" fallbackVariant="plain" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">{game.name}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
          {avg !== null && game.ratingCount >= MIN_RATINGS_FOR_AVERAGE ? (
            <><StarDisplay value={avg} className="w-2.5 h-2.5" /> {formatRating(avg)}</>
          ) : game.wantCount > 0 ? (
            <><Heart className="w-2.5 h-2.5 text-rose-400" /> {game.wantCount}× würde ich zocken</>
          ) : "Neu in der Spieleliste"}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
    </Link>
  );
}
