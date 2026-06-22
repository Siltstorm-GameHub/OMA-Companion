import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getRank } from "@/lib/ranks";
import { calcStreak } from "@/lib/streak";
import { Trophy, Swords, Flame } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import CoinIcon from "@/components/CoinIcon";
import { CountUp } from "@/components/CountUp";
import Link from "next/link";
import Image from "next/image";

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM_CONFIG = [
  {
    // 1. Platz — Mitte, höchste Karte
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
    // 2. Platz — Links
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
    // 3. Platz — Rechts
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

export default async function LeaderboardPage() {
  const me     = await getSessionUser();
  const userId = me?.id;

  const [users, wins, donationGroups] = await Promise.all([
    prisma.user.findMany({
      orderBy: { rankPoints: "desc" },
      take: 50,
      select: {
        id: true, name: true, username: true, image: true,
        points: true, rankPoints: true,
        _count: { select: { tournamentParticipants: true } },
      },
    }),
    prisma.match.groupBy({
      by: ["winnerId"],
      _count: { winnerId: true },
      where: { winnerId: { not: null } },
    }),
    // Monat/Jahr-Paare pro User aggregieren — günstiger als alle Zeilen laden
    prisma.donation.groupBy({
      by: ["userId", "month", "year"],
      orderBy: [{ userId: "asc" }, { year: "desc" }, { month: "desc" }],
    }),
  ]);

  const winMap = new Map(wins.map(w => [w.winnerId!, w._count.winnerId]));

  const donationsByUser = new Map<string, { month: number; year: number }[]>();
  for (const d of donationGroups) {
    if (!donationsByUser.has(d.userId)) donationsByUser.set(d.userId, []);
    donationsByUser.get(d.userId)!.push({ month: d.month, year: d.year });
  }
  const streakMap = new Map(
    Array.from(donationsByUser.entries()).map(([uid, entries]) => [uid, calcStreak(entries)])
  );

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
        {myRank && myRank > 0 && (
          <div className="card-cut surface px-4 py-2.5 text-center hidden sm:block"
            style={{ boxShadow: "0 0 0 1px rgba(20,184,166,0.12)" }}>
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.14em]">Dein Rang</p>
            <p className="font-display text-xl font-black text-gradient-gaming">#{myRank}</p>
          </div>
        )}
      </div>

      {/* ── Podium Top 3 ─────────────────────────────────────────── */}
      {users.length >= 3 && (
        <div className="flex items-end justify-center gap-3 sm:gap-4 pt-4">
          {PODIUM_CONFIG.map((cfg) => {
            const u           = users[cfg.rank];
            const displayName = u.username ?? u.name ?? "?";
            const isMe        = u.id === userId;
            const userWins    = winMap.get(u.id) ?? 0;

            return (
              <Link key={u.id}
                href={isMe ? "/profile" : `/profile/${u.id}`}
                className={`card-cut card-hover relative flex flex-col items-center surface p-4 sm:p-5 flex-1 max-w-[200px] overflow-hidden
                  ${cfg.heightOffset} ${cfg.order} transition-all`}
                style={{ boxShadow: cfg.glow, borderColor: cfg.border.replace("border-", "") }}>

                {/* Top-Linie */}
                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${cfg.topLine} to-transparent`} />

                {/* Krone für Platz 1 */}
                {cfg.crown && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl select-none animate-float-slow">
                    👑
                  </div>
                )}

                {/* Medaille */}
                <span className={`${cfg.crown ? "mt-5" : "mt-0"} text-2xl sm:text-3xl mb-3 select-none`}>
                  {MEDALS[cfg.rank]}
                </span>

                {/* Avatar */}
                <div className={`${cfg.avatarSize} rounded-full overflow-hidden ring-2 ${cfg.avatarRing} mb-3 shrink-0`}
                  style={{ boxShadow: cfg.rank === 0 ? "0 0 24px rgba(245,158,11,0.30)" : undefined }}>
                  {u.image
                    ? <Image src={u.image} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-base font-black text-white"
                        style={{ background: "linear-gradient(135deg, #14b8a6, #8b2020)" }}>
                        {displayName[0].toUpperCase()}
                      </div>}
                </div>

                {/* Name */}
                <p className={`${cfg.fontSize} font-bold truncate max-w-full text-center leading-tight ${isMe ? "text-teal-300" : cfg.nameColor}`}>
                  {displayName}
                  {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                </p>

                {/* Punkte */}
                <div className="mt-3 text-center">
                  <p className={`text-base sm:text-lg font-black tabular-nums ${cfg.pointsColor}`}>
                    <CountUp to={u.rankPoints} duration={700 + cfg.rank * 150} />
                    <span className="text-xs font-semibold ml-1 opacity-70">Pts</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                    <CoinIcon size={12} />
                    <span className="tabular-nums">{u.points.toLocaleString("de-DE")}</span>
                  </p>
                </div>

                {/* Mini-Stats */}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                  {userWins > 0 && <span className="flex items-center gap-0.5"><Swords className="w-2.5 h-2.5" />{userWins}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Vollständige Liste ────────────────────────────────────── */}
      <div className="surface overflow-hidden"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.45)" }}>

        {/* Spalten-Header: # | Avatar | Name | [Siege] | [Events] | Münzen | Punkte */}
        {/* Siege + Events werden auf Mobile ausgeblendet */}
        <div className="grid items-center gap-x-3 px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest
          [grid-template-columns:2rem_2.25rem_1fr_5rem_5rem]
          sm:[grid-template-columns:2rem_2.25rem_1fr_4rem_4rem_5rem_5rem]"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>#</span>
          <span />
          <span>Spieler</span>
          <span className="hidden sm:flex text-center items-center justify-center gap-1"><Swords className="w-3 h-3" />Siege</span>
          <span className="hidden sm:flex text-center items-center justify-center gap-1"><Flame className="w-3 h-3 text-orange-400" />Streak</span>
          <span className="flex items-center justify-center gap-1"><CoinIcon size={12} />Münzen</span>
          <span className="flex items-center justify-center gap-1"><RankPointsIcon size={12} />Punkte</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {users.map((u, i) => {
            const displayName = u.username ?? u.name ?? "Unbekannt";
            const isMe          = u.id === userId;
            const userWins      = winMap.get(u.id) ?? 0;
            const donationStreak = streakMap.get(u.id) ?? 0;
            const isTop3        = i < 3;

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
                  [grid-template-columns:2rem_2.25rem_1fr_5rem_5rem]
                  sm:[grid-template-columns:2rem_2.25rem_1fr_4rem_4rem_5rem_5rem]`}
                style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>

                {/* # Rang */}
                <div className="text-center">
                  {isTop3
                    ? <span className="text-base leading-none">{MEDALS[i]}</span>
                    : <span className={`text-xs font-bold tabular-nums ${isMe ? "text-teal-400" : "text-gray-600"}`}>{i + 1}</span>}
                </div>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full overflow-hidden
                  ${isTop3 ? "ring-2" : "ring-1"}
                  ${i === 0 ? "ring-amber-400/50" : i === 1 ? "ring-slate-400/40" : i === 2 ? "ring-orange-500/40" : isMe ? "ring-teal-400/40" : "ring-white/[0.08]"}`}>
                  {u.image
                    ? <Image src={u.image} alt={displayName} width={36} height={36} className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${isMe ? "bg-teal-500/20 text-teal-300" : "bg-white/[0.05] text-gray-400"}`}>
                        {displayName[0].toUpperCase()}
                      </div>}
                </div>

                {/* Name + Rang */}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate leading-tight ${nameColor}`}>
                    {displayName}
                    {isMe && <span className="text-[10px] text-gray-500 ml-1 font-normal">du</span>}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                    {getRank(u.rankPoints).emoji} {getRank(u.rankPoints).label}
                  </p>
                </div>

                {/* Siege — nur ab sm */}
                <div className="hidden sm:block text-center">
                  <p className="text-sm font-bold tabular-nums text-white">{userWins}</p>
                  <p className="text-[9px] text-gray-600">Siege</p>
                </div>

                {/* Spendenstreak — nur ab sm */}
                <div className="hidden sm:block text-center">
                  <p className="text-sm font-bold tabular-nums text-orange-400 flex items-center justify-center gap-1">
                    {donationStreak > 0 ? <><Flame className="w-3.5 h-3.5 text-orange-400" />{donationStreak}</> : <span className="text-gray-600">—</span>}
                  </p>
                  <p className="text-[9px] text-gray-600">Monate</p>
                </div>

                {/* Münzen */}
                <div className="text-center">
                  <p className="text-sm font-bold tabular-nums text-gray-300">
                    {u.points.toLocaleString("de-DE")}
                  </p>
                  <p className="text-[9px] text-gray-600">Münzen</p>
                </div>

                {/* Punkte */}
                <div className="text-center">
                  <p className="text-sm font-black tabular-nums text-amber-400">
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
