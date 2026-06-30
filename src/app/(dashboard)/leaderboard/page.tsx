import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getRank, getRankFullLabel } from "@/lib/ranks";
import RankedAvatar from "@/components/RankedAvatar";
import { calcStreak } from "@/lib/streak";
import { Trophy, Swords, Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import RankIcon from "@/components/RankIcon";
import { CountUp } from "@/components/CountUp";
import Link from "next/link";
import Image from "next/image";
import WanderpocalBadgeServer from "@/components/WanderpocalBadgeServer";
import { getWanderpocalHoldersMap } from "@/lib/get-wanderpocal-holders";
import LeaderboardSnapshotButton from "./LeaderboardSnapshotButton";

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM_CONFIG = [
  {
    rank: 0,
    order: "order-2",
    heightOffset: "",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    border: "border-amber-500/30",
    glow: "0 0 40px rgba(245,158,11,0.20), 0 8px 32px rgba(0,0,0,0.5)",
    topLine: "via-amber-400/60",
    nameColor: "text-amber-300",
    pointsColor: "text-amber-400",
    avatarRing: "ring-amber-400/50",
    avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
    fontSize: "text-lg sm:text-xl",
    crown: true,
  },
  {
    rank: 1,
    order: "order-1",
    heightOffset: "mt-6",
    gradient: "from-slate-400/12 via-slate-400/3 to-transparent",
    border: "border-slate-500/25",
    glow: "0 0 24px rgba(148,163,184,0.10), 0 8px 24px rgba(0,0,0,0.4)",
    topLine: "via-slate-400/40",
    nameColor: "text-slate-300",
    pointsColor: "text-slate-400",
    avatarRing: "ring-slate-400/40",
    avatarSize: "w-12 h-12 sm:w-14 sm:h-14",
    fontSize: "text-base",
    crown: false,
  },
  {
    rank: 2,
    order: "order-3",
    heightOffset: "mt-8",
    gradient: "from-orange-600/12 via-orange-600/3 to-transparent",
    border: "border-orange-600/25",
    glow: "0 0 24px rgba(234,88,12,0.10), 0 8px 24px rgba(0,0,0,0.4)",
    topLine: "via-orange-500/40",
    nameColor: "text-orange-300",
    pointsColor: "text-orange-400",
    avatarRing: "ring-orange-500/40",
    avatarSize: "w-12 h-12 sm:w-14 sm:h-14",
    fontSize: "text-base",
    crown: false,
  },
];

function RankDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 leading-none">
        <TrendingUp className="w-2.5 h-2.5" />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400 leading-none">
        <TrendingDown className="w-2.5 h-2.5" />
        {Math.abs(delta)}
      </span>
    );
  }
  return <Minus className="w-2.5 h-2.5 text-gray-700" />;
}

