import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getRank, getNextRank, getRankFullLabel } from "@/lib/ranks";
import RankedAvatar from "@/components/RankedAvatar";
import RankUpFlare from "@/components/RankUpFlare";
import RankIcon from "@/components/RankIcon";
import { computeBadges } from "@/lib/badges";
import BadgesSection from "./BadgesSection";
import PointsInfoModal from "./PointsInfoModal";
import WanderpocalSection from "@/components/WanderpocalSection";
import PokalSection from "@/components/PokalSection";
import { getAvailableReviewYears } from "@/lib/year-review";
import { Crown, Gift, ChevronRight, Clock, MessageSquare } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import Link from "next/link";
import FavoriteGamesSection from "./FavoriteGamesSection";
import SquadsSection from "./SquadsSection";
import ProfileEditor from "./ProfileEditor";
import ProfileCompletion from "./ProfileCompletion";
import ProfileStatTiles from "./ProfileStatTiles";
import ProfileRecentEvents from "./ProfileRecentEvents";
import ProfileQuestsAndTournaments from "./ProfileQuestsAndTournaments";
import ProfileMobileView from "./ProfileMobileView";
import { POINT_RULES } from "@/lib/points";
import { parseFavoriteGames } from "@/lib/favorite-games";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import NotificationPreferences from "@/components/NotificationPreferences";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import { getMancaveConfig, mancaveVisibleFor } from "@/lib/mancave-config";
import { loadMancaveData } from "@/lib/mancave-data-loader";
import { MonitorSmartphone } from "lucide-react";

