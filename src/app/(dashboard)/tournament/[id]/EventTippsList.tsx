import Link from "next/link";
import { Coins, Target, Check, X } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null };
type Tipp = {
  user: UserLite;
  predictedUser: UserLite;
  resolved: boolean;
  correct: boolean | null;
};

const uname = (u: UserLite) => u.username ?? u.name ?? "?";

function Avatar({ u }: { u: UserLite }) {
  return u.image ? (
    <img src={u.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
  ) : (
    <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
      {uname(u)[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function EventTippsList({ pot, tipps }: { pot: number; tipps: Tipp[] }) {
  if (tipps.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-sm font-semibold text-white">Tipps ({tipps.length})</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/20">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300">Pott: {pot}</span>
          <CoinIcon size={12} />
        </div>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {tipps.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
            <Link href={`/profile/${t.user.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Avatar u={t.user} />
              <span className="text-xs text-gray-300 truncate">{uname(t.user)}</span>
            </Link>
            <span className="text-xs text-gray-600">tippt auf</span>
            <Link href={`/profile/${t.predictedUser.id}`} className="flex items-center gap-1.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <Avatar u={t.predictedUser} />
              <span className="text-xs text-white font-medium truncate">{uname(t.predictedUser)}</span>
            </Link>
            {t.resolved && (
              t.correct ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              )
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Die Einsätze der anderen Tipper bleiben geheim — nur wer auf wen tippt ist sichtbar.
      </p>
    </div>
  );
}