export default async function LeaderboardPage() {
  const me     = await getSessionUser();
  const userId = me?.id;
  const isAdmin = me?.role === "admin" || me?.role === "moderator";

  const [users, eventsWithWinners, donationGroups, holdersMap, latestSnapshot] = await Promise.all([
    prisma.user.findMany({
      orderBy: { rankPoints: "desc" },
      take: 50,
      select: {
        id: true, name: true, username: true, image: true,
        rankPoints: true,
        _count: { select: { tournamentParticipants: true } },
      },
    }),
    prisma.event.findMany({
      where: { completionData: { not: null } },
      select: { completionData: true },
    }),
    prisma.donation.groupBy({
      by: ["userId", "month", "year"],
      orderBy: [{ userId: "asc" }, { year: "desc" }, { month: "desc" }],
    }),
    getWanderpocalHoldersMap(),
    prisma.leaderboardRankSnapshot.findFirst({
      orderBy: { takenAt: "desc" },
    }),
  ]);

  const winMap = new Map<string, number>();
  for (const ev of eventsWithWinners) {
    try {
      const data = JSON.parse(ev.completionData!);
      const winners: string[] =
        data.eventWinnerIds ??
        (data.eventWinnerId ? [data.eventWinnerId] : null) ??
        data.finalRankingGroups?.[0] ??
        (data.finalRanking?.[0] ? [data.finalRanking[0]] : []);
      for (const uid of winners) {
        winMap.set(uid, (winMap.get(uid) ?? 0) + 1);
      }
    } catch { /* skip malformed JSON */ }
  }

  const donationsByUser = new Map<string, { month: number; year: number }[]>();
  for (const d of donationGroups) {
    if (!donationsByUser.has(d.userId)) donationsByUser.set(d.userId, []);
    donationsByUser.get(d.userId)!.push({ month: d.month, year: d.year });
  }
  const streakMap = new Map(
    Array.from(donationsByUser.entries()).map(([uid, entries]) => [uid, calcStreak(entries)])
  );

  // Parse snapshot for rank deltas
  const snapshotRanks: Record<string, number> = latestSnapshot
    ? (() => { try { return JSON.parse(latestSnapshot.dataJson); } catch { return {}; } })()
    : {};
  const hasSnapshot = Object.keys(snapshotRanks).length > 0;

  const myRank = userId ? users.findIndex(u => u.id === userId) + 1 : null;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", boxShadow: "0 0 20px rgba(245,158,11,0.10)" }}>
              <Trophy className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">Rangliste</h1>
          </div>
          <p className="text-xs text-gray-500 ml-11">Top {users.length} Spieler · sortiert nach Prestige-Punkten</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <LeaderboardSnapshotButton snapshotTakenAt={latestSnapshot?.takenAt?.toISOString() ?? null} />}
          {myRank && myRank > 0 && (
            <div className="card-cut surface px-4 py-2.5 text-center hidden sm:block"
              style={{ boxShadow: "0 0 0 1px rgba(20,184,166,0.12)" }}>
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.14em]">Dein Rang</p>
              <p className="font-display text-xl font-black text-gradient-gaming">#{myRank}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Snapshot-Legende ─────────────────────────────────────────── */}
      {hasSnapshot && latestSnapshot && (
        <div className="flex items-center gap-1.5 px-1">
          <TrendingUp className="w-3 h-3 text-emerald-500/60" />
          <span className="text-[10px] text-gray-600">
            Veränderung seit:{" "}
            <span className="text-gray-500">
              {new Date(latestSnapshot.takenAt).toLocaleDateString("de-DE", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
                timeZone: "Europe/Berlin",
              })}
            </span>
          </span>
        </div>
      )}

      {/* ── Podium Top 3 ─────────────────────────────────────────── */}
      {users.length >= 3 && (
        <div className="flex items-end justify-center gap-3 sm:gap-4 pt-4">
          {PODIUM_CONFIG.map((cfg) => {
            const u           = users[cfg.rank];
            const displayName = u.username ?? u.name ?? "?";
            const isMe        = u.id === userId;
            const userWins    = winMap.get(u.id) ?? 0;
            const currentRank = cfg.rank + 1;
            const prevRank    = snapshotRanks[u.id] ?? null;
            const rankDelta   = hasSnapshot && prevRank !== null ? prevRank - currentRank : null;

            return (
              <Link key={u.id}
                href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`card-cut card-hover relative flex flex-col items-center surface p-4 sm:p-5 flex-1 max-w-[200px] overflow-hidden
                  ${cfg.heightOffset} ${cfg.order} transition-all`}
                style={{ boxShadow: cfg.glow, borderColor: cfg.border.replace("border-", "") }}>

                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${cfg.topLine} to-transparent`} />

                {cfg.crown && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl select-none animate-float-slow">
                    👑
                  </div>
                )}

                <span className={`${cfg.crown ? "mt-5" : "mt-0"} text-2xl sm:text-3xl mb-3 select-none`}>
                  {MEDALS[cfg.rank]}
                </span>

                <RankedAvatar
                  rankPoints={u.rankPoints}
                  src={u.image}
                  alt={displayName}
                  size={cfg.rank === 0 ? 80 : 56}
                  rounded="full"
                  className={`${cfg.avatarSize} mb-3`}
                />

                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <RankIcon rankPoints={u.rankPoints} size="sm" />
                </div>
                <p className={`${cfg.fontSize} font-bold truncate max-w-full text-center leading-tight ${isMe ? "text-teal-300" : cfg.nameColor}`}>
                  {displayName}
                  <WanderpocalBadgeServer userId={u.id} holdersMap={holdersMap} />
                  {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                </p>

                <div className="mt-3 text-center">
                  <p className={`text-base sm:text-lg font-black tabular-nums ${cfg.pointsColor}`}>
                    <CountUp to={u.rankPoints} duration={700 + cfg.rank * 150} />
                    <span className="text-xs font-semibold ml-1 opacity-70">Pts</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                  {userWins > 0 && <span className="flex items-center gap-0.5"><Swords className="w-2.5 h-2.5" />{userWins}</span>}
                  {rankDelta !== null && <RankDeltaBadge delta={rankDelta} />}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Vollständige Liste ────────────────────────────────────── */}
      <div className="surface overflow-hidden"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.45)" }}>

        <div className="grid items-center gap-x-3 px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest
          [grid-template-columns:2rem_2.25rem_1fr_7rem]
          sm:[grid-template-columns:2rem_2rem_2.25rem_1fr_4rem_7rem_7rem]"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>#</span>
          <span className="hidden sm:block" />
          <span />
          <span>Spieler</span>
          <span className="hidden sm:flex text-center items-center justify-center gap-1"><Swords className="w-3 h-3" />Siege</span>
          <span className="hidden sm:flex text-center items-center justify-center gap-1"><Heart className="w-3 h-3 text-pink-400" />Streak</span>
          <span className="flex items-center justify-center gap-1"><RankPointsIcon size={12} />Punkte</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {users.map((u, i) => {
            const displayName = u.username ?? u.name ?? "Unbekannt";
            const isMe          = u.id === userId;
            const userWins      = winMap.get(u.id) ?? 0;
            const donationStreak = streakMap.get(u.id) ?? 0;
            const isTop3        = i < 3;
            const currentRank   = i + 1;
            const prevRank      = snapshotRanks[u.id] ?? null;
            const rankDelta     = hasSnapshot && prevRank !== null ? prevRank - currentRank : null;

            const rowAccent = i === 0
              ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.07]"
              : i === 1
              ? "bg-slate-500/[0.03] hover:bg-slate-500/[0.06]"
              : i === 2
              ? "bg-orange-500/[0.03] hover:bg-orange-600/[0.06]"
              : isMe
              ? "bg-teal-500/[0.05] hover:bg-teal-500/[0.08]"
              : "hover:bg-white/[0.025]";

            const nameColor = i === 0 ? "text-amber-300"
              : i === 1 ? "text-slate-300"
              : i === 2 ? "text-orange-300"
              : isMe    ? "text-teal-300"
              : "text-white";

            const ptsColor = i === 0 ? "text-amber-400"
              : i === 1 ? "text-slate-400"
              : i === 2 ? "text-orange-400"
              : isMe    ? "text-teal-400"
              : "text-white";

            return (
              <Link key={u.id}
                href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`grid items-center gap-x-3 px-4 py-3 transition-colors ${rowAccent} animate-slide-up
                  [grid-template-columns:2rem_2.25rem_1fr_7rem]
                  sm:[grid-template-columns:2rem_2rem_2.25rem_1fr_4rem_7rem_7rem]`}
                style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>

                {/* # Rang */}
                <div className="text-center">
                  {isTop3
                    ? <span className="text-base leading-none">{MEDALS[i]}</span>
                    : <span className={`text-xs font-bold tabular-nums ${isMe ? "text-teal-400" : "text-gray-600"}`}>{i + 1}</span>}
                </div>

                {/* Rang-Delta — nur ab sm */}
                <div className="hidden sm:flex items-center justify-center">
                  <RankDeltaBadge delta={rankDelta} />
                </div>

                {/* Avatar */}
                <RankedAvatar
                  rankPoints={u.rankPoints}
                  src={u.image}
                  alt={displayName}
                  size={36}
                  rounded="full"
                  className="w-9 h-9"
                />

                {/* Name + Rang */}
                <div className="min-w-0 flex items-center gap-2">
                  <RankIcon rankPoints={u.rankPoints} size="sm" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate leading-tight ${nameColor}`}>
                      {displayName}
                      <WanderpocalBadgeServer userId={u.id} holdersMap={holdersMap} />
                      {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                      {getRankFullLabel(getRank(u.rankPoints))}
                    </p>
                  </div>
                </div>

                {/* Siege — nur ab sm */}
                <div className="hidden sm:block text-center">
                  <p className="text-sm font-bold tabular-nums text-white">{userWins}</p>
                  <p className="text-[9px] text-gray-600">Siege</p>
                </div>

                {/* Spendenstreak — nur ab sm */}
                <div className="hidden sm:block text-center">
                  <p className="text-sm font-bold tabular-nums text-pink-400 flex items-center justify-center gap-1">
                    {donationStreak > 0
                      ? <><Heart className="w-3.5 h-3.5 text-pink-400" />{donationStreak} Mon.</>
                      : <span className="text-gray-600">—</span>}
                  </p>
                </div>

                {/* Punkte */}
                <div className="text-center">
                  <p className={`text-sm font-black tabular-nums ${ptsColor}`}>
                    {u.rankPoints.toLocaleString("de-DE")}
                  </p>
                  <p className="text-[9px] text-amber-600/70">Punkte</p>
                </div>

              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
