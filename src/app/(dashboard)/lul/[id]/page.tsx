import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Gamepad2, Eye, Crown, Gift, Flame, CheckCircle2,
  CalendarDays, AlertTriangle, Users, Swords,
} from "lucide-react";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";

const MEDAL      = ["🥇", "🥈", "🥉"];
const MEDAL_BG   = ["rgba(251,191,36,0.12)", "rgba(156,163,175,0.1)", "rgba(180,83,9,0.12)"];
const MEDAL_RING = ["ring-amber-400/30", "ring-gray-400/20", "ring-amber-700/30"];

const COLS = [
  { key: "asPlayer",    label: "Mitspieler", Icon: Gamepad2,     cls: "text-teal-400",    bg: "bg-teal-500/10"    },
  { key: "asSpectator", label: "Zuschauer",  Icon: Eye,          cls: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  { key: "wins",        label: "Siege",      Icon: Trophy,       cls: "text-amber-400",   bg: "bg-amber-500/10"   },
  { key: "champs",      label: "Champ",      Icon: Crown,        cls: "text-rose-400",    bg: "bg-rose-500/10"    },
  { key: "trost",       label: "Trost",      Icon: Gift,         cls: "text-orange-400",  bg: "bg-orange-500/10"  },
  { key: "dominion",    label: "Dominion",   Icon: Flame,        cls: "text-orange-500",  bg: "bg-orange-600/10"  },
  { key: "votes",       label: "Votes",      Icon: CheckCircle2, cls: "text-emerald-400", bg: "bg-emerald-500/10" },
] as const;

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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight truncate">
                        Spieltag {st.number} – {st.game}
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest w-10">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Spieler</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "#14b8a6" }}>Gesamt</th>
                      {COLS.map((col) => (
                        <th
                          key={col.key}
                          className="text-center px-2 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          <col.Icon className="w-3.5 h-3.5 inline-block mr-1 align-middle" />
                          <span className="hidden sm:inline align-middle">{col.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => {
                      const isMe   = s.userId === userId;
                      const isTop3 = i < 3 && s.totalPts > 0;
                      return (
                        <tr
                          key={s.userId}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.035)",
                            background: isMe ? "rgba(20,184,166,0.05)" : undefined,
                          }}
                          className={`transition-colors hover:bg-white/[0.015] ${
                            isMe ? "ring-1 ring-inset ring-teal-400/15" : ""
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            {isTop3 ? (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ring-1 ${MEDAL_RING[i]}`}
                                style={{ background: MEDAL_BG[i] }}
                              >
                                {MEDAL[i]}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-gray-600">{i + 1}</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {s.image ? (
                                <img
                                  src={s.image}
                                  alt=""
                                  className={`w-8 h-8 rounded-full shrink-0 ring-1 ${
                                    isMe ? "ring-teal-400/50" : "ring-white/10"
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                                    isMe
                                      ? "ring-teal-400/30"
                                      : "bg-white/[0.06] text-gray-400 ring-white/5"
                                  }`}
                                  style={isMe ? { background: "rgba(20,184,166,0.15)", color: "#2dd4bf" } : {}}
                                >
                                  {s.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <p
                                className={`font-semibold leading-tight ${
                                  isMe ? "text-teal-300" : "text-white"
                                }`}
                              >
                                {s.name}
                                {isMe && (
                                  <span className="text-[10px] font-normal text-teal-600 ml-1.5">(du)</span>
                                )}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span
                              className={`text-lg font-bold tabular-nums ${
                                i === 0 ? "text-amber-400" : isMe ? "text-teal-300" : "text-white"
                              }`}
                            >
                              {s.totalPts}
                            </span>
                            <p className="text-[9px] text-gray-600">Pkt</p>
                          </td>

                          {COLS.map((col) => {
                            const val = s[col.key as keyof typeof s] as number;
                            return (
                              <td key={col.key} className="px-2 py-3 text-center">
                                {val > 0 ? (
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md text-xs font-bold tabular-nums ${col.cls} ${col.bg}`}
                                  >
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
