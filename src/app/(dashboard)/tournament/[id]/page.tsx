import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Trophy, Clock, Swords, ChevronDown, Medal, StickyNote, Star, Vote, Repeat } from "lucide-react";
import WinIcon from "@/components/WinIcon";
import BracketView from "./BracketView";
import RoundRobinView from "./RoundRobinView";
import FfaView from "./FfaView";
import LigaView from "./LigaView";

const STATUS_STYLES: Record<string, { label: string; style: string; dot: string }> = {
  open:     { label: "Anmeldung offen", style: "bg-blue-900/50 text-blue-300",   dot: "bg-blue-400" },
  active:   { label: "Turnier läuft",   style: "bg-green-900/50 text-green-300", dot: "bg-green-400 animate-pulse" },
  closed:   { label: "Geschlossen",     style: "bg-amber-900/50 text-amber-300", dot: "bg-amber-400" },
  finished: { label: "Beendet",         style: "bg-gray-800 text-gray-500",      dot: "bg-gray-600" },
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "K.O.-System",
  double_elimination: "Double Elimination",
  round_robin:        "Jeder gegen Jeden",
  liga:               "Liga",
  ffa:                "Free for All",
  coop_stats:         "Kooperativ (Stats)",
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      series: { select: { id: true, name: true } },
      registrations: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true, points: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      participants: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { entries: true },
      },
    },
  });

  if (!event) notFound();

  const sponsors = await prisma.shopPurchase.findMany({
    where:   { consumed: false, item: { type: "tournament_sponsor" } },
    include: { user: { select: { username: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const isRegistered = event.registrations.some((r) => r.userId === userId);
  const s = STATUS_STYLES[event.status] ?? STATUS_STYLES.finished;
  const hasTournament = !!event.format;

  // Alle bekannten Spieler: Turnier-Teilnehmer + Event-Registrierungen zusammenführen,
  // damit Match-Spieler auch dann aufgelöst werden wenn sie nicht als TournamentParticipant eingetragen sind
  type KnownUser = { id: string; name: string | null; username: string | null; image: string | null };
  type KnownParticipant = { userId: string; user: KnownUser };
  const mergedParticipants: KnownParticipant[] = hasTournament
    ? [
        ...event.participants.map(p => ({ userId: p.userId, user: p.user as KnownUser })),
        ...event.registrations
          .filter(r => !event.participants.some(p => p.userId === r.userId))
          .map(r => ({ userId: r.user.id, user: r.user as KnownUser })),
      ]
    : [];
  const format = event.format ?? "single_elimination";
  const isFfa         = format === "ffa" || format === "coop_stats" || format === "avg_stats";
  const isElimination = format === "single_elimination" || format === "double_elimination";
  const isRoundRobin  = format === "round_robin";
  const isLiga        = format === "liga";

  const userName = (u: { name: string | null; username: string | null }) =>
    u.username ?? u.name ?? "Unbekannt";

  // Turnersieger ermitteln
  let winner: { name: string | null; username: string | null; image: string | null } | null = null;
  if (hasTournament) {
    if (isElimination) {
      const maxRound = event.matches.length ? Math.max(...event.matches.map(m => m.round)) : 0;
      const finalMatch = event.matches.find(m => m.round === maxRound);
      winner = finalMatch?.winnerId
        ? (mergedParticipants.find(p => p.userId === finalMatch.winnerId)?.user ?? null)
        : null;
    } else if (isLiga) {
      const winsMap = new Map<string, number>();
      for (const m of event.matches) {
        if (m.winnerId) winsMap.set(m.winnerId, (winsMap.get(m.winnerId) ?? 0) + 1);
      }
      const topId = [...winsMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      winner = topId ? (mergedParticipants.find(p => p.userId === topId)?.user ?? null) : null;
    } else if (isFfa) {
      const winnerEntry = event.matches
        .flatMap(m => m.entries)
        .find(e => e.placement === 1);
      winner = winnerEntry?.userId
        ? (mergedParticipants.find(p => p.userId === winnerEntry.userId)?.user ?? null)
        : null;
    }
  }

  // Completion-Daten (Poll-Gewinner etc.)
  type CompletionData = {
    pollWinnerId?: string | null;
    pollWinnerIds?: string[] | null;
    pollLabel?: string | null;
    pollBonusPoints?: number | null;
    pollBonusCoins?: number | null;
    pollBonusRankPoints?: number | null;
    finalRankingGroups?: string[][] | null;
    pollPhaseComplete?: boolean;
  };
  const completionData: CompletionData = (() => {
    try { return event.completionData ? JSON.parse(event.completionData as string) : {}; } catch { return {}; }
  })();
  const pollWinnerIds: string[] = completionData.pollWinnerIds ??
    (completionData.pollWinnerId ? [completionData.pollWinnerId] : []);
  const pollLabel         = completionData.pollLabel ?? null;
  const pollBonusCoins    = completionData.pollBonusCoins ?? completionData.pollBonusPoints ?? null;
  const pollBonusRankPts  = completionData.pollBonusRankPoints ?? null;
  const rankingGroups     = completionData.finalRankingGroups ?? null;

  // Teilnahme-Münzen (aus placementRewardsJson oder Fallback auf pointReward)
  const participationCoins: number = (() => {
    if (event.placementRewardsJson) {
      try {
        const r = JSON.parse(event.placementRewardsJson) as { participationCoins?: number };
        if (r.participationCoins != null) return r.participationCoins;
      } catch { /* ignore */ }
    }
    return event.pointReward ?? 0;
  })();

  // Punkte pro Platzierung aus pointsConfig
  type PcVal = number | { coins?: number; points?: number };
  const pcRaw: Record<string, PcVal> = (() => {
    try { return event.pointsConfig ? JSON.parse(event.pointsConfig) : {}; } catch { return {}; }
  })();
  function placementCoins(place: number): number {
    const v = pcRaw[String(place)];
    if (!v) return 0;
    return typeof v === "number" ? v : (v.coins ?? 0);
  }
  function placementRankPts(place: number): number {
    if (place > 3) return 0;
    const v = pcRaw[String(place)];
    if (!v) return 0;
    return typeof v === "number" ? v : (v.points ?? v.coins ?? 0);
  }

  // Stats für Header
  const playedMatches = event.matches.filter(m =>
    isElimination ? !!m.winnerId : !!m.playedAt
  ).length;
  const totalMatches = event.matches.length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href="/events" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit group">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        {event.series && (
          <Link
            href={`/events/series/${event.series.id}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500/20 transition-colors font-medium"
          >
            <Repeat className="w-3.5 h-3.5" />
            {event.series.name} – Gesamttabelle
          </Link>
        )}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold text-white">{event.title}</h1>
              {hasTournament && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/30 text-rose-300 border border-rose-800/30">
                  {FORMAT_LABELS[format] ?? format}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {event.game && <span className="text-sm text-gray-400">{event.game}</span>}
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.startAt).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                {new Date(event.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.style}`}>{s.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="glass-heavy rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">{event.registrations.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Teilnehmer</p>
          </div>
          <div className="glass-heavy rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-rose-400">+{event.pointReward}</p>
            <p className="text-xs text-gray-500 mt-0.5">Punkte</p>
          </div>
          <div className="glass-heavy rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-white">
              {hasTournament ? `${playedMatches}/${totalMatches}` : "–"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Matches gespielt</p>
          </div>
        </div>

        {winner && (
          <div className="mt-4 flex items-center gap-3 bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
            <WinIcon size={20} />
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Turniersieger</p>
              <p className="text-white font-semibold">{userName(winner)}</p>
            </div>
          </div>
        )}

        {sponsors.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">Community-Sponsoren</span>
            {sponsors.map(s => (
              <span key={s.id} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/[0.06] text-amber-300 font-medium">
                🏅 {s.user.username ?? s.user.name ?? "Unbekannt"}
              </span>
            ))}
          </div>
        )}

        {!isRegistered && (
          <div className="mt-4 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-xl px-3 py-2">
            Du bist bei diesem Event nicht angemeldet.
          </div>
        )}
      </div>

      {/* ── Endplatzierung ─────────────────────────────────────────────── */}
      {hasTournament && event.tournamentStatus === "finished" && event.finalRankingJson && (() => {
        const finalIds: string[] = JSON.parse(event.finalRankingJson!);
        const medals = ["🥇", "🥈", "🥉"];

        // Build placement map (supports ties via finalRankingGroups)
        const placementMap = new Map<string, number>();
        if (rankingGroups) {
          let place = 1;
          for (const group of rankingGroups) {
            for (const uid of group) placementMap.set(uid, place);
            place += group.length;
          }
        } else {
          finalIds.forEach((uid, i) => placementMap.set(uid, i + 1));
        }

        return (
          <div className="glass rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Endplatzierung</h2>
            </div>

            <div className="space-y-1.5">
              {finalIds.map((uid, i) => {
                const participant = mergedParticipants.find(p => p.userId === uid);
                const user = participant?.user;
                const name = user ? (user.name || user.username || "Unbekannt") : "Unbekannt";
                const isMe = uid === userId;
                const place = placementMap.get(uid) ?? (i + 1);
                const prevPlace = i > 0 ? (placementMap.get(finalIds[i - 1]) ?? i) : null;
                const isTied = prevPlace !== null && place === prevPlace;
                const coins = placementCoins(place);
                const rankPts = placementRankPts(place);
                const isPollWinner = pollWinnerIds.includes(uid);
                const totalCoins = coins + participationCoins + (isPollWinner ? (pollBonusCoins ?? 0) : 0);
                const totalRankPts = rankPts + (isPollWinner ? (pollBonusRankPts ?? 0) : 0);
                return (
                  <div key={uid}>
                    {/* Gleichstand-Trennlinie */}
                    {isTied && (
                      <div className="flex items-center gap-1 py-0.5 px-2 text-[10px] text-blue-400/40">
                        <div className="flex-1 border-t border-blue-500/20 border-dashed" />
                        <span>Gleichstand</span>
                        <div className="flex-1 border-t border-blue-500/20 border-dashed" />
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${place <= 3 ? "bg-amber-500/[0.06] border border-amber-500/15" : "bg-white/[0.02] border border-white/[0.05]"} ${isMe ? "ring-1 ring-teal-500/30" : ""}`}>
                      {/* Platz */}
                      <span className="w-7 text-center shrink-0 text-base">
                        {place <= 3 ? medals[place - 1] : <span className="text-xs text-gray-500 font-mono">{place}.</span>}
                      </span>
                      {/* Avatar */}
                      {user?.image
                        ? <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                            {name[0]?.toUpperCase() ?? "?"}
                          </div>
                      }
                      {/* Name + Badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-medium truncate ${isMe ? "text-teal-300" : place === 1 ? "text-amber-200" : "text-white"}`}>
                            {name}{isMe && <span className="text-xs text-gray-500 ml-1.5">(du)</span>}
                          </span>
                          {isPollWinner && pollLabel && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 shrink-0">
                              <Vote className="w-2.5 h-2.5" /> {pollLabel}
                            </span>
                          )}
                        </div>
                        {/* Punkte-Zusammenfassung */}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {participationCoins > 0 && (
                            <span className="text-[10px] text-gray-500">+{participationCoins} 🪙 Teilnahme</span>
                          )}
                          {coins > 0 && (
                            <span className="text-[10px] text-amber-400/80">+{coins} 🪙 Platz {place}</span>
                          )}
                          {rankPts > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-teal-400/80">
                              +{rankPts} <Star className="w-2.5 h-2.5" /> Platz {place}
                            </span>
                          )}
                          {isPollWinner && (pollBonusCoins ?? 0) > 0 && (
                            <span className="text-[10px] text-violet-400/80">+{pollBonusCoins} 🪙 {pollLabel}</span>
                          )}
                          {isPollWinner && (pollBonusRankPts ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-violet-400/80">
                              +{pollBonusRankPts} <Star className="w-2.5 h-2.5" /> {pollLabel}
                            </span>
                          )}
                          {(totalCoins > 0 || totalRankPts > 0) && (coins > 0 || rankPts > 0 || participationCoins > 0 || isPollWinner) && (
                            <span className="text-[10px] text-gray-600 font-medium">
                              = {totalCoins > 0 ? `${totalCoins} 🪙` : ""}
                              {totalCoins > 0 && totalRankPts > 0 ? " + " : ""}
                              {totalRankPts > 0 ? <>{totalRankPts} <Star className="w-2.5 h-2.5 inline" /></> : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      {place === 1 && !isTied && <WinIcon size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notiz */}
            {event.finalRankingNote && (
              <div className="flex items-start gap-2 mt-1 px-1">
                <StickyNote className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 italic leading-relaxed">{event.finalRankingNote}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Umfrage-Übersicht ──────────────────────────────────────────── */}
      {pollWinnerIds.length > 0 && pollLabel && (() => {
        return (
          <div className="glass rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">{pollLabel}</h2>
            </div>
            <div className="space-y-1.5">
              {pollWinnerIds.map(uid => {
                const participant = mergedParticipants.find(p => p.userId === uid);
                const user = participant?.user;
                const name = user ? (user.name || user.username || "Unbekannt") : "Unbekannt";
                const isMe = uid === userId;
                return (
                  <div key={uid} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-500/[0.06] border border-violet-500/15 ${isMe ? "ring-1 ring-teal-500/30" : ""}`}>
                    <span className="text-base shrink-0">🏆</span>
                    {user?.image
                      ? <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isMe ? "text-teal-300" : "text-violet-200"}`}>
                        {name}{isMe && <span className="text-xs text-gray-500 ml-1.5">(du)</span>}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(pollBonusCoins ?? 0) > 0 && (
                          <span className="text-[10px] text-violet-400/80">+{pollBonusCoins} 🪙</span>
                        )}
                        {(pollBonusRankPts ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-violet-400/80">
                            +{pollBonusRankPts} <Star className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pollWinnerIds.length > 1 && (
                <p className="text-[11px] text-gray-600 px-1">
                  Alle {pollWinnerIds.length} Gewinner erhalten dieselbe Belohnung (Gleichstand).
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Content ────────────────────────────────────────────────────── */}
      {!hasTournament ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 font-medium">Noch kein Spielplan erstellt.</p>
          <p className="text-gray-600 text-sm mt-1">Ein Admin erstellt den Spielplan im Admin-Bereich.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Teilnehmerliste */}
          <div className="lg:col-span-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Teilnehmer
            </h2>
            <div className="glass rounded-2xl divide-y divide-white/5">
              {event.registrations.map(({ user }, i) => {
                const isMe = user.id === userId;
                const wins = event.matches.filter(m => m.winnerId === user.id).length;
                const isPollWinner = pollWinnerIds.includes(user.id);
                return (
                  <div key={user.id} className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? "bg-rose-950/30" : ""}`}>
                    <span className="text-xs text-gray-700 w-4 shrink-0 text-center">{i + 1}</span>
                    {user.image ? (
                      <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-rose-900/30 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">
                        {userName(user)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate font-medium ${isMe ? "text-rose-300" : "text-white"}`}>
                        {userName(user)}{isMe && " (du)"}
                      </p>
                      {isPollWinner && pollLabel && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-violet-400">
                          <Vote className="w-2.5 h-2.5" /> {pollLabel}
                        </span>
                      )}
                    </div>
                    {wins > 0 && <span className="text-xs text-emerald-400 shrink-0">{wins}W</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Format-spezifische Ansicht */}
          <div className="lg:col-span-3">
            {isElimination && (
              <BracketView
                matches={event.matches as Parameters<typeof BracketView>[0]["matches"]}
                participants={mergedParticipants}
                userId={userId}
              />
            )}
            {isRoundRobin && (
              <RoundRobinView
                matches={event.matches as Parameters<typeof RoundRobinView>[0]["matches"]}
                participants={mergedParticipants}
                userId={userId}
              />
            )}
            {isLiga && (
              <LigaView
                matches={event.matches as Parameters<typeof LigaView>[0]["matches"]}
                participants={mergedParticipants}
                userId={userId}
              />
            )}
            {isFfa && (
              <FfaView
                matches={event.matches as Parameters<typeof FfaView>[0]["matches"]}
                participants={mergedParticipants}
                statFields={event.statFields ? JSON.parse(event.statFields) : []}
                userId={userId}
                format={format}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
