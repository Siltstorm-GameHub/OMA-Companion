"use client";
import { Trophy } from "lucide-react";
import WinIcon from "@/components/WinIcon";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  entries: unknown[];
};

const roundLabel = (round: number, total: number) => {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Halbfinale";
  if (fromEnd === 2) return "Viertelfinale";
  return `Runde ${round}`;
};

const uname = (u: User | undefined) => u?.username ?? u?.name ?? "TBD";

export default function BracketView({
  matches,
  participants,
  userId,
}: {
  matches: Match[];
  participants: Participant[];
  userId: string;
}) {
  if (!matches.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
        Noch keine Matches angelegt.
      </div>
    );
  }

  const totalRounds = Math.max(...matches.map(m => m.round));
  const byRound = Array.from({ length: totalRounds }, (_, i) =>
    matches.filter(m => m.round === i + 1)
  );

  const findUser = (id: string | null) =>
    id ? participants.find(p => p.userId === id)?.user : undefined;

  // Slot-Höhe in px (match card + gap)
  const CARD_H = 84;
  const CARD_GAP = 8;
  const SLOT = CARD_H + CARD_GAP;

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-amber-400" /> Turnierbaum
      </h2>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {byRound.map((roundMatches, roundIdx) => {
            const round = roundIdx + 1;
            const slotH = Math.pow(2, roundIdx) * SLOT;

            return (
              <div key={round} className="flex flex-col" style={{ gap: 0 }}>
                {/* Round label */}
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 text-center">
                  {roundLabel(round, totalRounds)}
                </p>

                {roundMatches.map(match => {
                  const p1 = findUser(match.player1Id);
                  const p2 = findUser(match.player2Id);
                  const isMyMatch = match.player1Id === userId || match.player2Id === userId;
                  const pending = !match.winnerId && p1 && p2;

                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-center"
                      style={{ height: `${slotH}px` }}
                    >
                      <div
                        className={`w-48 rounded-xl border overflow-hidden ${
                          isMyMatch ? "border-rose-700/60 shadow-[0_0_12px_rgba(190,18,60,0.15)]" :
                          match.winnerId ? "border-white/5 opacity-70" :
                          "border-white/10"
                        }`}
                      >
                        {/* Scheduled time if set */}
                        {match.scheduledAt && (
                          <div className="px-2 py-1 rgba(255,255,255,0.04) border-b border-white/5 text-[10px] text-gray-500 text-center">
                            {new Date(match.scheduledAt).toLocaleString("de-DE", {
                              day: "2-digit", month: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        )}

                        {/* Player rows */}
                        {(
                          [
                            { user: p1, score: match.score1, id: match.player1Id },
                            { user: p2, score: match.score2, id: match.player2Id },
                          ] as const
                        ).map(({ user, score, id }, idx) => {
                          const isWinner = match.winnerId && match.winnerId === id;
                          const isLoser  = match.winnerId && match.winnerId !== id;
                          const isMe     = id === userId;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between px-2.5 py-2 ${
                                idx === 0 ? "border-b border-white/5" : ""
                              } ${isWinner ? "bg-emerald-900/20" : "glass"}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {user?.image ? (
                                  <img src={user.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
                                ) : (
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                    isMe ? "bg-rose-900/50 text-rose-300" : "bg-white/[0.06] text-gray-400"
                                  }`}>
                                    {user ? uname(user)[0].toUpperCase() : "?"}
                                  </div>
                                )}
                                <span className={`text-xs truncate max-w-[90px] ${
                                  isWinner ? "text-emerald-300 font-semibold" :
                                  isLoser  ? "text-gray-600" :
                                  isMe     ? "text-rose-300 font-medium" :
                                  user     ? "text-white" :
                                             "text-gray-600 italic"
                                }`}>
                                  {user ? `${uname(user)}${isMe ? " (du)" : ""}` : "TBD"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isWinner && <WinIcon size={12} />}
                                <span className={`font-mono text-xs font-semibold ${
                                  isWinner ? "text-emerald-300" :
                                  isLoser  ? "text-gray-700"   :
                                             "text-gray-400"
                                }`}>
                                  {score !== null ? score : pending ? "–" : "?"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
