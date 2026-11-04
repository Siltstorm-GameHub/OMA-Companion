import type { ReactNode } from "react";
import Link from "next/link";
import GiftIcon from "@/components/GiftIcon";
import RankedAvatar from "@/components/RankedAvatar";
import CoinIcon from "@/components/CoinIcon";
import PokalSection from "@/components/PokalSection";
import WanderpocalSection from "@/components/WanderpocalSection";
import Trophy3DViewer from "@/components/Trophy3DViewer";
import ProfileTopContributions from "@/components/ProfileTopContributions";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import NotificationPreferences from "@/components/NotificationPreferences";
import AccountDataSection from "@/components/AccountDataSection";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import { ChevronRight, Clock, MessageSquare, Trophy } from "@/components/icons";
import { POINT_RULES } from "@/lib/points";
import type { ProfileData } from "@/lib/profile-data";
import PointsInfoModal from "./PointsInfoModal";
import ProfileEditor from "./ProfileEditor";
import ProfileCompletion from "./ProfileCompletion";
import ProfileStatTiles from "./ProfileStatTiles";
import SquadsSection from "./SquadsSection";
import FavoriteGamesSection from "./FavoriteGamesSection";
import ProfileQuestsAndTournaments from "./ProfileQuestsAndTournaments";
import ProfileRecentEvents from "./ProfileRecentEvents";
import CommunityJobsPanel from "./CommunityJobsPanel";
import ProfileTabs, { type ProfileTabKey } from "./ProfileTabs";
import ReputationCard from "./ReputationCard";

const H2 = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3";

/** Leerer Abschnitt auf dem EIGENEN Profil: Einladung statt Lücke. Auf fremden Profilen werden leere Abschnitte ausgeblendet. */
function EmptyInvite({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="glass card-shine rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center">
      <Trophy className="w-6 h-6 text-gray-600" />
      <p className="text-xs text-gray-400">{text}</p>
      <Link href={href} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">{cta} →</Link>
    </div>
  );
}

/**
 * EIN responsives Profil-Layout für das eigene Profil und fremde Profile (Desktop und Handy).
 * Das eigene Profil hat zusätzlich Bearbeiten, Profil-Vervollständigung, Jahresrückblick und die
 * Reiter Community-Jobs + Einstellungen; fremde Profile bekommen stattdessen Aktionen (`actions`).
 */
