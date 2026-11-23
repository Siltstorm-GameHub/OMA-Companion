import Link from "next/link";
import { Coins, Target, Check, X } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import RankedAvatar from "@/components/RankedAvatar";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number };
type Tipp = {
  user: UserLite;
  predictedUser: UserLite;
  resolved: boolean;
  correct: boolean | null;
};

const uname = (u: UserLite) => u.username ?? u.name ?? "?";

function Avatar({ u }: { u: UserLite }) {
  return <RankedAvatar userId={u.id} src={u.image} alt={uname(u)} size={24} className="w-6 h-6" />;
}

export default function EventTippsList({ pot, tipps }: { pot: number; tipps: Tipp[] }) {
  if (tipps.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary-fg shrink-0" />
          <p className="text-base font-extrabold text-fg">Tipps <span className="text-xs font-semibold text-subtle">{tipps.length}</span></p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coin-soft">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold text-coin">Pott: {pot}</span>
          <CoinIcon size={12} />
        </div>
      </div>

      <div className="divide-y divide-line">
        {tipps.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
            <Link href={`/profile/${t.user.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Avatar u={t.user} />
              <span className="text-xs text-fg/90 truncate">{uname(t.user)}</span>
            </Link>
            <span className="text-xs text-subtle">tippt auf</span>
            <Link href={`/profile/${t.predictedUser.id}`} className="flex items-center gap-1.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <Avatar u={t.predictedUser} />
              <span className="text-xs text-fg font-medium truncate">{uname(t.predictedUser)}</span>
            </Link>
            {/* Erstattet (kein Sieger / Spieler hat nicht mitgespielt) */}
            {t.resolved && t.correct === null && <span className="text-xs text-subtle shrink-0">zurück</span>}
            {t.resolved && t.correct !== null && (
              t.correct ? (
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-subtle shrink-0" />
              )
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-subtle leading-relaxed">
        Die Einsätze der anderen Tipper bleiben geheim — nur wer auf wen tippt ist sichtbar.
      </p>
    </div>
  );
}
