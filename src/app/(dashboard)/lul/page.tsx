import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, CalendarDays, ChevronRight, Flame, Star, Crown, Gamepad2, History, Zap, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";

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

  const standings    = buildLulStandings(activeEntries);
  const myRank       = standings.findIndex((s) => s.userId === userId) + 1;
  const myPoints     = standings.find((s) => s.userId === userId)?.totalPts ?? 0;
  const nextSpieltag = activeSeason?.spieltage.find((st) => st.status !== "finished") ?? null;

  const finishedCount = activeSeason?.spieltage.filter(s => s.status === "finished").length ?? 0;
  const participantCount = new Set(allActiveEntries.map(e => e.userId)).size;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">

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
                { icon: Flame,     val: myPoints,                                          label: "Meine Punkte", color: "text-rose-400" },
                ...(myRank > 0
                  ? [{ icon: Crown, val: `#${myRank}`, label: "Mein Rang", color: "text-purple-400" }]
                  : [{ icon: Star,  val: "–",          label: "Mein Rang", color: "text-gray-500" }]),
              ].map(({ icon: Icon, val, label, color }) => (
                <div key={label} className="glass-heavy rounded-xl p-3 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                  <p className="text-lg font-bold text-white tabular-nums leading-none">{val}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Tabelle ─────────────────────────────────────────────── */}
        {activeSeason && standings.length > 0 && (
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {activeSeason.name ?? `Saison ${activeSeason.number}`} – Tabelle
              </h2>
              <Link href={`/lul/${activeSeason.id}`}
                className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                Details <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead>
                  <tr className="border-b border-white/[0.05] text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-3 py-3 font-medium">#</th>
                    <th className="text-left px-3 py-3 font-medium">Spieler</th>
                    <th className="text-center px-2 py-3 font-medium">Sp</th>
                    <th className="text-center px-2 py-3 font-medium">🏆</th>
                    <th className="text-center px-2 py-3 font-medium">👑</th>
                    <th className="text-right px-3 py-3 font-medium">Pkt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {standings.map((s, i) => {
                    const isMe = s.userId === userId;
                    return (
                      <tr key={s.userId} className={`transition-colors ${isMe ? "bg-amber-500/[0.06]" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {i < 3
                            ? <span className="text-base">{MEDAL[i]}</span>
                            : <span className="text-sm text-gray-600">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.image ? (
                              <img src={s.image} alt="" className="w-6 h-6 rounded-full ring-1 ring-white/[0.08] shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                                {s.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className={`font-medium truncate max-w-[120px] ${isMe ? "text-amber-300" : "text-white"}`}>
                              {s.name}{isMe && <span className="text-gray-500 font-normal text-xs ml-1">du</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-500 tabular-nums text-xs">{s.asPlayer + s.asSpectator}</td>
                        <td className="px-2 py-3 text-center text-amber-400 font-semibold tabular-nums text-xs">{s.wins}</td>
                        <td className="px-2 py-3 text-center text-purple-400 font-semibold tabular-nums text-xs">{s.champs}</td>
                        <td className="px-4 py-3 text-right font-bold text-white tabular-nums">{s.totalPts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Spieltage ───────────────────────────────────────────── */}
        {activeSeason && (
          <div className="lg:col-span-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5" /> Spieltage
            </h2>
            <div className="space-y-2">
              {activeSeason.spieltage.map((st) => {
                const s = STATUS_LABEL[st.status] ?? STATUS_LABEL.upcoming;
                const isNext = nextSpieltag?.id === st.id;
                return (
                  <Link key={st.id} href={`/lul/spieltag/${st.id}`}
                    className={`card-hover flex items-center gap-3 glass rounded-xl px-4 py-3 relative overflow-hidden ${
                      isNext ? "ring-1 ring-amber-500/20" : ""
                    }`}>
                    {isNext && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />}
                    <div className={`relative w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      st.status === "finished" ? "bg-white/[0.05] text-gray-500" :
                      isNext ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20" :
                      "bg-white/[0.04] text-gray-600"
                    }`}>
                      {st.number}
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{st.game}</p>
                      {st.scheduledAt && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {new Date(st.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
                          {" · "}
                          {new Date(st.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                        </p>
                      )}
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
        )}
      </div>

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
        />
      )}
    </div>
  );
}
