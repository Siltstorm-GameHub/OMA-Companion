import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { getRank, getNextRank } from "@/lib/ranks";
import { computeBadges } from "@/lib/badges";
import { MAX_SHOWCASE } from "@/lib/collectibles";
import {
  CalendarDays, Swords, Clock,
  MessageSquare, CheckCircle2, ArrowLeft,
  Crown, Gamepad2, Medal, Trophy,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import WinIcon from "@/components/WinIcon";
import Link from "next/link";
import Image from "next/image";
import BadgesSection from "../BadgesSection";
import CollectiblesShowcase from "../CollectiblesShowcase";
import WanderpocalSection from "@/components/WanderpocalSection";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session  = await auth();
  const viewerId = session?.user?.id;

  // Eigenes Profil → weiterleiten
  if (viewerId === id) {
    const { redirect } = await import("next/navigation");
    redirect("/profile");
  }

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [user, eventRegs, eventCount, startedEvents, tournamentParticipations, tournamentCount, totalUsers, questsWithProgress, ownedCollectibles, userSystemBadges, userCustomBadges, wanderpocalTrophies, wanderpocalStats, coinsEarnedAgg, coinsSpentAgg, lulPollWins] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true, name: true, username: true, image: true,
          points: true, rankPoints: true, createdAt: true,
          showcaseJson: true, showcaseBadgesJson: true,
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
      prisma.userCollectible.findMany({
        where: { userId: id },
        include: {
          collectibleItem: {
            include: { collection: { select: { id: true, name: true, coverImageUrl: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
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
    ]);

  if (!user) notFound();

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
  const showcaseIds: string[] = (() => {
    try { return JSON.parse(user.showcaseJson ?? "[]"); } catch { return []; }
  })();
  const showcaseItems = showcaseIds
    .map(sid => ownedCollectibles.find(o => o.collectibleItemId === sid)?.collectibleItem ?? null)
    .filter(Boolean) as typeof ownedCollectibles[0]["collectibleItem"][];



  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link href="/leaderboard"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Rangliste
        </Link>
        <Link href={`/profile/compare/${id}`}
          className="inline-flex items-center gap-2 text-xs glass border border-white/[0.08] hover:border-rose-500/30 text-gray-400 hover:text-white px-3 py-2 rounded-xl transition-all">
          ⚔️ Mit mir vergleichen
        </Link>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-purple-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.image
              ? <Image src={user.image} alt={displayName} width={80} height={80}
                  className="w-20 h-20 rounded-2xl ring-2 ring-rose-500/25 object-cover shadow-[0_0_24px_rgba(244,63,94,0.2)]" />
              : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-2xl font-bold text-white">
                  {displayName[0].toUpperCase()}
                </div>}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${rankRow.color} ${rankRow.bg} ${rankRow.border}`}>
                {rankRow.emoji} {rankRow.label}
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
                  <span className="text-[9px] text-gray-600 whitespace-nowrap">{rankRow.emoji} {rankRow.label}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${rankPct}%`, background: "linear-gradient(90deg, #f43f5e, #fb7185)", boxShadow: "0 0 6px rgba(244,63,94,0.6)" }} />
                  </div>
                  <span className="text-[9px] text-gray-600 whitespace-nowrap">{nextRankRow.emoji} {nextRankRow.label}</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {([
          { icon: <RankPointsIcon size={16} />,         label: "Punkte",      value: rankPoints.toLocaleString("de-DE"), iconCls: "text-teal-400    bg-teal-500/10    border-teal-500/15",    accent: "from-teal-500/8"    },
          { icon: <CalendarDays className="w-4 h-4" />, label: "Events",      value: String(eventCount),                 iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", accent: "from-emerald-500/8" },
          { icon: <Medal className="w-4 h-4" />,        label: "Event-Siege", value: String(eventWins),                  iconCls: "text-amber-400   bg-amber-500/10   border-amber-500/15",   accent: "from-amber-500/8"   },
          { icon: <Trophy className="w-4 h-4" />,       label: "Poll-Master", value: String(pollMasterCount),            iconCls: "text-purple-400  bg-purple-500/10  border-purple-500/15",  accent: "from-purple-500/8"  },
        ]).map((s, i) => (
          <div key={s.label} className={`card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-${i + 1}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent pointer-events-none`} />
            <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border ${s.iconCls}`}>{s.icon}</div>
            <p className="relative text-2xl font-black text-white tabular-nums">{s.value}</p>
            <p className="relative text-xs text-gray-400 mt-1.5">{s.label}</p>
          </div>
        ))}

        {/* Collectibles */}
        <div className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-5">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/8 to-transparent pointer-events-none" />
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border text-pink-400 bg-pink-500/10 border-pink-500/15">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <p className="relative text-2xl font-black text-white tabular-nums">{ownedCollectibles.length}</p>
          <p className="relative text-xs text-gray-400 mt-1.5">Collectibles</p>
        </div>

        {/* Lieblingsspiel – Top 3 */}
        <div className="card-hover card-shine glass relative overflow-hidden rounded-2xl p-4 animate-slide-up stagger-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent pointer-events-none" />
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center mb-3 border text-blue-400 bg-blue-500/10 border-blue-500/15">
            <Gamepad2 className="w-4 h-4" />
          </div>
          {topGames.length > 0 ? (
            <>
              <p className="relative text-lg font-black text-white leading-tight">{topGames[0]}</p>
              {topGames.slice(1, 3).length > 0 && (
                <p className="relative text-[10px] text-gray-500 mt-1 leading-snug">
                  {topGames.slice(1, 3).join(" · ")}
                </p>
              )}
            </>
          ) : (
            <p className="relative text-lg font-black text-white">–</p>
          )}
          <p className="relative text-xs text-gray-400 mt-1.5">Lieblingsspiel</p>
        </div>
      </div>

      {/* ── Collectibles Showcase (read-only) ───────────────────────── */}
      {showcaseItems.length > 0 && (
        <CollectiblesShowcase
          showcaseItems={showcaseItems.map(i => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, rarity: i.rarity }))}
          allOwned={[]}
          maxSlots={MAX_SHOWCASE}
          readOnly
        />
      )}

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
          />

          {/* Quest-Fortschritt */}
          {questsWithProgress.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📜 Quests diesen Monat</h2>
              <div className="space-y-2">
                {questsWithProgress.map(quest => {
                  const meta    = QUEST_TYPE_META[quest.type as QuestType];
                  const p       = quest.progress[0];
                  const current = Math.min(p?.current ?? 0, quest.target);
                  const pct     = Math.round((current / quest.target) * 100);
                  const done    = p?.completed ?? false;
                  return (
                    <div key={quest.id} className={`glass card-shine rounded-xl px-4 py-3 relative overflow-hidden ${done ? "border-emerald-500/20" : ""}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${meta.bar} rounded-l-xl`} />
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.icon}</span>
                          <span className={`text-sm font-medium ${done ? "text-emerald-300" : "text-white"}`}>{quest.title}</span>
                          {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500">{current}/{quest.target}</span>
                          <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5 tabular-nums">+{quest.reward}<CoinIcon size={10} /></span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Turnier-Ergebnisse */}
          {tournamentParticipations.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Swords className="w-3.5 h-3.5" /> Turnier-Ergebnisse
              </h2>
              <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {tournamentParticipations.map(p => {
                  const myMatches = p.event.matches;
                  const winsCount = myMatches.filter(m => m.winnerId === id).length;
                  const losses    = myMatches.filter(m => m.winnerId && m.winnerId !== id).length;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                        <WinIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {winsCount > 0 ? `${winsCount} Siege` : ""}
                          {winsCount > 0 && losses > 0 ? " · " : ""}
                          {losses > 0 ? `${losses} Niederlagen` : ""}
                          {winsCount === 0 && losses === 0 ? "Keine Matches gespielt" : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                        p.finalRank === 1  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        p.eliminated       ? "bg-white/[0.04] text-gray-500 border-white/[0.06]" :
                                             "bg-white/[0.04] text-gray-400 border-white/[0.06]"
                      }`}>
                        {p.finalRank === 1 ? <><WinIcon size={11} /> Sieger</> : p.eliminated ? "Ausgeschieden" : "Aktiv"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
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

          {/* Letzte Events */}
          {eventRegs.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📅 Letzte Events</h2>
              <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {eventRegs.map(reg => {
                  let placement: number | null = null;
                  try {
                    const ranking: string[] = JSON.parse(reg.event.finalRankingJson ?? "[]");
                    const idx = ranking.indexOf(id);
                    if (idx !== -1) placement = idx + 1;
                  } catch { /* ignore */ }
                  return (
                    <Link key={reg.id} href={`/events/${reg.event.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-rose-300 transition-colors">{reg.event.title}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {new Date(reg.event.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                          {reg.event.game ? ` · ${reg.event.game}` : ""}
                        </p>
                      </div>
                      {placement !== null && (
                        <span className={`ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums ${
                          placement === 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          placement === 2 ? "bg-gray-400/10 text-gray-300 border-gray-400/20" :
                          placement === 3 ? "bg-orange-700/10 text-orange-400 border-orange-700/20" :
                                            "bg-white/[0.04] text-gray-500 border-white/[0.06]"
                        }`}>#{placement}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
