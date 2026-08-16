import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getRoomConfig, roomVisibleFor } from "@/lib/room-config";
import { loadRoom, ownedItemCounts } from "@/lib/room";
import { getJobOverview } from "@/lib/job-service";
import { loadRoomProfileCore, loadRoomProfileDetails } from "@/lib/room-profile-data";
import WanderpocalSection from "@/components/WanderpocalSection";
import FavoriteGamesSection from "@/app/(dashboard)/profile/FavoriteGamesSection";
import NotificationPreferences from "@/components/NotificationPreferences";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import RoomHeroPanel from "./RoomHeroPanel";
import RoomStatTiles from "./RoomStatTiles";
import RoomLevelBar from "./RoomLevelBar";
import RoomView from "./RoomView";

export const metadata = { title: "Gaming-Zimmer" };

export default async function ZimmerPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  // Solange room_enabled aus ist, bleibt das Feature auf Admins beschränkt.
  const cfg = await getRoomConfig();
  if (!roomVisibleFor(cfg, me.role)) redirect("/profile");

  const [state, core, details, owned, job] = await Promise.all([
    loadRoom(me.id),
    loadRoomProfileCore(me.id),
    loadRoomProfileDetails(me.id),
    ownedItemCounts(me.id),
    getJobOverview(me.id),
  ]);
  if (!core) redirect("/login");

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      <RoomHeroPanel core={core} />
      <RoomStatTiles core={core} />
      <RoomLevelBar placed={state.placed} stored={state.stored} thresholds={[0, ...cfg.levelThresholds]} />

      <RoomView
        state={state}
        core={core}
        details={details}
        readOnly={false}
        owned={owned}
        job={job}
        levelThresholds={[0, ...cfg.levelThresholds]}
        trophySection={
          <WanderpocalSection
            trophies={details.trophies}
            userStats={details.trophyStats}
            rankMap={details.trophyRanks}
          />
        }
        settingsSection={
          <div className="flex flex-col gap-3">
            <div className="glass card-shine rounded-2xl px-2 py-1">
              <PushSubscribeButton />
            </div>
            <NotificationPreferences />
            <ProfileOverlayButton hasTwitch={!!core.twitchLogin} />
          </div>
        }
      />

      <FavoriteGamesSection games={core.favoriteGames} viewerId={me.id} />
    </div>
  );
}
