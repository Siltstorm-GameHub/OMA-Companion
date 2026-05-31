import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Trophy, Clock, Swords } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; style: string; dot: string }> = {
  open:     { label: "Anmeldung offen", style: "bg-blue-900/50 text-blue-300",   dot: "bg-blue-400" },
  active:   { label: "Turnier läuft",   style: "bg-green-900/50 text-green-300", dot: "bg-green-400 animate-pulse" },
  closed:   { label: "Geschlossen",     style: "bg-amber-900/50 text-amber-300", dot: "bg-amber-400" },
  finished: { label: "Beendet",         style: "bg-gray-800 text-gray-500",      dot: "bg-gray-600" },
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
      registrations: {
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true, points: true, level: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      tournament: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true } },
            },
          },
          matches: {
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  });

  if (!event) notFound();

  // Prüfen ob User angemeldet ist
  const isRegistered = event.registrations.some((r) => r.userId === userId);
  const s = STATUS_STYLES[event.status] ?? STATUS_STYLES.finished;
  const tournament = event.tournament;

  const userName = (u: { name: string | null; username: string | null }) =>
    u.username ?? u.name ?? "Unbekannt";

  // Bracket-Daten aufbereiten
  const rounds = tournament
    ? Math.max(...tournament.matches.map((m) => m.round), 0)
    : 0;

  const roundNames: Record<number, string> = {};
  if (rounds === 1) roundNames[1] = "Finale";
  else if (rounds === 2) { roundNames[1] = "Halbfinale"; roundNames[2] = "Finale"; }
  else if (rounds === 3) { roundNames[1] = "Viertelfinale"; roundNames[2] = "Halbfinale"; roundNames[3] = "Finale"; }
  else {
    for (let i = 1; i <= rounds; i++) {
      if (i === rounds) roundNames[i] = "Finale";
      else if (i === rounds - 1) roundNames[i] = "Halbfinale";
      else if (i === rounds - 2) roundNames[i] = "Viertelfinale";
      else roundNames[i] = `Runde ${i}`;
    }
  }

  // Sieger des Turniers
  const finalMatch = tournament?.matches.find((m) => m.round === rounds);
  const winner = finalMatch?.winnerId
    ? tournament?.participants.find((p) => p.userId === finalMatch.winnerId)?.user
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/tournament" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-5 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Zurück zu meinen Turnieren
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-white">{event.title}</h1>
              {tournament && <Trophy className="w-5 h-5 text-amber-400" />}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {event.game && <span className="text-sm text-gray-400">{event.game}</span>}
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.startAt).toLocaleDateString("de-DE", {
                  weekday: "long", day: "2-digit", month: "long", year: "numeric",
                })}{" "}
                · {new Date(event.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.style}`}>{s.label}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-white">{event.registrations.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Teilnehmer</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-rose-400">+{event.pointReward}</p>
            <p className="text-xs text-gray-500 mt-0.5">Punkte</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-white">
              {tournament ? `${tournament.matches.filter((m) => m.winnerId).length}/${tournament.matches.length}` : "–"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Matches gespielt</p>
          </div>
        </div>

        {/* Gewinner-Banner */}
        {winner && (
          <div className="mt-4 flex items-center gap-3 bg-amber-900/20 border border-amber-800/40 rounded-lg p-3">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Turniersieger</p>
              <p className="text-white font-semibold">{userName(winner)}</p>
            </div>
          </div>
        )}

        {!isRegistered && (
          <div className="mt-4 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2">
            Du bist bei diesem Event nicht angemeldet.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Teilnehmerliste */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Teilnehmer ({event.registrations.length})
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {event.registrations.map(({ user }, i) => {
              const isMe = user.id === userId;
              const participantResult = tournament?.matches
                .filter((m) => m.winnerId !== null)
                .reduce((wins, m) => (m.winnerId === user.id ? wins + 1 : wins), 0) ?? 0;

              return (
                <div key={user.id} className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? "bg-rose-950/30" : ""}`}>
                  <span className="text-xs text-gray-600 w-4 shrink-0">{i + 1}</span>
                  {user.image ? (
                    <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-rose-600/30 flex items-center justify-center text-xs font-semibold text-rose-300 shrink-0">
                      {userName(user)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isMe ? "text-rose-300 font-medium" : "text-white"}`}>
                      {userName(user)}{isMe && " (du)"}
                    </p>
                    <p className="text-xs text-gray-600">Lvl {user.level}</p>
                  </div>
                  {tournament && participantResult > 0 && (
                    <span className="text-xs text-green-400 shrink-0">{participantResult}W</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bracket / Spielplan */}
        <div className="lg:col-span-2">
          {!tournament ? (
            <div>
              <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4" /> Spielplan
              </h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Swords className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                <p className="text-gray-500 text-sm">Noch kein Turnierbaum erstellt.</p>
                <p className="text-gray-600 text-xs mt-1">Ein Admin erstellt den Spielplan im Admin-Bereich.</p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Turnierbaum
              </h2>
              <div className="space-y-4">
                {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
                  const roundMatches = tournament.matches.filter((m) => m.round === round);
                  return (
                    <div key={round} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                        {roundNames[round] ?? `Runde ${round}`}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {roundMatches.map((match) => {
                          const p1 = tournament.participants.find((p) => p.userId === match.player1Id)?.user;
                          const p2 = tournament.participants.find((p) => p.userId === match.player2Id)?.user;
                          const isMyMatch = match.player1Id === userId || match.player2Id === userId;

                          return (
                            <div key={match.id}
                              className={`rounded-lg border overflow-hidden ${
                                isMyMatch ? "border-rose-700" : "border-gray-700"
                              } ${!match.player1Id || !match.player2Id ? "opacity-40" : ""}`}>
                              {[
                                { player: p1, score: match.score1, id: match.player1Id },
                                { player: p2, score: match.score2, id: match.player2Id },
                              ].map(({ player, score, id }, idx) => {
                                const isWinner = match.winnerId === id;
                                const isLoser = match.winnerId && match.winnerId !== id;
                                const isMe = id === userId;
                                return (
                                  <div key={idx}
                                    className={`flex items-center justify-between px-3 py-2.5 ${
                                      idx === 0 ? "border-b border-gray-700" : ""
                                    } ${isWinner ? "bg-green-900/20" : ""}`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      {player?.image ? (
                                        <img src={player.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
                                      ) : player ? (
                                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 shrink-0">
                                          {userName(player)[0].toUpperCase()}
                                        </div>
                                      ) : null}
                                      <span className={`text-sm truncate ${
                                        isWinner ? "text-green-300 font-medium" :
                                        isLoser ? "text-gray-600" :
                                        isMe ? "text-rose-300 font-medium" :
                                        player ? "text-white" : "text-gray-600 italic"
                                      }`}>
                                        {player ? `${userName(player)}${isMe ? " (du)" : ""}` : "TBD"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {isWinner && <Trophy className="w-3 h-3 text-amber-400" />}
                                      <span className={`font-mono text-sm font-medium ${
                                        isWinner ? "text-green-300" : isLoser ? "text-gray-700" : "text-gray-400"
                                      }`}>
                                        {score !== null ? score : "–"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
