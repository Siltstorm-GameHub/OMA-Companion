import Link from "next/link";
import { Eye, Swords } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";

export interface BattleHistoryEntry {
  id: string;
  battleId: string | null;
  winnerId: string | null;
  challengerId: string;
  opponentId: string;
  challenger: { username: string | null; name: string | null; image: string | null; rankPoints: number };
  opponent: { username: string | null; name: string | null; image: string | null; rankPoints: number };
}

const uname = (u: BattleHistoryEntry["challenger"]) => u.username ?? u.name ?? "?";

/** Öffentlicher Feed aller aufgelösten Battle-Cards-Kämpfe (nicht auf den Betrachter beschränkt). */
export default function BattleHistoryFeed({ entries }: { entries: BattleHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 flex flex-col items-center gap-2 text-center">
        <Swords className="w-6 h-6 text-gray-600" />
        <p className="text-sm text-gray-500">Noch keine ausgetragenen Kämpfe.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl divide-y divide-white/5">
      {entries.map((e) => {
        const content = (
          <>
            <RankedAvatar rankPoints={e.challenger.rankPoints} src={e.challenger.image} alt={uname(e.challenger)} size={20} className="w-5 h-5 shrink-0" />
            <span className={`text-xs ${e.winnerId === e.challengerId ? "text-emerald-300 font-semibold" : "text-gray-400"}`}>
              {uname(e.challenger)}
            </span>
            <span className="text-[10px] text-gray-500 shrink-0">vs.</span>
            <RankedAvatar rankPoints={e.opponent.rankPoints} src={e.opponent.image} alt={uname(e.opponent)} size={20} className="w-5 h-5 shrink-0" />
            <span className={`text-xs flex-1 min-w-0 truncate ${e.winnerId === e.opponentId ? "text-emerald-300 font-semibold" : "text-gray-400"}`}>
              {uname(e.opponent)}
            </span>
            {!e.winnerId && <span className="text-[10px] text-gray-500 shrink-0">Unentschieden</span>}
          </>
        );
        return e.battleId ? (
          <Link
            key={e.id}
            href={`/battle-cards/battles/${e.battleId}`}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
          >
            {content}
            <Eye className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          </Link>
        ) : (
          <div key={e.id} className="w-full flex items-center gap-2.5 px-4 py-2.5">
            {content}
          </div>
        );
      })}
    </div>
  );
}
