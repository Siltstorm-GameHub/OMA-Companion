import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";
import { Trophy, CalendarDays, ChevronRight, Flame, Star, Crown, Gamepad2, History, Zap, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { CountUp } from "@/components/CountUp";
import { AvatarStack } from "@/components/AvatarStack";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";
import GameCover from "@/components/GameCover";

const STATUS_LABEL: Record<string, { label: string; cls: string; dot: string; bar: string }> = {
  upcoming: { label: "Geplant",  cls: "text-blue-300 bg-blue-500/10 border border-blue-500/15",    dot: "bg-blue-400",   bar: "bg-blue-500/20" },
  active:   { label: "Läuft",   cls: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/15", dot: "bg-emerald-400 animate-pulse", bar: "bg-emerald-500/20" },
  finished: { label: "Beendet", cls: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",   dot: "bg-gray-600",   bar: "bg-white/[0.04]" },
};

const MEDAL = ["🥇", "🥈", "🥉"];

async function fetchSeasons() {
  return prisma.lulSeason.findMany({
    orderBy: { number: "desc" },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
        },
      },
    },
  });
}

type Seasons = Awaited<ReturnType<typeof fetchSeasons>>;
type Season  = Seasons[number];

export default async function LulOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  let seasons: Seasons = [];
  try { seasons = await fetchSeasons(); } catch (err) { console.error("[LUL]", err); }

  const activeSeason: Season | null = seasons.find((s) => s.status === "active") ?? seasons[0] ?? null;

  const activeEntries = activeSeason?.spieltage
    .filter((st) => st.status === "finished")
    .flatMap((st) => st.entries) ?? [];

  const allActiveEntries = activeSeason?.spieltage.flatMap((st) => st.entries) ?? [];

  const hasUnfinishedSpieltage = activeSeason?.spieltage.some((st) => st.status !== "finished") ?? false;
  const standings    = buildLulStandings(allActiveEntries);
  const myRank       = standings.findIndex((s) => s.userId === userId) + 1;
  const myPoints     = standings.find((s) => s.userId === userId)?.totalPts ?? 0;
  const nextSpieltag = activeSeason?.spieltage.find((st) => st.status !== "finished") ?? null;

  const finishedCount = activeSeason?.spieltage.filter(s => s.status === "finished").length ?? 0;
  const participantCount = new Set(allActiveEntries.map(e => e.userId)).size;

  return (
    <div className="px-4 pb-4 pt-3 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">

      {/* ── Hero Banner ────────────────────────────────────────────── */}
      {activeSeason && (
        <div className="glass card-shine rounded-2xl p-4 sm:p-6 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/6 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-xs text-amber-400/70 font-medium uppercase tracking-widest">Level-Up-League</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-4">
              {activeSeason.name ?? `Saison ${activeSeason.number}`}
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Gamepad2,  val: `${finishedCount}/${activeSeason.totalSpieltage}`, label: "Spieltage",   color: "text-amber-400" },
                { icon: Users,     val: participantCount,                                  label: "Teilnehmer",  color: "text-blue-400" },
                { icon: Flame,     val: <CountUp to={myPoints} duration={900} />,          label: "Meine Punkte", color: "text-rose-400" },
                ...(myRank > 0
                  ? [{ icon: Crown, val: `#${myRank}`, label: "Mein Rang", color: "text-purple-400" }]
                  : [{ icon: Star,  val: "–",          label: "Mein Rang", color: "text-gray-500" }]),
              ].map(({ icon: Icon, val, label, color }) => (
                <div key={label} className="glass-heavy rounded-xl p-3 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                  <p className="text-lg font-bold text-white tabular-nums leading-none">{val as React.ReactNode}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Punktesystem ───────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Punktesystem
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { emoji: "🎮", label: "Teilnahme",       pts: LUL_POINTS.GAME,            who: "Alle" },
            { emoji: "🏆", label: "Game Winner",      pts: LUL_POINTS.GAME_WINNER,     who: "Mitspieler" },
            { emoji: "👑", label: "Community-Champ",  pts: LUL_POINTS.COMMUNITY_CHAMP, who: "Zuschauer" },
            { emoji: "🎁", label: "Trostpreis",       pts: LUL_POINTS.TROSTPREIS,      who: "Mitspieler" },
            { emoji: "✅", label: "Vote",              pts: LUL_POINTS.VOTE,            who: "Alle" },
            { emoji: "🔥", label: "Dominion Bonus",   pts: LUL_POINTS.DOMINION,        who: "3 Siege in Folge" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-3 glass-heavy rounded-xl px-3 py-2.5">
              <span className="text-xl shrink-0">{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white leading-tight">{p.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{p.who}</p>
              </div>
              <span className="ml-auto text-sm font-bold text-amber-400 shrink-0">+{p.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {activeSeason && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Spieltage ─────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5" /> Spieltage
            </h2>
            <div className="space-y-2">
              {activeSeason.spieltage.map((st) => {
                const s = STATUS_LABEL[st.status] ?? STATUS_LABEL.upcoming;
                const isNext   = nextSpieltag?.id === st.id;
                const isActive = st.status === "active";
                const allParticipants = st.entries.map(e => e.user);
                const stripeColor = isActive
                  ? "bg-emerald-400"
                  : st.status === "upcoming"
                  ? "bg-blue-400"
                  : "bg-gray-600";
                return (
                  <Link key={st.id} href={`/lul/spieltag/${st.id}`}
                    className={`card-hover flex items-center gap-3 glass rounded-xl pl-3 pr-4 py-3 relative overflow-hidden ${
                      isNext ? "ring-1 ring-amber-500/20" : ""
                    }`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${stripeColor} rounded-l-xl`} />
                    {isNext  && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5   to-transparent pointer-events-none" />}
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />}
                    <div className="relative shrink-0 ml-1">
                      <GameCover game={st.game} className="w-14 h-9" rounded="rounded-lg" />
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ring-1 ring-black ${
                        st.status === "finished" ? "bg-gray-700 text-gray-400" :
                        isNext   ? "bg-amber-500   text-black" :
                        isActive ? "bg-emerald-500 text-black" :
                        "bg-gray-800 text-gray-500"
                      }`}>
                        {st.number}
                      </span>
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{st.game}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {st.scheduledAt && (
                          <p className="text-[10px] text-gray-500">
                            {new Date(st.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
                            {" · "}
                            {new Date(st.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                          </p>
                        )}
                        {allParticipants.length > 0 && (
                          <AvatarStack users={allParticipants} max={4} size="xs" />
                        )}
                      </div>
                    </div>
                    <div className="relative flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Kompakte Tabelle ──────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Aktueller Stand
              {hasUnfinishedSpieltage && standings.length > 0 && (
                <span className="text-yellow-500/70 font-normal normal-case tracking-normal text-[10px]">(vorläufig)</span>
              )}
            </h2>

            {standings.length > 0 ? (
              <div className="glass rounded-2xl overflow-hidden flex-1">
                <div className="divide-y divide-white/[0.04]">
                  {standings.map((s, i) => {
                    const isMe = s.userId === userId;
                    return (
                      <div key={s.userId}
                        className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? "bg-amber-500/[0.06]" : "hover:bg-white/[0.02]"} transition-colors`}>
                        {/* Rang */}
                        <span className="w-6 text-center shrink-0">
                          {i < 3
                            ? <span className="text-sm">{MEDAL[i]}</span>
                            : <span className="text-xs text-gray-600 tabular-nums">{i + 1}</span>}
                        </span>
                        {/* Avatar */}
                        {s.image ? (
                          <img src={s.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/[0.08] shrink-0 object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                            {s.name[0]?.toUpperCase()}
                          </div>
                        )}
                        {/* Name */}
                        <span className={`flex-1 min-w-0 text-sm font-medium truncate ${isMe ? "text-amber-300" : "text-white"}`}>
                          {s.name}
                          {isMe && <span className="text-gray-500 font-normal text-xs ml-1.5">du</span>}
                        </span>
                        {/* Punkte */}
                        <span className="text-sm font-bold text-amber-400 tabular-nums shrink-0">
                          {s.totalPts}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl px-4 py-8 text-center text-sm text-gray-600">
                Noch keine Ergebnisse
              </div>
            )}

            {/* Zur Saison-Übersicht */}
            <Link href={`/lul/${activeSeason.id}`}
              className="card-hover flex items-center gap-3 glass rounded-xl px-4 py-3 group">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors truncate">
                  {activeSeason.name ?? `Saison ${activeSeason.number}`}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Vollständige Saison-Übersicht</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 transition-colors shrink-0" />
            </Link>
          </div>

        </div>
      )}

      {/* ── Alle Saisons ───────────────────────────────────────────── */}
      {seasons.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" /> Alle Saisons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seasons.map((season) => {
              const s = STATUS_LABEL[season.status] ?? STATUS_LABEL.finished;
              const finished = season.spieltage.filter((st) => st.status === "finished").length;
              return (
                <Link key={season.id} href={`/lul/${season.id}`}
                  className="card-hover glass rounded-xl p-4 flex items-center gap-3 group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    season.isLegacy ? "bg-purple-500/10 border border-purple-500/15" : "bg-amber-500/10 border border-amber-500/15"
                  }`}>
                    {season.isLegacy
                      ? <History className="w-4 h-4 text-purple-400" />
                      : <Trophy className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white group-hover:text-rose-200 transition-colors">
                      {season.name ?? `Saison ${season.number}`}
                    </p>
                    {season.period && <p className="text-xs text-gray-500">{season.period}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">
                      {season.isLegacy ? "Legacy-Import" : `${finished}/${season.totalSpieltage} Spieltage`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0 group-hover:text-rose-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── All-Time Link ──────────────────────────────────────────── */}
      <Link href="/lul/alltime"
        className="card-hover flex items-center gap-4 glass rounded-2xl px-5 py-4 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent pointer-events-none" />
        <div className="relative w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
          <History className="w-5 h-5 text-purple-400" />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-purple-200 transition-colors">All-Time Rangliste</p>
          <p className="text-xs text-gray-500 mt-0.5">Gesamtstatistiken über alle Saisons</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors shrink-0" />
      </Link>

      {seasons.length === 0 && (
        <EmptyState
          type="tournaments"
          title="Noch keine Liga-Saison"
          description="Ein Admin legt die erste Saison im Admin-Bereich an."
          action={{ label: "Zum Admin-Bereich", href: "/admin/lul" }}
        />
      )}
    </div>
  );
}
