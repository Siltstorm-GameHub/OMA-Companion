import Link from "next/link";
import GameCover from "@/components/GameCover";
import { ChevronRight, Gamepad2 } from "@/components/icons";
import { getGameListTeaser } from "@/lib/games/service";

/** Banner auf der Games-Seite (/games): führt zur Spieleliste, mit Covern der beliebtesten Spiele. */
export default async function GameListBanner() {
  const { total, top } = await getGameListTeaser(4);

  return (
    <Link
      href="/spiele"
      className="group relative flex items-center gap-3 sm:gap-4 rounded-2xl p-3 sm:p-4 overflow-hidden border border-teal-500/25 hover:border-teal-400/50 transition-colors"
      style={{ background: "linear-gradient(110deg, rgba(20,184,166,0.14), rgba(20,184,166,0.03) 60%)" }}
    >
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}>
        <Gamepad2 className="w-5 h-5 text-teal-300" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-display text-base font-bold text-white">Spieleliste</span>
        <span className="block text-xs text-gray-400 truncate">
          Was zocken wir heute?{total > 0 ? ` ${total} Spiele, bewertet von der Community` : " Jetzt die ersten Spiele eintragen"}
        </span>
      </span>
      {top.length > 0 && (
        <span className="hidden sm:flex -space-x-3 shrink-0" aria-hidden>
          {top.map(g => (
            <GameCover key={g.slug} game={g.name} coverUrl={g.coverUrl} className="w-16 h-9 ring-2 ring-gray-950" rounded="rounded-md" fallbackVariant="plain" />
          ))}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-teal-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
