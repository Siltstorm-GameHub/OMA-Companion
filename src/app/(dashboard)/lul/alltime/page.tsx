import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, History } from "lucide-react";
import { buildLulStandings, mergeStandings, LUL_POINTS } from "@/lib/lul";
import LulStandingsTable from "../LulStandingsTable";

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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
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
            <p className="text-xs text-gray-500 mt-0.5">Mitspieler</p>
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
          {standings.length === 0 ? (
            <p className="py-12 text-center text-gray-600 text-sm">
              Noch keine abgeschlossenen Saisons.
            </p>
          ) : (
            <LulStandingsTable
              standings={standings}
              userId={userId}
              variant="alltime"
            />
          )}

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
