import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, History, Gamepad2, Eye, Crown, Gift, Flame, CheckCircle2 } from "lucide-react";
import { buildLulStandings, mergeStandings, LUL_POINTS } from "@/lib/lul";

const MEDAL      = ["🥇", "🥈", "🥉"];
const MEDAL_BG   = ["rgba(251,191,36,0.12)", "rgba(156,163,175,0.1)", "rgba(180,83,9,0.12)"];
const MEDAL_RING = ["ring-amber-400/30", "ring-gray-400/20", "ring-amber-700/30"];

const COLS = [
  { key: "asPlayer",    label: "Spieler",   Icon: Gamepad2,    cls: "text-blue-400",    bg: "bg-blue-500/10"    },
  { key: "asSpectator", label: "Zuschauer", Icon: Eye,         cls: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  { key: "wins",        label: "Siege",     Icon: Trophy,      cls: "text-amber-400",   bg: "bg-amber-500/10"   },
  { key: "champs",      label: "Champ",     Icon: Crown,       cls: "text-purple-400",  bg: "bg-purple-500/10"  },
  { key: "trost",       label: "Trost",     Icon: Gift,        cls: "text-rose-400",    bg: "bg-rose-500/10"    },
  { key: "dominion",    label: "Dominion",  Icon: Flame,       cls: "text-orange-400",  bg: "bg-orange-500/10"  },
  { key: "votes",       label: "Votes",     Icon: CheckCircle2,cls: "text-emerald-400", bg: "bg-emerald-500/10" },
] as const;

function uname(u: { name: string | null; username: string | null }) {
  return u.username ?? u.name ?? "Unbekannt";
}

export default async function LulAllTimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [regularEntries, legacyEntries, seasons] = await Promise.all([
    // Regular entries from finished spieltage
    prisma.lulEntry.findMany({
      where: { spieltag: { status: "finished" } },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    }),
    // Legacy entries (whole-season aggregates)
    prisma.lulLegacyEntry.findMany({
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    }),
    prisma.lulSeason.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, name: true, status: true, isLegacy: true },
    }),
  ]);

  const regularStandings = buildLulStandings(regularEntries);
  const legacyStandings  = legacyEntries.map(e => ({
    userId:      e.userId,
    name:        e.user.username ?? e.user.name ?? "Unbekannt",
    image:       e.user.image,
    totalPts:    e.totalPts,
    asPlayer:    e.asPlayer,
    asSpectator: e.asSpectator,
    wins:        e.wins,
    champs:      e.champs,
    trost:       e.trost,
    dominion:    e.dominion,
    votes:       e.votes,
  }));
  const standings = mergeStandings(regularStandings, legacyStandings);
  const myRow     = standings.find(s => s.userId === userId);
  const myRank    = standings.findIndex(s => s.userId === userId) + 1;

  const finishedSeasons  = seasons.filter(s => s.status === "finished" || s.status === "archived");
  const legacySeasonIds  = new Set(legacyEntries.map(e => e.seasonId));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <Link href="/lul" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-950/50 to-gray-900 border border-purple-800/20 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-1">
          <History className="w-6 h-6 text-purple-400" />
          <h1 className="text-xl font-bold text-white">All-Time Rangliste</h1>
        </div>
        <p className="text-sm text-gray-400 ml-9">
          Gesamtstatistiken über alle Saisons der Level-Up-League.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{finishedSeasons.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Saisons</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{standings.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Spieler</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-purple-400">{myRow?.totalPts ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Meine Punkte</p>
          </div>
          {myRank > 0 && (
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-white">#{myRank}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mein Rang</p>
            </div>
          )}
        </div>

        {/* Season links */}
        {finishedSeasons.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-600">Enthaltene Saisons:</span>
            {finishedSeasons.map(s => (
              <Link key={s.id} href={`/lul/${s.id}`}
                className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-800/30 hover:bg-purple-900/50 transition-colors">
                {s.name ?? `Saison ${s.number}`}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-purple-400" /> All-Time Tabelle
        </h2>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(12,12,20,0.95)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-purple-600 uppercase tracking-widest whitespace-nowrap">Gesamt</th>
                  {COLS.map(col => (
                    <th key={col.key}
                      className="text-center px-2 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "rgba(255,255,255,0.3)" }}>
                      <col.Icon className="w-3.5 h-3.5 inline-block mr-1 align-middle" />
                      <span className="hidden sm:inline align-middle">{col.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-600 text-sm">
                      Noch keine abgeschlossenen Saisons.
                    </td>
                  </tr>
                )}
                {standings.map((s, i) => {
                  const isMe   = s.userId === userId;
                  const isTop3 = i < 3 && s.totalPts > 0;
                  return (
                    <tr key={s.userId}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.035)",
                        background: isMe ? "rgba(168,85,247,0.05)" : undefined,
                      }}
                      className="transition-colors hover:bg-white/[0.015]">

                      <td className="px-4 py-3 text-center">
                        {isTop3 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ring-1 ${MEDAL_RING[i]}`}
                            style={{ background: MEDAL_BG[i] }}>
                            {MEDAL[i]}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {s.image ? (
                            <img src={s.image} alt=""
                              className={`w-8 h-8 rounded-full shrink-0 ring-1 ${isMe ? "ring-purple-400/50" : "ring-white/10"}`} />
                          ) : (
                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                              isMe ? "bg-purple-900/30 text-purple-300 ring-purple-400/30"
                                   : "bg-white/[0.06] text-gray-400 ring-white/5"
                            }`}>
                              {s.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className={`font-semibold leading-tight ${isMe ? "text-purple-300" : "text-white"}`}>
                              {s.name}
                              {isMe && <span className="text-[10px] font-normal text-purple-600 ml-1.5">(du)</span>}
                            </p>
                            {isTop3 && (
                              <p className="text-[10px] text-gray-600 leading-tight">
                                {i === 0 ? "🏆 Rekordhalter" : i === 1 ? "2. Platz" : "3. Platz"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className={`text-lg font-bold tabular-nums ${
                          i === 0 ? "text-amber-400" : isMe ? "text-purple-300" : "text-white"
                        }`}>
                          {s.totalPts}
                        </span>
                        <p className="text-[9px] text-gray-600">Pkt</p>
                      </td>

                      {COLS.map(col => {
                        const val = s[col.key as keyof typeof s] as number;
                        return (
                          <td key={col.key} className="px-2 py-3 text-center">
                            {val > 0 ? (
                              <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-bold tabular-nums ${col.cls} ${col.bg}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-gray-800 text-sm">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {[
              { icon: "🎮", label: "Mitspieler",     pts: `+${LUL_POINTS.GAME}` },
              { icon: "👁️", label: "Zuschauer",       pts: `+${LUL_POINTS.GAME}` },
              { icon: "🏆", label: "Game Winner",     pts: `+${LUL_POINTS.GAME_WINNER}` },
              { icon: "👑", label: "Community-Champ", pts: `+${LUL_POINTS.COMMUNITY_CHAMP}` },
              { icon: "🎁", label: "Trostpreis",      pts: `+${LUL_POINTS.TROSTPREIS}` },
              { icon: "🔥", label: "Dominion Bonus",  pts: `+${LUL_POINTS.DOMINION}` },
              { icon: "✅", label: "Vote",             pts: `+${LUL_POINTS.VOTE}` },
            ].map(item => (
              <span key={item.label} className="text-[10px] text-gray-700">
                {item.icon} <span className="text-gray-600">{item.label}</span>
                <span className="ml-1">{item.pts} Pkt</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
