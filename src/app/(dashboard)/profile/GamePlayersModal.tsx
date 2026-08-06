"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import RankedAvatar from "@/components/RankedAvatar";
import RankIcon from "@/components/RankIcon";
import GameCover from "@/components/GameCover";
import { getRank, getRankFullLabel } from "@/lib/ranks";
import { steamCoverUrl, type FavoriteGame } from "@/lib/favorite-games";
import type { GamePlayer } from "@/app/api/users/by-game/route";

interface Props {
  /** Angeklicktes Spiel — null = Modal geschlossen */
  game: FavoriteGame | null;
  onClose: () => void;
  /** Eigene User-ID, um "Du" zu markieren und richtig zu verlinken */
  viewerId?: string;
}

/** Ergebnis wird zusammen mit dem Spiel-Key gehalten — so gilt es nie versehentlich für ein anderes Spiel */
type LoadState =
  | { key: string; players: GamePlayer[] }
  | { key: string; error: true };

export default function GamePlayersModal({ game, onClose, viewerId }: Props) {
  const gameKey = game ? `${game.appId ?? ""}|${game.name.toLowerCase()}` : null;
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  // Nur Daten des gerade geöffneten Spiels zählen; alles andere heißt "lädt noch"
  const current = loaded && loaded.key === gameKey ? loaded : null;

  useEffect(() => {
    if (!game || !gameKey) return;

    const params = new URLSearchParams({ name: game.name });
    if (game.appId) params.set("appId", String(game.appId));

    let cancelled = false;
    fetch(`/api/users/by-game?${params}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: GamePlayer[]) => { if (!cancelled) setLoaded({ key: gameKey, players: data }); })
      .catch(() => { if (!cancelled) setLoaded({ key: gameKey, error: true }); });

    return () => { cancelled = true; };
  }, [game, gameKey]);

  const players = current && "players" in current ? current.players : null;

  return (
    <Modal open={!!game} onClose={onClose} title={game?.name ?? ""} size="sm">
      {game && (
        <div className="space-y-4">
          <GameCover
            game={game.name}
            coverUrl={game.appId ? steamCoverUrl(game.appId) : null}
            className="w-full aspect-[16/9]"
            rounded="rounded-xl"
          />

          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            Zocken das gerade
            {players && <span className="text-gray-600 normal-case tracking-normal">({players.length})</span>}
          </div>

          {current && "error" in current ? (
            <p className="text-sm text-gray-500 text-center py-6">Konnte nicht geladen werden.</p>
          ) : !players ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Lade Mitspieler …
            </div>
          ) : players.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Aktuell hat niemand <span className="text-gray-300">{game.name}</span> in seinen Lieblingsspielen.
            </p>
          ) : (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] divide-y divide-white/[0.04] overflow-hidden">
              {players.map(p => {
                const isSelf = p.id === viewerId;
                const rank   = getRank(p.rankPoints);
                return (
                  <Link
                    key={p.id}
                    href={isSelf ? "/profile" : `/profile/${p.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors group"
                  >
                    <RankedAvatar
                      rankPoints={p.rankPoints}
                      src={p.image}
                      alt={p.name}
                      size={32}
                      rounded="lg"
                      className="w-8 h-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">
                        {p.name}
                        {isSelf && <span className="ml-1.5 text-[10px] text-teal-500">(du)</span>}
                      </p>
                      <p className={`text-[10px] ${rank.color} flex items-center gap-1`}>
                        <RankIcon rankPoints={p.rankPoints} size="xs" showPips={false} /> {getRankFullLabel(rank)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">
                      {p.rankPoints.toLocaleString("de-DE")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
