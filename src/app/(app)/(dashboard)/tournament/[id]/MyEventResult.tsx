import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";

/**
 * "Dein Ergebnis" ganz oben nach dem Event: Platz und was man bekommen hat — auch wenn man nicht auf
 * dem Podest stand. Wer beim Abschluss als "nicht da" eingetragen oder ausgeschlossen wurde, erfährt
 * es hier (vorher sah man davon nichts und wunderte sich nur über fehlende Münzen).
 */
export default function MyEventResult({
  place, total, reward, absent, excluded, spectator,
}: {
  place: number | null;
  total: number;
  reward: { coins: number; rankPoints: number } | null;
  absent: boolean;
  excluded: boolean;
  spectator: boolean;
}) {
  if (excluded) {
    return (
      <section aria-label="Dein Ergebnis" className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 mb-5 text-sm text-red-200">
        Du wurdest bei diesem Event nicht gewertet. Fragen dazu? Sag dem Veranstalter Bescheid.
      </section>
    );
  }
  if (absent) {
    return (
      <section aria-label="Dein Ergebnis" className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 mb-5 text-sm text-amber-200">
        Du warst beim Abschluss als nicht anwesend eingetragen, deshalb gibt es keine Teilnahme-Belohnung.
        <span className="block text-xs text-amber-200/75 mt-0.5">Stimmt das nicht? Sag dem Veranstalter Bescheid, er kann es korrigieren.</span>
      </section>
    );
  }
  if (!place && !reward) return null;
  return (
    <section aria-label="Dein Ergebnis" className="glass rounded-2xl px-4 py-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border border-primary/20">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Dein Ergebnis</span>
      {place ? (
        <span className="text-sm font-semibold text-white">Platz {place} <span className="text-gray-500 font-normal">von {total}</span></span>
      ) : (
        <span className="text-sm text-gray-300">{spectator ? "Als Zuschauer dabei" : "Dabei gewesen"}</span>
      )}
      {reward && reward.coins > 0 && (
        <span className="flex items-center gap-1 text-sm font-semibold text-amber-400"><CoinIcon size={14} />+{reward.coins}</span>
      )}
      {reward && reward.rankPoints > 0 && (
        <span className="flex items-center gap-1 text-sm font-semibold text-primary"><RankPointsIcon size={14} />+{reward.rankPoints}</span>
      )}
    </section>
  );
}
