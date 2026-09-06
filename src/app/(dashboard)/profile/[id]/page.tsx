import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getRank, getNextRank, getRankFullLabel } from "@/lib/ranks";
import RankedAvatar from "@/components/RankedAvatar";
import RankIcon from "@/components/RankIcon";
import BotPreviewShell from "@/components/BotPreviewShell";
import { computeBadges } from "@/lib/badges";
import { Clock, MessageSquare, ArrowLeft, Crown } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import Link from "next/link";
import BadgesSection from "../BadgesSection";
import PokalSection from "@/components/PokalSection";
import FavoriteGamesSection from "../FavoriteGamesSection";
import SquadsSection from "../SquadsSection";
import { parseFavoriteGames } from "@/lib/favorite-games";
import WanderpocalSection from "@/components/WanderpocalSection";
import BattleChallengeWidget from "@/components/battle-cards/BattleChallengeWidget";
import ProfileStatTiles from "../ProfileStatTiles";
import ProfileRecentEvents from "../ProfileRecentEvents";
import ProfileQuestsAndTournaments from "../ProfileQuestsAndTournaments";
import Trophy3DViewer, { type Trophy3DItem } from "@/components/Trophy3DViewer";
import { WANDERPOKAL_MODELS, WANDERPOKAL_MODEL_DEFAULT, eventPokalModelUrl } from "../../mancave/mancave-trophy-models";
import { loadMancaveData } from "@/lib/mancave-data-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user
    .findUnique({ where: { id }, select: { name: true, username: true, rankPoints: true } })
    .catch(() => null);

  const name = user?.name ?? user?.username ?? "Mitglied";
  const title = `${name} – Old Masters Ally`;
  const description = user
    ? `${getRankFullLabel(getRank(user.rankPoints))} · ${user.rankPoints.toLocaleString("de-DE")} Rangpunkte`
    : "Profil bei Old Masters Ally";

  return {
    title,
    description,
    // Die Share-Karte zeigt Name und Avatar und ist ohne Login abrufbar — das
    // ist für Discord-Vorschauen gewollt. noindex verhindert, dass Profile
    // zusätzlich in Suchmaschinen landen. Zum Aufheben diese Zeile entfernen.
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [`/api/og/profile/${id}`] },
    twitter: { card: "summary_large_image", title, description, images: [`/api/og/profile/${id}`] },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session  = await auth();
  const viewerId = session?.user?.id;

  if (!session) {
    // Ohne Session kommt nur ein von (dashboard)/layout.tsx bereits geprüfter
    // Link-Vorschau-Bot hierher — die teure Zusammenstellung unten (Events,
    // Turniere, Abzeichen, Wanderpokal, …) braucht der nicht, nur die
    // Meta-Tags oben (Name, Rang, Avatar für die Discord-Linkvorschau).
    return <BotPreviewShell />;
  }

  // Eigenes Profil → weiterleiten
  if (viewerId === id) redirect("/profile");

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [user, eventRegs, eventCount, startedEvents, tournamentParticipations, tournamentCount, totalUsers, questsWithProgress, pokale, userSystemBadges, userCustomBadges, wanderpocalTrophies, wanderpocalStats, coinsEarnedAgg, coinsSpentAgg, lulPollWins, squadMemberships] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true, name: true, username: true, image: true,
          points: true, rankPoints: true, createdAt: true,
          showcaseBadgesJson: true, favoriteGamesJson: true,
          bio: true, birthday: true, twitchLogin: true,
          voiceMinutesTotal: true, messagesTotal: true,
        },
      }),
      prisma.eventRegistration.findMany({
        where: { userId: id },
        include: { event: { select: { id: true, title: true, startAt: true, game: true, finalRankingJson: true } } },
        orderBy: { joinedAt: "desc" },
        take: 5,
      }),
      prisma.eventRegistration.count({ where: { userId: id } }),
      prisma.event.findMany({
        where: { startAt: { lte: now }, registrations: { some: { userId: id } } },
        select: { game: true, finalRankingJson: true, completionData: true },
      }),
      prisma.tournamentParticipant.findMany({
        where: { userId: id },
        include: {
          event: {
            include: {
              matches: { where: { OR: [{ player1Id: id }, { player2Id: id }] } },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 10,
      }),
      prisma.tournamentParticipant.count({ where: { userId: id } }),
      prisma.user.count(),
      prisma.quest.findMany({
        where: { month, year },
        include: { progress: { where: { userId: id } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pokal.findMany({
        where: { userId: id },
        orderBy: { awardedAt: "desc" },
      }),
      prisma.userSystemBadge.findMany({ where: { userId: id }, select: { badgeKey: true } }),
      prisma.userCustomBadge.findMany({
        where: { userId: id },
        include: { badge: { select: { id: true, icon: true, name: true, desc: true, category: true } } },
        orderBy: { earnedAt: "asc" },
      }),
      prisma.wanderpocalHolder.findMany({ where: { userId: id } }),
      prisma.wanderpocalStat.findMany({ where: { userId: id } }),
      prisma.pointTransaction.aggregate({ where: { userId: id, amount: { gt: 0 } }, _sum: { amount: true } }),
      prisma.pointTransaction.aggregate({ where: { userId: id, amount: { lt: 0 } }, _sum: { amount: true } }),
      prisma.lulEntry.count({ where: { userId: id, communityChamp: true } }),
      prisma.squadMembership.findMany({
        where: { userId: id },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: { role: true, squad: { select: { id: true, name: true, icon: true } } },
      }),
    ]);

  if (!user) notFound();

  const squads = squadMemberships.map(m => ({ ...m.squad, role: m.role }));

  const leaderboardRank = await prisma.user.count({ where: { rankPoints: { gt: user.rankPoints ?? 0 } } }) + 1;

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

  // Derived event stats
  const eventWins = startedEvents.filter(e => {
    try { const r = JSON.parse(e.finalRankingJson ?? "[]"); return Array.isArray(r) && r[0] === id; }
    catch { return false; }
  }).length;
  const pollWinsFromEvents = startedEvents.filter(e => {
    try { const ids: string[] = (e.completionData ? JSON.parse(e.completionData) : {}).pollWinnerIds ?? []; return ids.includes(id); }
    catch { return false; }
  }).length;
  const pollMasterCount = pollWinsFromEvents + lulPollWins;
  const gameCounts = startedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);

  const rankPoints   = user.rankPoints ?? 0;
  const totalPoints  = user.points;
  const rankRow      = getRank(rankPoints);
  const nextRankRow  = getNextRank(rankPoints);
  const rankPct      = nextRankRow
    ? Math.min(100, Math.round(((rankPoints - rankRow.min) / (nextRankRow.min - rankRow.min)) * 100))
    : 100;

  const voiceHours   = Math.floor((user.voiceMinutesTotal ?? 0) / 60);
  const messageCount = user.messagesTotal ?? 0;
  const coinsEarned  = coinsEarnedAgg._sum.amount ?? 0;
  const coinsSpent   = Math.abs(coinsSpentAgg._sum.amount ?? 0);
  const earnedSystemKeys = new Set(userSystemBadges.map(b => b.badgeKey));
  const badges       = computeBadges({ points: totalPoints, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins: 0, eventWins, mvpCount: pollMasterCount }, earnedSystemKeys);
  const earnedBadges = badges.filter(b => b.earned);
  const memberSince  = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const displayName  = user.username ?? user.name ?? "Unbekannt";

  const showcaseBadgeKeys: string[] = (() => {
    try { return JSON.parse(user.showcaseBadgesJson ?? "[]"); } catch { return []; }
  })();
  const favoriteGames = parseFavoriteGames(user.favoriteGamesJson);

  // Für den 3D-Pokal-Viewer + "wer ist aktueller Halter"-Anzeige — dieselbe
  // Aggregation, die auch die eigene Profilseite nutzt (siehe page.tsx),
  // hier für den PROFILEIGENTÜMER (id) statt für den Betrachter geladen.
  // isAdmin=false: diese Seite zeigt fremde Zimmer nur lesend (Pokal-Viewer,
  // Wer-hält-Anzeige) — Ausbau-Kosten/Testmodus-Flag aus `mancaveData` werden
  // hier gar nicht gerendert, spielen für den Profileigentümer also keine Rolle.
  const mancaveData = await loadMancaveData(id, false);
  const wanderpocalHolders: Record<string, { holderUserId: string | null; holderName: string | null; holderAvatarUrl: string | null; holderRankPoints: number | null }> = {};
  for (const s of mancaveData.wanderpokalStatus) {
    wanderpocalHolders[`${s.scopeType}:${s.scopeValue}`] = {
      holderUserId: s.holderUserId, holderName: s.holderName,
      holderAvatarUrl: s.holderAvatarUrl, holderRankPoints: s.holderRankPoints,
    };
  }
  const wanderpokalItems: Trophy3DItem[] = mancaveData.wanderpokale.map(w => {
    const cfg = WANDERPOKAL_MODELS[w.scopeValue] ?? WANDERPOKAL_MODEL_DEFAULT;
    const holder = wanderpocalHolders[`${w.scopeType}:${w.scopeValue}`];
    return {
      id: `${w.scopeType}:${w.scopeValue}`, title: w.title, modelUrl: cfg.url,
      meta: `${w.winCount} ${w.winCount === 1 ? "Sieg" : "Siege"}`,
      holderUserId: holder?.holderUserId, holderName: holder?.holderName,
      holderAvatarUrl: holder?.holderAvatarUrl, holderRankPoints: holder?.holderRankPoints,
    };
  });
  const eventPokalItems: Trophy3DItem[] = pokale.map(p => ({
    id: p.id, title: p.title, modelUrl: eventPokalModelUrl(p.category),
    meta: p.awardedAt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
  }));

  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link href="/leaderboard"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Rangliste
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href={`/profile/compare/${id}`}
            className="inline-flex items-center gap-2 text-xs glass border border-white/[0.08] hover:border-rose-500/30 text-gray-400 hover:text-white px-3 py-2 rounded-xl transition-all">
            ⚔️ Mit mir vergleichen
          </Link>
          {viewerId && (
            <BattleChallengeWidget opponentId={id} opponentName={displayName} />
          )}
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-purple-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            <RankedAvatar
              rankPoints={rankPoints}
              src={user.image}
              alt={displayName}
              size={80}
              rounded="2xl"
              className="w-20 h-20"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${rankRow.color} ${rankRow.bg} ${rankRow.border}`}>
                <RankIcon rankPoints={rankPoints} size="xs" showPips={false} /> {getRankFullLabel(rankRow)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              Mitglied seit {memberSince} · {earnedBadges.length + userCustomBadges.length} Abzeichen
            </p>
            <div className="flex items-center gap-1 mb-2">
              <CoinIcon size={12} />
              <span className="text-xs text-amber-400 font-medium tabular-nums">{totalPoints.toLocaleString("de-DE")} Münzen</span>
            </div>
            <p className="text-sm font-bold text-rose-400">{rankPoints.toLocaleString("de-DE")} Punkte</p>

            {/* Rang-Fortschrittsbalken */}
            <div className="mt-3 max-w-xs">
              {nextRankRow ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[9px] text-gray-600 whitespace-nowrap">
                    <RankIcon rankPoints={rankPoints} size="xs" showPips={false} /> {getRankFullLabel(rankRow)}
                  </span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${rankPct}%`, background: "linear-gradient(90deg, #f43f5e, #fb7185)", boxShadow: "0 0 6px rgba(244,63,94,0.6)" }} />
                  </div>
                  <span className="flex items-center gap-1 text-[9px] text-gray-600 whitespace-nowrap">
                    <RankIcon rankPoints={nextRankRow.min} size="xs" showPips={false} /> {getRankFullLabel(nextRankRow)}
                  </span>
                  <span className="text-[9px] text-rose-400 tabular-nums">{rankPct}%</span>
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
          </div>
        </div>
      </div>

      {/* ── Stat-Karten ─────────────────────────────────────────────── */}
      <ProfileStatTiles
        rankPoints={rankPoints}
        eventCount={eventCount}
        eventWins={eventWins}
        pollMasterCount={pollMasterCount}
        pokaleCount={pokale.length}
        topGames={topGames}
      />

      <SquadsSection squads={squads} />

      {/* ── Aktuelle Lieblingsspiele (read-only) ────────────────────── */}
      {favoriteGames.length > 0 && (
        <FavoriteGamesSection games={favoriteGames} readOnly displayName={displayName} viewerId={viewerId} />
      )}

      {/* ── Pokale (read-only) ───────────────────────────────────────── */}
      <PokalSection pokale={pokale} ownerName={displayName} />

      {/* ── Haupt-Inhalt ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Linke Spalte ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Abzeichen */}
          <BadgesSection
            systemBadges={badges}
            customBadges={userCustomBadges.map(uc => ({
              id:       uc.badge.id,
              icon:     uc.badge.icon,
              name:     uc.badge.name,
              desc:     uc.badge.desc,
              category: uc.badge.category,
              earnedAt: uc.earnedAt.toISOString(),
            }))}
            showcaseKeys={showcaseBadgeKeys}
            readOnly
          />

          {/* Wanderpokal */}
          <WanderpocalSection
            trophies={wanderpocalTrophies}
            userStats={wanderpocalStats}
            rankMap={wanderpocalRankMap}
            holders={wanderpocalHolders}
          />
          <Trophy3DViewer items={wanderpokalItems} emptyMessage="Noch keine Wanderpokale gewonnen" />

          {/* Event-Pokale (3D) */}
          <Trophy3DViewer items={eventPokalItems} emptyMessage="Noch keine Event-Pokale gewonnen" />

          <ProfileQuestsAndTournaments
            questsWithProgress={questsWithProgress}
            tournamentParticipations={tournamentParticipations}
            userId={id}
          />
        </div>

        {/* ── Rechte Spalte ────────────────────────────────────────── */}
        <div className="space-y-5">
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Aktivität</h2>
            <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />,         label: "Voice-Stunden",     value: `${voiceHours}h`,                   color: "text-teal-400"  },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Nachrichten",       value: String(messageCount),               color: "text-blue-400"  },
                { icon: <CoinIcon size={14} />,                     label: "Münzen gesammelt",  value: coinsEarned.toLocaleString("de-DE"), color: "text-amber-400" },
                { icon: <CoinIcon size={14} />,                     label: "Münzen ausgegeben", value: coinsSpent.toLocaleString("de-DE"),  color: "text-rose-400"  },
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

          <ProfileRecentEvents eventRegs={eventRegs} userId={id} />
        </div>
      </div>
    </div>
  );
}
