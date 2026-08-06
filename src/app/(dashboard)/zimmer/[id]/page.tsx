import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/roles";
import { getRoomConfig, roomVisibleFor } from "@/lib/room-config";
import { loadRoom } from "@/lib/room";
import { loadRoomProfileCore, loadRoomProfileDetails } from "@/lib/room-profile-data";
import { getMinigamesConfig } from "@/lib/minigames-config";
import WanderpocalSection from "@/components/WanderpocalSection";
import FavoriteGamesSection from "@/app/(dashboard)/profile/FavoriteGamesSection";
import DuelChallengeWidget from "@/components/DuelChallengeWidget";
import RoomHeroPanel from "../RoomHeroPanel";
import RoomStatTiles from "../RoomStatTiles";
import RoomView from "../RoomView";

/** Fremdes Gaming-Zimmer — nur ansehen, nichts verändern. */
export default async function FremdesZimmerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (id === me.id) redirect("/zimmer");

  const cfg = await getRoomConfig();
  // Auf das FREMDE Profil umleiten, nicht auf das eigene — sonst landet ein
  // geteilter Zimmer-Link bei einem User ohne Freischaltung am falschen Ziel.
  if (!roomVisibleFor(cfg, me.role)) redirect(`/profile/${id}`);

  const [state, core, details, minigamesConfig] = await Promise.all([
    loadRoom(id),
    loadRoomProfileCore(id),
    loadRoomProfileDetails(id),
    getMinigamesConfig(),
  ]);
  if (!core) notFound();

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/leaderboard"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-400 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Zurück zur Rangliste
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href={`/profile/compare/${id}`}
            className="inline-flex items-center gap-2 text-xs glass border border-white/[0.08] hover:border-rose-500/30 text-gray-400 hover:text-white px-3 py-2 rounded-xl transition-all">
            ⚔️ Mit mir vergleichen
          </Link>
          {minigamesConfig.duelEnabled && (
            <DuelChallengeWidget
              opponentId={id}
              opponentName={core.displayName}
              config={{ min: minigamesConfig.duelMinWager, max: minigamesConfig.duelMaxWager }}
            />
          )}
        </div>
      </div>

      <RoomHeroPanel core={core} />
      <RoomStatTiles core={core} />

      <RoomView
        state={state}
        core={core}
        details={details}
        readOnly
        trophySection={
          <WanderpocalSection
            trophies={details.trophies}
            userStats={details.trophyStats}
            rankMap={details.trophyRanks}
          />
        }
      />

      <FavoriteGamesSection games={core.favoriteGames} readOnly displayName={core.displayName} viewerId={me.id} />
    </div>
  );
}