export default function ProfileView({ data, isOwn, viewerId, initialTab = "overview", topBar, actions }: {
  data: ProfileData; isOwn: boolean; viewerId?: string;
  initialTab?: ProfileTabKey;
  /** Navigationszeile über dem Hero (fremde Profile: "Zurück"). */
  topBar?: ReactNode;
  /** Aktionen unter dem Hero (fremde Profile). */
  actions?: ReactNode;
}) {
  const { user, displayName } = data;
  const accent = isOwn ? "teal" : "rose";

  const hero = (
    <div className="glass card-shine relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent === "teal" ? "from-teal-500/10 via-transparent to-teal-900/10" : "from-rose-500/10 via-transparent to-purple-500/8"} pointer-events-none`} />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${accent === "teal" ? "via-teal-500/40" : "via-rose-500/25"} to-transparent pointer-events-none`} />

      <div className="relative flex items-start gap-4 sm:gap-5">
        <div className="relative shrink-0">
          <RankedAvatar userId={user.id} src={user.image} alt={displayName} size={80} rounded="2xl" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{displayName}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Mitglied seit {data.memberSince}</p>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5">
            <span className={`text-sm font-bold ${accent === "teal" ? "text-teal-400" : "text-rose-400"}`}>{data.rankPoints.toLocaleString("de-DE")} Punkte</span>
            <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium tabular-nums">
              <CoinIcon size={12} /> {data.totalPoints.toLocaleString("de-DE")} Münzen
            </span>
            {/* Rang auf dem Handy inline (auf größeren Bildschirmen als eigener Block rechts). */}
            <span className="sm:hidden text-xs text-gray-400">Rang <span className="text-white font-semibold">#{data.leaderboardRank}</span> von {data.totalUsers}</span>
          </div>

          {isOwn ? (
            <div id="profile-editor" className="mt-2 max-w-md">
              <ProfileEditor birthday={data.editorBirthday} bio={user.bio ?? null} twitchLogin={user.twitchLogin ?? null} />
            </div>
          ) : user.bio ? (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-md">{user.bio}</p>
          ) : null}
        </div>

        <div className="glass-heavy rounded-2xl px-5 py-4 text-center shrink-0 hidden sm:block">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
          <p className="text-3xl font-black text-white tabular-nums leading-none">#{data.leaderboardRank}</p>
          <p className="text-[9px] text-gray-600 mt-1">von {data.totalUsers}</p>
          {isOwn && <PointsInfoModal />}
        </div>
      </div>
    </div>
  );

  const hasWanderpokale = data.wanderpokalItems.length > 0 || data.wanderpocalTrophies.length > 0 || data.wanderpocalStats.length > 0;

  const overview = (
    <div className="space-y-5">
      <ReputationCard level={data.reputation.level} points={data.reputation.points} isOwn={isOwn} />

      <SquadsSection squads={data.squads} />
      {(isOwn || data.favoriteGames.length > 0) && (
        <div id="favorite-games-section">
          <FavoriteGamesSection games={data.favoriteGames} readOnly={!isOwn} displayName={displayName} viewerId={viewerId} />
        </div>
      )}

      <PokalSection pokale={data.pokale} ownerName={displayName} />
      <ProfileTopContributions userId={user.id} isOwn={isOwn} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* WanderpocalSection bringt ihre eigene Überschrift mit. */}
          {hasWanderpokale ? (
            <div className="space-y-3">
              <WanderpocalSection trophies={data.wanderpocalTrophies} userStats={data.wanderpocalStats}
                rankMap={data.wanderpocalRankMap} holders={data.wanderpocalHolders} />
              {data.wanderpokalItems.length > 0 && <Trophy3DViewer items={data.wanderpokalItems} />}
            </div>
          ) : isOwn ? (
            <section>
              <h2 className={H2}>🏆 Wanderpokale</h2>
              <EmptyInvite text="Noch kein Wanderpokal — gewinne Events in einem Spiel, um ihn zu holen." href="/events" cta="Zu den Events" />
            </section>
          ) : null}

          {(data.eventPokalItems.length > 0 || isOwn) && (
            <section>
              <h2 className={H2}>🥇 Event-Pokale</h2>
              {data.eventPokalItems.length > 0
                ? <Trophy3DViewer items={data.eventPokalItems} />
                : <EmptyInvite text="Noch kein Event-Pokal — sichere dir einen Platz auf dem Treppchen." href="/events" cta="Zum nächsten Event" />}
            </section>
          )}

          <ProfileQuestsAndTournaments questsWithProgress={data.questsWithProgress}
            tournamentParticipations={data.tournamentParticipations} userId={user.id} />
        </div>

        <div className="space-y-5">
          <section>
            <h2 className={H2}>📊 Aktivität</h2>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",     value: `${data.voiceHours}h`,                       color: "text-teal-400"  },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",       value: String(data.messageCount),                   color: "text-blue-400"  },
                { icon: <CoinIcon size={14} />,                     label: "Münzen gesammelt",  value: data.coinsEarned.toLocaleString("de-DE"),     color: "text-amber-400" },
                { icon: <CoinIcon size={14} />,                     label: "Münzen ausgegeben", value: data.coinsSpent.toLocaleString("de-DE"),      color: "text-rose-400"  },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-4 py-3">
                  <div className={`flex items-center gap-2 text-xs ${s.color}`}>
                    {s.icon}
                    <span className="text-gray-400">{s.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </section>

          <ProfileRecentEvents eventRegs={data.eventRegs} userId={user.id} />
        </div>
      </div>
    </div>
  );

  const settings = isOwn ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <section id="notifications">
        <h2 className={H2}>🔔 Benachrichtigungen</h2>
        <div className="flex flex-col gap-3">
          <div className="glass card-shine rounded-2xl px-2 py-1">
            <PushSubscribeButton />
          </div>
          <NotificationPreferences />
        </div>
      </section>
      <div className="space-y-5">
        <section id="overlay">
          <h2 className={H2}>📺 Stream-Overlay</h2>
          <ProfileOverlayButton hasTwitch={!!user.twitchLogin} />
        </section>
        <AccountDataSection />
      </div>
    </div>
  ) : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {topBar}
      {hero}
      {actions}

      {isOwn && <ProfileCompletion done={data.profileCompletionDone} rewardPerItem={POINT_RULES.PROFILE_BIO.amount} />}

      <ProfileStatTiles rankPoints={data.rankPoints} eventCount={data.eventCount} eventWins={data.eventWins}
        pollMasterCount={data.pollMasterCount} pokaleCount={data.pokale.length} topGames={data.topGames} />

      {isOwn && data.reviewYears.length > 0 && (
        <Link href="/profile/rueckblick"
          className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-rose-500/8 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <GiftIcon size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Dein Jahresrückblick {data.reviewYears[0]}</p>
              <p className="text-xs text-gray-500">Punkte, Events, Siege und mehr — dein Jahr im Überblick</p>
            </div>
          </div>
          <ChevronRight className="relative w-4 h-4 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}

      <ProfileTabs initialTab={initialTab} panels={{
        overview,
        ...(isOwn ? { community_jobs: <CommunityJobsPanel />, settings } : {}),
      }} />
    </div>
  );
}
