import Link from "next/link";
import GameCover from "@/components/GameCover";
import { Users } from "@/components/icons";

type InGame = { id: string; slug: string; name: string; coverUrl: string | null };

const SHOWN = 12;

/**
 * GameSwipe "Am Start" auf dem Profil: alle Spiele, die jemand hat und spielen würde (öffentlich).
 * "Würde ich holen" und "Nicht meins" bleiben privat. Auf fremden Profilen stehen gemeinsame Spiele
 * vorn und sind markiert.
 */
export default function InGamesSection({
  games, sharedIds = [], isOwn, displayName,
}: {
  games: InGame[];
  sharedIds?: string[];
  isOwn: boolean;
  displayName: string;
}) {
  const shared = new Set(sharedIds);
  const sorted = [...games].sort((a, b) => Number(shared.has(b.id)) - Number(shared.has(a.id)));
  const shown = sorted.slice(0, SHOWN);

  if (games.length === 0 && !isOwn) return null;

  return (
    <section aria-label="Am Start">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          Am Start
          <span className="normal-case tracking-normal font-normal text-gray-600">· {games.length} {games.length === 1 ? "Spiel" : "Spiele"}</span>
        </h2>
        <Link href={isOwn ? "/spiele" : "/spiele/gruppe"} className="text-[11px] text-teal-500 hover:text-teal-300">
          {isOwn ? "GameSwipe" : "Gemeinsam finden"} →
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-5 text-center">
          <p className="text-sm text-gray-400">Sag in GameSwipe, welche Spiele du hast und spielen würdest.</p>
          <Link href="/spiele" className="mt-1 inline-block text-xs text-teal-400 hover:text-teal-300">Zu GameSwipe →</Link>
        </div>
      ) : (
        <div className="glass rounded-2xl p-3 space-y-2.5">
          {!isOwn && shared.size > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-teal-300">
              <Users className="w-3.5 h-3.5" /> Ihr seid beide bei {shared.size} {shared.size === 1 ? "Spiel" : "Spielen"} am Start
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {shown.map(g => (
              <Link key={g.id} href={`/spiele/${g.slug}`} title={g.name}
                className={`relative block rounded-lg overflow-hidden border group ${shared.has(g.id) ? "border-teal-400/50" : "border-white/[0.06] hover:border-white/[0.2]"}`}>
                <GameCover game={g.name} coverUrl={g.coverUrl} className="w-full aspect-[16/9]" rounded="rounded-none"
                  imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" fallbackVariant="plain" />
                <span className="absolute inset-x-0 bottom-0 px-1.5 pb-1 pt-4 text-[10px] font-medium text-white truncate"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
                  {g.name}
                </span>
                {shared.has(g.id) && (
                  <span className="absolute top-1 right-1 rounded bg-teal-500 px-1 text-[9px] font-bold text-teal-950">ihr beide</span>
                )}
              </Link>
            ))}
          </div>
          {games.length > SHOWN && (
            <p className="text-[11px] text-gray-500">
              und {games.length - SHOWN} weitere{isOwn ? "" : ` bei ${displayName}`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
