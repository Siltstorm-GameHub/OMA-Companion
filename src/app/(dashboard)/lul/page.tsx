import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, CalendarDays, ChevronRight, Flame, Star, Crown, Gamepad2, History } from "lucide-react";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";

const STATUS_LABEL: Record<string, { label: string; cls: string; dot: string }> = {
  upcoming: { label: "Geplant",  cls: "bg-blue-900/50 text-blue-300",   dot: "bg-blue-400" },
  active:   { label: "Läuft",   cls: "bg-green-900/50 text-green-300", dot: "bg-green-400 animate-pulse" },
  finished: { label: "Beendet", cls: "bg-gray-800 text-gray-500",      dot: "bg-gray-600" },
};

const MEDAL = ["🥇", "🥈", "🥉"];

// Helper to get the full query type with includes
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
  try {
    seasons = await fetchSeasons();
  } catch (err) {
    console.error("[LUL] Datenbankfehler:", err);
  }

  const activeSeason: Season | null = seasons.find((s) => s.status === "active") ?? seasons[0] ?? null;

  const activeEntries = activeSeason?.spieltage
    .filter((st) => st.status === "finished")
    .flatMap((st) => st.entries) ?? [];

  const standings  = buildLulStandings(activeEntries);
  const myRank     = standings.findIndex((s) => s.userId === userId) + 1;
  const myPoints   = standings.find((s) => s.userId === userId)?.totalPts ?? 0;
  const nextSpieltag = activeSeason?.spieltage.find((st) => st.status !== "finished") ?? null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-950/60 to-rose-950/60 border border-amber-800/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Level-Up-League</h1>
        </div>
        <p className="text-sm text-gray-400 ml-9">
          Die Community-Liga — jeden Monat ein neues Spiel, am Ende gewinnt wer die meisten Punkte gesammelt hat.
        </p>

        {activeSeason && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-white">
                {activeSeason.spieltage.filter((s) => s.status === "finished").length}/{activeSeason.totalSpieltage}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Spieltage</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-white">
                {new Set(activeEntries.map((e) => e.userId)).size}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Teilnehmer</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <Flame className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-white">{myPoints}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Meine Punkte</p>
            </div>
            {myRank > 0 && (
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <Crown className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <p className="text-lg font-bold text-white">#{myRank}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mein Rang</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Punktesystem Info ────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Punktesystem</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: "🎮", label: "Teilnahme",       pts: LUL_POINTS.GAME,            who: "Alle" },
            { emoji: "🏆", label: "Game Winner",      pts: LUL_POINTS.GAME_WINNER,     who: "Mitspieler" },
            { emoji: "👑", label: "Community-Champ",  pts: LUL_POINTS.COMMUNITY_CHAMP, who: "Zuschauer" },
            { emoji: "🎁", label: "Trostpreis",       pts: LUL_POINTS.TROSTPREIS,      who: "Mitspieler" },
            { emoji: "✅", label: "Vote",              pts: LUL_POINTS.VOTE,            who: "Alle" },
            { emoji: "🔥", label: "Dominion Bonus",   pts: LUL_POINTS.DOMINION,        who: "3 Siege in Folge" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-3 py-2.5">
              <span className="text-xl shrink-0">{p.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-[10px] text-gray-500">{p.who}</p>
              </div>
              <span className="ml-auto text-sm font-bold text-amber-400 shrink-0">+{p.pts}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Tabelle ─────────────────────────────────────────────────── */}
        {activeSeason && standings.length > 0 && (
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {activeSeason.name ?? `Saison ${activeSeason.number}`} – Tabelle
              </h2>
              <Link href={`/lul/${activeSeason.id}`}
                className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                Alle Details <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Spieler</th>
                    <th className="text-center px-2 py-2.5 font-medium">Sp</th>
                    <th className="text-center px-2 py-2.5 font-medium">🏆</th>
                    <th className="text-center px-2 py-2.5 font-medium">👑</th>
                    <th className="text-right px-4 py-2.5 font-medium">Pkt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standings.map((s, i) => {
                    const isMe = s.userId === userId;
                    return (
                      <tr key={s.userId} className={`transition-colors ${isMe ? "bg-amber-950/30" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {i < 3
                            ? <span className="text-base">{MEDAL[i]}</span>
                            : <span className="text-sm text-gray-600">{i + 1}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.image ? (
                              <img src={s.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                                {s.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className={`font-medium truncate max-w-[120px] ${isMe ? "text-amber-300" : "text-white"}`}>
                              {s.name}{isMe && " (du)"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-500 tabular-nums text-xs">{s.asPlayer + s.asSpectator}</td>
                        <td className="px-2 py-3 text-center text-amber-400 font-semibold tabular-nums text-xs">{s.wins}</td>
                        <td className="px-2 py-3 text-center text-purple-400 font-semibold tabular-nums text-xs">{s.champs}</td>
                        <td className="px-4 py-3 text-right font-bold text-white text-base tabular-nums">{s.totalPts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Spieltage ───────────────────────────────────────────────── */}
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
                  <Link key={st.id} href={`/lul/${activeSeason.id}`}
                    className={`flex items-center gap-3 bg-gray-900 border rounded-xl px-4 py-3 transition-colors hover:bg-gray-800/60 ${
                      isNext ? "border-amber-800/40" : "border-white/5"
                    }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      st.status === "finished" ? "bg-gray-800 text-gray-500" :
                      isNext                   ? "bg-amber-900/50 text-amber-300" :
                                                 "bg-gray-800 text-gray-600"
                    }`}>
                      {st.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{st.game}</p>
                      {st.scheduledAt && (
                        <p className="text-[10px] text-gray-500">
                          {new Date(st.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
                          {" · "}
                          {new Date(st.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Alle Saisons ────────────────────────────────────────────── */}
      {seasons.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Alle Saisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seasons.map((season) => {
              const s = STATUS_LABEL[season.status] ?? STATUS_LABEL.finished;
              const finishedCount = season.spieltage.filter((st) => st.status === "finished").length;
              return (
                <Link key={season.id} href={`/lul/${season.id}`}
                  className="bg-gray-900 border border-white/5 rounded-xl p-4 hover:bg-gray-800/60 transition-colors flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{season.name ?? `Saison ${season.number}`}</p>
                    {season.period && <p className="text-xs text-gray-500">{season.period}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">{finishedCount}/{season.totalSpieltage} Spieltage</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className={`text-xs ${s.cls} px-2 py-0.5 rounded-full`}>{s.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* All-Time Link */}
      <Link href="/lul/alltime"
        className="flex items-center gap-3 rounded-xl px-4 py-3 border border-purple-800/30 bg-purple-950/20 hover:bg-purple-950/40 transition-colors group">
        <History className="w-5 h-5 text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">All-Time Rangliste</p>
          <p className="text-xs text-gray-500">Gesamtstatistiken über alle Saisons</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
      </Link>

      {seasons.length === 0 && (
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-12 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 font-medium">Noch keine Liga-Saison angelegt.</p>
          <p className="text-gray-600 text-sm mt-1">Ein Admin erstellt die Saison im Admin-Bereich.</p>
        </div>
      )}
    </div>
  );
}
