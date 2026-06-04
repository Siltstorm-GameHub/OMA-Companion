import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, CalendarDays, Users, Flame, ChevronDown } from "lucide-react";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_LABEL: Record<string, { label: string; cls: string; dot: string }> = {
  upcoming: { label: "Geplant",  cls: "bg-blue-900/40 text-blue-300",   dot: "bg-blue-400" },
  active:   { label: "Läuft",   cls: "bg-green-900/40 text-green-300", dot: "bg-green-400 animate-pulse" },
  finished: { label: "Beendet", cls: "bg-gray-800 text-gray-500",      dot: "bg-gray-600" },
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long" });
}
function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default async function LulSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { id } = await params;

  const season = await prisma.lulSeason.findUnique({
    where: { id },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
            orderBy: { placement: "asc" },
          },
        },
      },
    },
  });
  if (!season) notFound();

  const finishedSpieltage = season.spieltage.filter((st) => st.status === "finished");
  const allEntries = finishedSpieltage.flatMap((st) => st.entries);
  const standings = buildLulStandings(allEntries);
  const myRow = standings.find((s) => s.userId === userId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/lul" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-2 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
      </Link>

      {/* ── Season Header ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-950/50 to-gray-900 border border-amber-800/20 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">
              {season.name ?? `Level-Up-League – Saison ${season.number}`}
            </h1>
            {season.period && <p className="text-sm text-gray-400 mt-0.5">{season.period}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_LABEL[season.status]?.dot ?? "bg-gray-600"}`} />
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_LABEL[season.status]?.cls ?? ""}`}>
              {STATUS_LABEL[season.status]?.label ?? season.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{finishedSpieltage.length}/{season.totalSpieltage}</p>
            <p className="text-xs text-gray-500 mt-0.5">Spieltage gespielt</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{new Set(allEntries.map(e=>e.userId)).size}</p>
            <p className="text-xs text-gray-500 mt-0.5">Teilnehmer</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-amber-400">{myRow?.totalPts ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Meine Punkte</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Tabelle ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Saison-Tabelle
          </h2>
          {standings.length === 0 ? (
            <div className="bg-gray-900 border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
              Noch keine abgeschlossenen Spieltage.
            </div>
          ) : (
            <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Spieler</th>
                    <th className="text-center px-2 py-2.5 font-medium" title="Spieltage">Sp</th>
                    <th className="text-center px-2 py-2.5 font-medium" title="Game Wins">🏆</th>
                    <th className="text-center px-2 py-2.5 font-medium" title="Community-Champ">👑</th>
                    <th className="text-center px-2 py-2.5 font-medium" title="Trostpreis">🎁</th>
                    <th className="text-center px-2 py-2.5 font-medium" title="Dominion Bonus">🔥</th>
                    <th className="text-right px-4 py-2.5 font-medium">Pkt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standings.map((s, i) => {
                    const isMe = s.userId === userId;
                    return (
                      <tr key={s.userId} className={`transition-colors ${isMe ? "bg-amber-950/25" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-3 text-center">
                          {i < 3
                            ? <span className="text-base">{MEDAL[i]}</span>
                            : <span className="text-gray-600 text-sm">{i + 1}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.image
                              ? <img src={s.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                              : <div className="w-6 h-6 rounded-full bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">{s.name[0]?.toUpperCase()}</div>
                            }
                            <span className={`font-medium truncate max-w-[100px] ${isMe ? "text-amber-300" : "text-white"}`}>
                              {s.name}{isMe && " (du)"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-500 tabular-nums text-xs">{s.games}</td>
                        <td className="px-2 py-3 text-center tabular-nums text-xs">
                          <span className={s.wins > 0 ? "text-amber-400 font-semibold" : "text-gray-700"}>{s.wins}</span>
                        </td>
                        <td className="px-2 py-3 text-center tabular-nums text-xs">
                          <span className={s.champs > 0 ? "text-purple-400 font-semibold" : "text-gray-700"}>{s.champs}</span>
                        </td>
                        <td className="px-2 py-3 text-center tabular-nums text-xs">
                          <span className={s.trost > 0 ? "text-rose-400 font-semibold" : "text-gray-700"}>{s.trost}</span>
                        </td>
                        <td className="px-2 py-3 text-center tabular-nums text-xs">
                          <span className={s.dominion > 0 ? "text-orange-400 font-semibold" : "text-gray-700"}>{s.dominion > 0 ? "🔥" : "–"}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white text-base tabular-nums">{s.totalPts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-white/5 text-[10px] text-gray-700">
                Teilnahme +{LUL_POINTS.GAME} · Sieg +{LUL_POINTS.GAME_WINNER} · Champ +{LUL_POINTS.COMMUNITY_CHAMP} · Trost +{LUL_POINTS.TROSTPREIS} · Vote +{LUL_POINTS.VOTE} · Dominion +{LUL_POINTS.DOMINION}
              </div>
            </div>
          )}
        </div>

        {/* ── Spieltage Sidebar ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" /> Spielplan
          </h2>
          {season.spieltage.map((st) => {
            const s = STATUS_LABEL[st.status] ?? STATUS_LABEL.upcoming;
            const players = st.entries.filter(e => e.role === "player");
            const winner  = players.find(e => e.gameWinner);
            const champ   = st.entries.find(e => e.communityChamp);
            const playedEntries = st.entries.filter(e => e.role === "player" && e.placement != null).sort((a,b) => (a.placement??99)-(b.placement??99));

            return (
              <div key={st.id} className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    st.status === "finished" ? "bg-amber-900/40 text-amber-300" : "bg-gray-800 text-gray-500"
                  }`}>
                    {st.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{st.game}</p>
                    {st.scheduledAt && (
                      <p className="text-[10px] text-gray-500">
                        {fmtDate(st.scheduledAt)} · {fmtTime(st.scheduledAt)} Uhr
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  </div>
                </div>

                {st.status === "finished" && (
                  <div className="border-t border-white/5 px-4 py-3 space-y-2">
                    {winner && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏆</span>
                        <span className="text-xs text-gray-400">Game Winner:</span>
                        <span className="text-xs font-semibold text-amber-300">{winner.user.username ?? winner.user.name}</span>
                      </div>
                    )}
                    {champ && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">👑</span>
                        <span className="text-xs text-gray-400">Community-Champ:</span>
                        <span className="text-xs font-semibold text-purple-300">{champ.user.username ?? champ.user.name}</span>
                      </div>
                    )}
                    {playedEntries.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">Top 3</p>
                        <div className="space-y-1">
                          {playedEntries.slice(0, 3).map((e, i) => (
                            <div key={e.id} className="flex items-center gap-2">
                              <span className="text-sm">{MEDAL[i]}</span>
                              <span className="text-xs text-white">{e.user.username ?? e.user.name}</span>
                              <span className="ml-auto text-xs text-gray-500 tabular-nums">{e.totalGameScore} Pkt</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
