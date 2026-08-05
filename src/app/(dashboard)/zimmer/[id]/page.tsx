import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/roles";
import { getRoomConfig, roomVisibleFor } from "@/lib/room-config";
import { loadRoom } from "@/lib/room";
import { loadRoomProfileCore, loadRoomProfileDetails } from "@/lib/room-profile-data";
import WanderpocalSection from "@/components/WanderpocalSection";
import FavoriteGamesSection from "@/app/(dashboard)/profile/FavoriteGamesSection";
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
  if (!roomVisibleFor(cfg, me.role)) redirect("/profile");

  const [state, core, details] = await Promise.all([
    loadRoom(id),
    loadRoomProfileCore(id),
    loadRoomProfileDetails(id),
  ]);
  if (!core) notFound();

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <Link href="/leaderboard"
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-400 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Zurück zur Rangliste
      </Link>

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
