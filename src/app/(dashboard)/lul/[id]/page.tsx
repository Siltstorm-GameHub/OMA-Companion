import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, CalendarDays } from "lucide-react";
import { buildLulStandings, LUL_POINTS } from "@/lib/lul";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_GLOW = [
  "shadow-[0_0_16px_rgba(251,191,36,0.3)]  ring-1 ring-amber-400/30",
  "shadow-[0_0_16px_rgba(156,163,175,0.25)] ring-1 ring-gray-400/20",
  "shadow-[0_0_16px_rgba(180,83,9,0.25)]    ring-1 ring-amber-700/30",
];

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
function uname(u: { name: string | null; username: string | null }) {
  return u.username ?? u.name ?? "Unbekannt";
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

  // Points standings: only count finished spieltage
  const finishedEntries = season.spieltage
    .filter(st => st.status === "finished")
    .flatMap(st => st.entries);
  const standings = buildLulStandings(finishedEntries);

  // All-players list: everyone who appears in ANY entry across ALL spieltage
  const allPlayerMap = new Map<string, { id: string; name: string | null; username: string | null; image: string | null }>();
  for (const st of season.spieltage) {
    for (const e of st.entries) {
      if (!allPlayerMap.has(e.userId)) allPlayerMap.set(e.userId, e.user);
    }
  }

  // Merge: players with 0 points also appear in the table
  const fullStandings = [...allPlayerMap.values()].map(user => {
    const existing = standings.find(s => s.userId === user.id);
    return existing ?? {
      userId:   user.id,
      name:     uname(user),
      image:    user.image,
      totalPts: 0,
      games: 0, wins: 0, champs: 0, trost: 0, votes: 0, dominion: 0,
    };
  }).sort((a, b) => b.totalPts - a.totalPts || b.wins - a.wins || b.champs - a.champs);

  const finishedCount = season.spieltage.filter(st => st.status === "finished").length;
  const myRow = fullStandings.find(s => s.userId === userId);
  const myRank = fullStandings.findIndex(s => s.userId === userId) + 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/lul" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
      </Link>

      {/* ── Season Header ──────────────────────────────────────────────── */}
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{finishedCount}/{season.totalSpieltage}</p>
            <p className="text-xs text-gray-500 mt-0.5">Spieltage</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{fullStandings.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Teilnehmer</p>
          </div>
          <div className="bg-black/20 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-amber-400">{myRow?.totalPts ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Meine Punkte</p>
          </div>
          {myRank > 0 && (
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-white">#{myRank}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mein Rang</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Rangliste
        </h2>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(15,15,23,0.9)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>

          {/* Table header */}
          <div className="grid items-center px-4 py-2.5 border-b border-white/[0.06]"
            style={{ gridTemplateColumns: "2.5rem 1fr 5rem 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem" }}>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold text-center">#</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Spieler</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold text-right pr-2">Punkte</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold text-center" title="Spieltage">Sp</span>
            <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold text-center" title="Game Winner">🏆</span>
            <span className="text-[10px] text-purple-600 uppercase tracking-wider font-semibold text-center" title="Community-Champ">👑</span>
            <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold text-center" title="Trostpreis">🎁</span>
            <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold text-center" title="Vote">✅</span>
            <span className="text-[10px] text-orange-600 uppercase tracking-wider font-semibold text-center" title="Dominion Bonus">🔥</span>
          </div>

          {fullStandings.length === 0 && (
            <div className="py-12 text-center text-gray-600 text-sm">
              Noch keine Spieler eingetragen.
            </div>
          )}

          {fullStandings.map((s, i) => {
            const isMe    = s.userId === userId;
            const isTop3  = i < 3 && s.totalPts > 0;
            const initials = s.name?.[0]?.toUpperCase() ?? "?";

            return (
              <div
                key={s.userId}
                className={`group grid items-center px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors ${
                  isMe
                    ? "bg-amber-500/[0.06]"
                    : "hover:bg-white/[0.02]"
                }`}
                style={{ gridTemplateColumns: "2.5rem 1fr 5rem 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem" }}
              >
                {/* Rank */}
                <div className="flex justify-center">
                  {isTop3 ? (
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base ${MEDAL_GLOW[i]}`}
                      style={{ background: i === 0 ? "rgba(251,191,36,0.12)" : i === 1 ? "rgba(156,163,175,0.1)" : "rgba(180,83,9,0.12)" }}>
                      {MEDAL[i]}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-600 w-7 text-center">{i + 1}</span>
                  )}
                </div>

                {/* Player */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.image ? (
                    <img src={s.image} alt="" className={`w-8 h-8 rounded-full shrink-0 ring-1 ${isMe ? "ring-amber-400/40" : "ring-white/10"}`} />
                  ) : (
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ring-1 ${
                      isMe
                        ? "bg-amber-900/30 text-amber-300 ring-amber-400/30"
                        : "bg-white/[0.06] text-gray-400 ring-white/5"
                    }`}>
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-amber-300" : "text-white"}`}>
                      {s.name}
                      {isMe && <span className="text-xs font-normal text-amber-600 ml-1.5">(du)</span>}
                    </p>
                    {isTop3 && s.totalPts > 0 && (
                      <p className="text-[10px] text-gray-600">
                        {i === 0 ? "Führend" : i === 1 ? "2. Platz" : "3. Platz"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total points — prominent */}
                <div className="text-right pr-2">
                  <span className={`text-base font-bold tabular-nums ${
                    s.totalPts === 0
                      ? "text-gray-700"
                      : i === 0
                      ? "text-amber-400"
                      : isMe
                      ? "text-amber-300"
                      : "text-white"
                  }`}>
                    {s.totalPts}
                  </span>
                  {s.totalPts > 0 && (
                    <p className="text-[9px] text-gray-600 leading-tight">Pkt</p>
                  )}
                </div>

                {/* Spieltage */}
                <div className="text-center">
                  <span className={`text-sm font-medium tabular-nums ${s.games > 0 ? "text-gray-300" : "text-gray-700"}`}>
                    {s.games}
                  </span>
                </div>

                {/* Wins */}
                <div className="text-center">
                  {s.wins > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold">
                      {s.wins}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-sm">–</span>
                  )}
                </div>

                {/* Champs */}
                <div className="text-center">
                  {s.champs > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 text-xs font-bold">
                      {s.champs}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-sm">–</span>
                  )}
                </div>

                {/* Trostpreis */}
                <div className="text-center">
                  {s.trost > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 text-xs font-bold">
                      {s.trost}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-sm">–</span>
                  )}
                </div>

                {/* Votes */}
                <div className="text-center">
                  {s.votes > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                      {s.votes}
                    </span>
                  ) : (
                    <span className="text-gray-700 text-sm">–</span>
                  )}
                </div>

                {/* Dominion */}
                <div className="text-center">
                  {s.dominion > 0 ? (
                    <span className="text-base" title={`${s.dominion}× Dominion Bonus`}>🔥</span>
                  ) : (
                    <span className="text-gray-700 text-sm">–</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer legend */}
          <div className="px-4 py-2.5 border-t border-white/[0.06] flex flex-wrap gap-x-4 gap-y-1">
            {[
              { icon: "🏆", label: "Game Winner", pts: `+${LUL_POINTS.GAME_WINNER}` },
              { icon: "👑", label: "Community-Champ", pts: `+${LUL_POINTS.COMMUNITY_CHAMP}` },
              { icon: "🎁", label: "Trostpreis", pts: `+${LUL_POINTS.TROSTPREIS}` },
              { icon: "✅", label: "Vote", pts: `+${LUL_POINTS.VOTE}` },
              { icon: "🎮", label: "Teilnahme", pts: `+${LUL_POINTS.GAME}` },
              { icon: "🔥", label: "Dominion Bonus", pts: `+${LUL_POINTS.DOMINION}` },
            ].map(item => (
              <span key={item.label} className="text-[10px] text-gray-700">
                {item.icon} {item.label} <span className="text-gray-600">{item.pts}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Spielplan ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" /> Spielplan
        </h2>
        <div className="space-y-3">
          {season.spieltage.map((st) => {
            const s = STATUS_LABEL[st.status] ?? STATUS_LABEL.upcoming;
            const players    = st.entries.filter(e => e.role === "player");
            const spectators = st.entries.filter(e => e.role === "spectator");
            const winner     = players.find(e => e.gameWinner);
            const champ      = spectators.find(e => e.communityChamp);
            const playedEntries = players
              .filter(e => e.placement != null)
              .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
            const isFinished = st.status === "finished";
            const hasEntries = st.entries.length > 0;
            const isMeIn     = st.entries.some(e => e.userId === userId);

            return (
              <div key={st.id}
                className={`rounded-xl overflow-hidden transition-colors ${
                  isMeIn ? "border border-amber-800/40" : "border border-white/[0.05]"
                }`}
                style={{ background: "rgba(15,15,23,0.8)" }}>

                {/* Spieltag header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isFinished ? "bg-amber-900/40 text-amber-300" :
                    hasEntries ? "bg-blue-900/40 text-blue-300"   :
                                 "bg-white/[0.04] text-gray-500"
                  }`}>
                    {st.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{st.game}</p>
                    {st.scheduledAt && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {fmtDate(st.scheduledAt)} · {fmtTime(st.scheduledAt)} Uhr
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isMeIn && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/40">
                        dabei
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                </div>

                {hasEntries && (
                  <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">

                    {/* Ergebnisse (finished only) */}
                    {isFinished && (winner || champ || playedEntries.length > 0) && (
                      <div className="flex flex-wrap gap-3">
                        {winner && (
                          <div className="flex items-center gap-1.5 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-base">🏆</span>
                            <div>
                              <p className="text-[9px] text-amber-700 uppercase tracking-wide leading-tight">Game Winner</p>
                              <p className="text-xs font-semibold text-amber-300 leading-tight">
                                {uname(winner.user)}
                              </p>
                            </div>
                          </div>
                        )}
                        {champ && (
                          <div className="flex items-center gap-1.5 bg-purple-900/20 border border-purple-800/30 rounded-lg px-2.5 py-1.5">
                            <span className="text-base">👑</span>
                            <div>
                              <p className="text-[9px] text-purple-700 uppercase tracking-wide leading-tight">Community-Champ</p>
                              <p className="text-xs font-semibold text-purple-300 leading-tight">
                                {uname(champ.user)}
                              </p>
                            </div>
                          </div>
                        )}
                        {playedEntries.length > 0 && (
                          <div className="flex items-center gap-2">
                            {playedEntries.slice(0, 3).map((e, i) => (
                              <div key={e.id} className="flex items-center gap-1">
                                <span className="text-sm">{MEDAL[i]}</span>
                                <span className={`text-xs font-medium ${e.userId === userId ? "text-amber-300" : "text-gray-300"}`}>
                                  {uname(e.user)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Players + spectators */}
                    <div className="flex flex-wrap gap-4">
                      {players.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                            🎮 Mitspieler ({players.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {players.map(e => (
                              <span key={e.id}
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                  e.userId === userId
                                    ? "bg-amber-900/20 border-amber-800/50 text-amber-300"
                                    : "bg-white/[0.04] border-white/5 text-gray-300"
                                }`}>
                                {uname(e.user)}{e.userId === userId && " (du)"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {spectators.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                            👁️ Zuschauer ({spectators.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {spectators.map(e => (
                              <span key={e.id}
                                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                  e.userId === userId
                                    ? "bg-amber-900/20 border-amber-800/50 text-amber-300"
                                    : "bg-white/[0.04] border-white/5 text-gray-400"
                                }`}>
                                {uname(e.user)}{e.userId === userId && " (du)"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