export default async function ProfilePage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const userId = me.id;

  // Mancave hat keinen eigenen Nav-Eintrag mehr (User-Wunsch) — Zugang jetzt
  // nur noch über diesen Button, weiterhin hinter demselben Feature-Flag wie
  // vorher (solange mancave_enabled aus ist, sehen nur Admins ihn). Der Button
  // existiert seit dem Mobile-Umbau (Teil B) nur noch im Desktop-Zweig — auf
  // Mobile zeigt /profile jetzt selbst den Job-Reiter (siehe ProfileMobileView).
  const showMancave = mancaveVisibleFor(await getMancaveConfig(), me.role);

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [[user, eventRegs, eventCount, startedEvents, tournamentParticipations, tournamentCount, questsWithProgress, pokale, leaderboardRank, userSystemBadges, userCustomBadges, wanderpocalTrophies, wanderpocalStats, coinsEarnedAgg, coinsSpentAgg, lulPollWins, squadMemberships], mancaveData] =
    await Promise.all([
      Promise.all([
        prisma.user.findUnique({
          where:  { id: userId },
          select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true, createdAt: true, showcaseBadgesJson: true, favoriteGamesJson: true, birthday: true, bio: true, twitchLogin: true, bannerUrl: true, voiceMinutesTotal: true, messagesTotal: true },
        }),
        prisma.eventRegistration.findMany({
          where:   { userId },
          include: { event: { select: { id: true, title: true, startAt: true, game: true, finalRankingJson: true } } },
          orderBy: { joinedAt: "desc" }, take: 5,
        }),
        prisma.eventRegistration.count({ where: { userId } }),
        prisma.event.findMany({
          where: { startAt: { lte: now }, registrations: { some: { userId } } },
          select: { game: true, finalRankingJson: true, completionData: true },
        }),
        prisma.tournamentParticipant.findMany({
          where:   { userId },
          include: {
            event: {
              include: {
                matches: { where: { OR: [{ player1Id: userId }, { player2Id: userId }] } },
              },
            },
          },
          orderBy: { id: "desc" }, take: 10,
        }),
        prisma.tournamentParticipant.count({ where: { userId } }),
        prisma.quest.findMany({
          where:   { month, year },
          include: { progress: { where: { userId } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.pokal.findMany({
          where:   { userId },
          orderBy: { awardedAt: "desc" },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { rankPoints: true } }).then(async (u) => {
          const higher = await prisma.user.count({ where: { rankPoints: { gt: u?.rankPoints ?? 0 } } });
          return higher + 1;
        }),
        prisma.userSystemBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
        prisma.userCustomBadge.findMany({
          where: { userId },
          include: { badge: { select: { id: true, icon: true, name: true, desc: true, category: true } } },
          orderBy: { earnedAt: "asc" },
        }),
        prisma.wanderpocalHolder.findMany({ where: { userId } }),
        prisma.wanderpocalStat.findMany({ where: { userId } }),
        prisma.pointTransaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
        prisma.pointTransaction.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
        prisma.lulEntry.count({ where: { userId, communityChamp: true } }),
        prisma.squadMembership.findMany({
          where: { userId },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          select: { role: true, squad: { select: { id: true, name: true, icon: true } } },
        }),
      ]),
      // Für den mobilen Job-Reiter + die 3D-Pokal-Viewer (siehe Teil B des
      // Mancave-Umbau-Plans, ProfileMobileView.tsx) — dieselbe Aggregation,
      // die auch mancave/page.tsx nutzt.
      loadMancaveData(userId),
    ]);

  const squads = squadMemberships.map(m => ({ ...m.squad, role: m.role }));

  if (!user) redirect("/login");

  // Derived event stats from finished events
  const eventWins = startedEvents.filter(e => {
    try { const r = JSON.parse(e.finalRankingJson ?? "[]"); return Array.isArray(r) && r[0] === userId; }
    catch { return false; }
  }).length;
  const pollWinsFromEvents = startedEvents.filter(e => {
    try { const ids: string[] = (e.completionData ? JSON.parse(e.completionData) : {}).pollWinnerIds ?? []; return ids.includes(userId); }
    catch { return false; }
  }).length;
  const pollMasterCount = pollWinsFromEvents + lulPollWins;
  const gameCounts = startedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);

  const totalPoints = user.points;
  const rankPoints  = user.rankPoints;
  const currentRank = getRank(rankPoints);
  const nextRank    = getNextRank(rankPoints);
  const rankPct     = nextRank
    ? Math.min(100, Math.round(((rankPoints - currentRank.min) / (nextRank.min - currentRank.min)) * 100))
    : 100;

  const voiceHours   = Math.floor((user?.voiceMinutesTotal ?? 0) / 60);
  const messageCount = user?.messagesTotal ?? 0;
  const coinsEarned  = coinsEarnedAgg._sum.amount ?? 0;
  const coinsSpent   = Math.abs(coinsSpentAgg._sum.amount ?? 0);
  const earnedSystemKeys = new Set(userSystemBadges.map(b => b.badgeKey));
  const badges       = computeBadges({ points: totalPoints, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins: 0, eventWins, mvpCount: pollMasterCount }, earnedSystemKeys);
  const earnedBadges = badges.filter(b => b.earned);
  const memberSince  = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const displayName  = user.username ?? user.name ?? "Unbekannt";

  const totalUsers = await prisma.user.count();
  const reviewYears = getAvailableReviewYears(user.createdAt);

  // Wanderpokal: Rang je Scope berechnen
  const wanderpocalRankMap: Record<string, number> = {};
  await Promise.all(
    wanderpocalStats.map(async (stat) => {
      const above = await prisma.wanderpocalStat.count({
        where: {
          scopeType:  stat.scopeType,
          scopeValue: stat.scopeValue,
          winCount:   { gt: stat.winCount },
        },
      });
      wanderpocalRankMap[`${stat.scopeType}:${stat.scopeValue}`] = above + 1;
    })
  );

  const showcaseBadgeKeys: string[] = (() => {
    try { return JSON.parse(user.showcaseBadgesJson ?? "[]"); } catch { return []; }
  })();

  const favoriteGames = parseFavoriteGames(user.favoriteGamesJson);

  const mappedCustomBadges = userCustomBadges.map(uc => ({
    id:       uc.badge.id,
    icon:     uc.badge.icon,
    name:     uc.badge.name,
    desc:     uc.badge.desc,
    category: uc.badge.category,
    earnedAt: uc.earnedAt.toISOString(),
  }));

  const profileCompletionDone = {
    bio:           !!user.bio,
    birthday:      !!user.birthday,
    banner:        !!user.bannerUrl,
    twitch:        !!user.twitchLogin,
    favoriteGames: favoriteGames.length > 0,
  };

  const editorBirthday = user.birthday
    ? `${String(user.birthday.getDate()).padStart(2, "0")}-${String(user.birthday.getMonth() + 1).padStart(2, "0")}`
    : null;

  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ══════════════════════════════════════════════════════════════
          Desktop — unverändertes Markup (siehe Teil B des Umbau-Plans:
          reines Refactoring auf die extrahierten Komponenten, keine
          visuelle Änderung).
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block space-y-5">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
          {/* Eigenes Banner — liegt unter den Gradient-Overlays, damit der
              bestehende Look erhalten bleibt und der Text lesbar bleibt. */}
          {user.bannerUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-/Fremd-Host, next/image bräuchte je Host ein remotePattern */}
              <img
                src={user.bannerUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              {/* Scrim: ohne den verschwindet heller Text auf hellen Bannern */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40 pointer-events-none" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-teal-900/10 pointer-events-none" />
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-5 flex-wrap">
            {/* Avatar */}
            <div className="relative shrink-0">
              <RankUpFlare userId={user.id} rankPoints={rankPoints}>
                <RankedAvatar
                  rankPoints={rankPoints}
                  src={user.image}
                  alt={displayName}
                  size={80}
                  rounded="2xl"
                />
              </RankUpFlare>
              <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d0d0f]"
                style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${currentRank.color} ${currentRank.bg} ${currentRank.border}`}>
                  <RankIcon rankPoints={rankPoints} size="xs" showPips={false} /> {getRankFullLabel(currentRank)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1">
                Mitglied seit {memberSince} · {earnedBadges.length + userCustomBadges.length} Abzeichen
              </p>
              <div className="flex items-center gap-1 mb-2">
                <CoinIcon size={12} />
                <span className="text-xs text-amber-400 font-medium tabular-nums">{totalPoints.toLocaleString("de-DE")} Münzen</span>
              </div>
              <p className="text-sm font-bold text-teal-400">{rankPoints.toLocaleString("de-DE")} Punkte</p>

              {/* Rang-Fortschrittsbalken */}
              <div className="mt-3 max-w-xs">
                {nextRank ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[9px] text-gray-600 whitespace-nowrap">
                      <RankIcon rankPoints={rankPoints} size="xs" showPips={false} /> {getRankFullLabel(currentRank)}
                    </span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${rankPct}%`, background: "linear-gradient(90deg, #14b8a6, #2dd4bf)", boxShadow: "0 0 6px rgba(20,184,166,0.6)" }} />
                    </div>
                    <span className="flex items-center gap-1 text-[9px] text-gray-600 whitespace-nowrap">
                      <RankIcon rankPoints={nextRank.min} size="xs" showPips={false} /> {getRankFullLabel(nextRank)}
                    </span>
                    <span className="text-[9px] text-teal-400 tabular-nums">{rankPct}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                    <Crown className="w-3 h-3" /> Maximalen Rang erreicht
                  </div>
                )}
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-sm">{user.bio}</p>
              )}
            </div>

            {/* Rang-Block */}
            <div className="glass-heavy rounded-2xl px-5 py-4 text-center shrink-0 self-start hidden sm:block">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rang</p>
              <p className="text-3xl font-black text-white tabular-nums leading-none">#{leaderboardRank}</p>
              <p className="text-[9px] text-gray-600 mt-1">von {totalUsers}</p>
              <PointsInfoModal />
            </div>
          </div>

          {/* Mancave: hat keinen eigenen Nav-Eintrag mehr (User-Wunsch, weder
              Desktop-Pill noch Mobile-BottomNav) — einziger Zugang jetzt hier,
              nur noch auf Desktop (Mobile zeigt den Job-Reiter direkt hier). */}
          {showMancave && (
            <Link href="/mancave"
              className="relative mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-teal-300 border border-teal-500/25 bg-teal-500/10 hover:bg-teal-500/15 transition-colors">
              <MonitorSmartphone className="w-4 h-4" />
              Zur Mancave
            </Link>
          )}
        </div>

        {/* ── Profil vervollständigen ──────────────────────────────────── */}
        <ProfileCompletion done={profileCompletionDone} rewardPerItem={POINT_RULES.PROFILE_BIO.amount} />

        {/* ── Stat-Karten ─────────────────────────────────────────────── */}
        <ProfileStatTiles
          rankPoints={rankPoints}
          eventCount={eventCount}
          eventWins={eventWins}
          pollMasterCount={pollMasterCount}
          pokaleCount={pokale.length}
          topGames={topGames}
        />

        {/* ── Jahresrückblick-Banner ───────────────────────────────────── */}
        {reviewYears.length > 0 && (
          <Link href="/profile/rueckblick"
            className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-5 flex items-center justify-between gap-4 group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-rose-500/8 pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Dein Jahresrückblick {reviewYears[0]}</p>
                <p className="text-xs text-gray-500">Punkte, Events, Siege und mehr — dein Jahr im Überblick</p>
              </div>
            </div>
            <ChevronRight className="relative w-4 h-4 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        )}

        {/* ── Profil-Editor (Geburtstag, Bio) ─────────────────────────── */}
        <div id="profile-editor">
          <ProfileEditor
            birthday={editorBirthday}
            bio={user.bio ?? null}
            twitchLogin={user.twitchLogin ?? null}
            bannerUrl={user.bannerUrl ?? null}
          />
        </div>

        {/* ── Aktuelle Lieblingsspiele ─────────────────────────────────── */}
        <SquadsSection squads={squads} />
        <div id="favorite-games-section">
          <FavoriteGamesSection games={favoriteGames} viewerId={userId} />
        </div>

        {/* ── Pokale ───────────────────────────────────────────────────── */}
        <PokalSection pokale={pokale} ownerName={displayName} />

        {/* ── Haupt-Inhalt ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Linke Spalte ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Abzeichen */}
            <BadgesSection
              systemBadges={badges}
              customBadges={mappedCustomBadges}
              showcaseKeys={showcaseBadgeKeys}
            />

            {/* Wanderpokal */}
            <WanderpocalSection
              trophies={wanderpocalTrophies}
              userStats={wanderpocalStats}
              rankMap={wanderpocalRankMap}
            />

            <ProfileQuestsAndTournaments
              questsWithProgress={questsWithProgress}
              tournamentParticipations={tournamentParticipations}
              userId={userId}
            />
          </div>

          {/* ── Rechte Spalte ────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Aktivitäts-Stats */}
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Aktivität</h2>
              <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {[
                  { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",      value: `${voiceHours}h`,                              color: "text-teal-400"   },
                  { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",        value: String(messageCount),                          color: "text-blue-400"   },
                  { icon: <CoinIcon size={14} />,                     label: "Münzen gesammelt",   value: coinsEarned.toLocaleString("de-DE"),            color: "text-amber-400"  },
                  { icon: <CoinIcon size={14} />,                     label: "Münzen ausgegeben",  value: coinsSpent.toLocaleString("de-DE"),             color: "text-rose-400"   },
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

            {/* Letzte Events */}
            <ProfileRecentEvents eventRegs={eventRegs} userId={userId} />

            {/* Benachrichtigungen */}
            <section id="notifications">
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔔 Benachrichtigungen</h2>
              <div className="flex flex-col gap-3">
                <div className="glass card-shine rounded-2xl px-2 py-1">
                  <PushSubscribeButton />
                </div>
                <NotificationPreferences />
              </div>
            </section>

            {/* Persönliches OBS-Overlay */}
            <section id="overlay">
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📺 Stream-Overlay</h2>
              <ProfileOverlayButton hasTwitch={!!user.twitchLogin} />
            </section>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Mobile — Hero + Reiter statt separater Mancave-App (Teil B).
          ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">
        <ProfileMobileView
          bannerUrl={user.bannerUrl ?? null}
          displayName={displayName}
          avatarUrl={user.image}
          rankPoints={rankPoints}
          rankLabel={getRankFullLabel(currentRank)}
          rankColor={currentRank.color}
          memberSince={memberSince}
          totalPoints={totalPoints}
          editorBirthday={editorBirthday}
          editorBio={user.bio ?? null}
          editorTwitchLogin={user.twitchLogin ?? null}
          editorBannerUrl={user.bannerUrl ?? null}
          userId={userId}
          eventCount={eventCount}
          eventWins={eventWins}
          pollMasterCount={pollMasterCount}
          pokaleCount={pokale.length}
          topGames={topGames}
          favoriteGames={favoriteGames}
          mancaveData={mancaveData}
          systemBadges={badges}
          customBadges={mappedCustomBadges}
          showcaseBadgeKeys={showcaseBadgeKeys}
          voiceHours={voiceHours}
          messageCount={messageCount}
          coinsEarned={coinsEarned}
          coinsSpent={coinsSpent}
          questsWithProgress={questsWithProgress}
          tournamentParticipations={tournamentParticipations}
          squads={squads}
          profileCompletionDone={profileCompletionDone}
          rewardPerItem={POINT_RULES.PROFILE_BIO.amount}
          reviewYears={reviewYears}
          hasTwitch={!!user.twitchLogin}
          eventRegs={eventRegs}
        />
      </div>
    </div>
  );
}
