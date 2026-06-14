import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Gamepad2, Eye,
  CalendarDays, AlertTriangle, Users, Swords,
} from "lucide-react";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";
import GameCover from "@/components/GameCover";
import SpieltagDetails from "./SpieltagDetails";
import LulStandingsTable from "../LulStandingsTable";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Geplant",
  active:   "Läuft",
  finished: "Abgeschlossen",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming: "text-gray-400 bg-white/5",
  active:   "text-amber-400 bg-amber-500/10",
  finished: "text-teal-400 bg-teal-500/10",
};

export default async function LulSeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const season = await prisma.lulSeason.findUnique({
    where: { id },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true } },
            },
            orderBy: { placement: "asc" },
          },
        },
      },
    },
  });

  if (!season) notFound();

  // Standings aus ALLEN Einträgen (auch nicht abgeschlossene Spieltage)
  const allEntries = season.spieltage.flatMap((st) => st.entries);
  const standings  = buildLulStandings(allEntries);

  const hasUnfinished = season.spieltage.some((st) => st.status !== "finished");
  const finishedCount = season.spieltage.filter((st) => st.status === "finished").length;

  const myRow  = standings.find((s) => s.userId === userId);
  const myRank = standings.findIndex((s) => s.userId === userId) + 1;

  const seasonLabel = season.name ?? `Saison ${season.number}`;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Link
        href="/lul"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
      </Link>

      {/* Header-Karte */}
      <div
        className="rounded-2xl p-4 sm:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(139,32,32,0.18) 0%, rgba(12,12,20,0.95) 60%)",
          border: "1px solid rgba(139,32,32,0.22)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Swords className="w-5 h-5" style={{ color: "#14b8a6" }} />
              <h1 className="text-xl font-bold text-white">Level-Up-League — {seasonLabel}</h1>
            </div>
            {season.period && (
              <p className="text-sm text-gray-400 ml-8">{season.period}</p>
            )}
          </div>
          <span
            className={`self-start shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              STATUS_COLOR[season.status] ?? "text-gray-400 bg-white/5"
            }`}
          >
            {STATUS_LABEL[season.status] ?? season.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{season.spieltage.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Spieltage</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{finishedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Abgeschlossen</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{standings.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Mitspieler</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold" style={{ color: "#14b8a6" }}>
              {myRow ? myRow.totalPts : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {myRow ? "Meine Punkte" : "Noch keine Punkte"}
            </p>
          </div>
        </div>
      </div>

      {/* "Nicht final"-Hinweis */}
      {hasUnfinished && standings.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.25)",
          }}
        >
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-300/80">
            Diese Tabelle enthält Ergebnisse noch nicht abgeschlossener Spieltage.
            Die Punkte sind vorläufig und können sich noch ändern.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Spieltage ─────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />
            Spieltage
          </h2>

          {season.spieltage.length === 0 ? (
            <p className="text-sm text-gray-600">Noch keine Spieltage geplant.</p>
          ) : (
            season.spieltage.map((st) => {
              const playerCount   = st.entries.filter((e) => e.role === "player").length;
              const spectatorCount = st.entries.filter((e) => e.role === "spectator").length;
              const isFinished     = st.status === "finished";
              const isActive       = st.status === "active";

              return (
                <Link
                  key={st.id}
                  href={`/lul/spieltag/${st.id}`}
                  className="block rounded-xl p-3.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: isActive
                      ? "rgba(234,179,8,0.07)"
                      : "rgba(255,255,255,0.03)",
                    border: isActive
                      ? "1px solid rgba(234,179,8,0.3)"
                      : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <GameCover game={st.game} className="w-16 h-10" rounded="rounded-lg" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center text-[9px] font-bold text-gray-400 ring-1 ring-white/10">
                        {st.number}
                      </span>
                    </div>
                  <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight truncate">
                        {st.game}
                      </p>
                      {st.scheduledAt && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {new Date(st.scheduledAt).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        STATUS_COLOR[st.status] ?? "text-gray-400 bg-white/5"
                      }`}
                    >
                      {STATUS_LABEL[st.status] ?? st.status}
                    </span>
                  </div>

                  {st.entries.length > 0 && (
                    <div className="flex items-center gap-3 mt-2">
                      {playerCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Gamepad2 className="w-3 h-3" /> {playerCount}
                        </span>
                      )}
                      {spectatorCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Eye className="w-3 h-3" /> {spectatorCount}
                        </span>
                      )}
                      {isFinished && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: "#14b8a6" }}>
                          <Trophy className="w-3 h-3" /> Abgeschlossen
                        </span>
                      )}
                    </div>
                  )}
                  </div>{/* flex-1 */}
                  </div>{/* flex items-start gap-3 */}
                  <SpieltagDetails
                    entries={st.entries}
                    tournamentFormat={st.tournamentFormat}
                    statFieldsJson={st.statFields}
                  />
                </Link>
              );
            })
          )}
        </div>

        {/* ── Saisonrangliste ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />
            Saisonrangliste {hasUnfinished && <span className="text-yellow-500 font-normal normal-case tracking-normal">(vorläufig)</span>}
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(12,12,20,0.95)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            {standings.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <Users className="w-8 h-8 text-gray-700" />
                <p className="text-sm text-gray-600">
                  Noch keine Ergebnisse für diese Saison.
                </p>
              </div>
            ) : (
              <LulStandingsTable
                standings={standings}
                userId={userId}
                variant="season"
              />
            )}

            {/* Legende */}
            <div
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5"
            >
              {[
                { icon: "🎮", label: "Mitspieler",     pts: `+${LUL_POINTS.GAME}` },
                { icon: "👁️", label: "Zuschauer",       pts: `+${LUL_POINTS.GAME}` },
                { icon: "🏆", label: "Game Winner",     pts: `+${LUL_POINTS.GAME_WINNER}` },
                { icon: "👑", label: "Community-Champ", pts: `+${LUL_POINTS.COMMUNITY_CHAMP}` },
                { icon: "🎁", label: "Trostpreis",      pts: `+${LUL_POINTS.TROSTPREIS}` },
                { icon: "🔥", label: "Dominion Bonus",  pts: `+${LUL_POINTS.DOMINION}` },
                { icon: "✅", label: "Vote",             pts: `+${LUL_POINTS.VOTE}` },
              ].map((item) => (
                <span key={item.label} className="text-[10px] text-gray-700">
                  {item.icon} <span className="text-gray-600">{item.label}</span>
                  <span className="ml-1">{item.pts} Pkt</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mein Rang (wenn eingeloggt und in Rangliste) */}
      {myRow && myRank > 0 && (
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: "rgba(20,184,166,0.06)",
            border: "1px solid rgba(20,184,166,0.18)",
          }}
        >
          <span className="text-2xl font-bold tabular-nums" style={{ color: "#14b8a6" }}>
            #{myRank}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Dein aktueller Rang</p>
            <p className="text-xs text-gray-500">
              {myRow.totalPts} Punkte · {myRow.asPlayer} Spieltage als Mitspieler
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
