import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import ForYouCard from "./ForYouCard";

/**
 * "Dein Ergebnis" ganz oben nach dem Event: Platz und was man bekommen hat — auch wenn man nicht auf
 * dem Podest stand. Wer beim Abschluss als "nicht da" eingetragen oder ausgeschlossen wurde, erfährt
 * es hier (vorher sah man davon nichts und wunderte sich nur über fehlende Münzen).
 * Sieht aus wie die "Für dich"-Karte vor dem Event.
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
    return <ForYouCard className="mb-5" data={{
      tone: "danger", glyph: "cross", title: "Du wurdest nicht gewertet",
      text: "Fragen dazu? Sag dem Veranstalter Bescheid.",
    }} />;
  }
  if (absent) {
    return <ForYouCard className="mb-5" data={{
      tone: "amber", glyph: "warning", title: "Als nicht anwesend eingetragen",
      text: "Deshalb gibt es keine Teilnahme-Belohnung. Stimmt das nicht? Der Veranstalter kann es korrigieren.",
    }} />;
  }
  if (!place && !reward) return null;
  const rewardNode = reward && (reward.coins > 0 || reward.rankPoints > 0) ? (
    <span className="flex items-center gap-3 text-lg font-extrabold tabular-nums">
      {reward.coins > 0 && <span className="flex items-center gap-1 text-coin">+{reward.coins} <CoinIcon size={16} /></span>}
      {reward.rankPoints > 0 && <span className="flex items-center gap-1 text-primary-fg">+{reward.rankPoints} <RankPointsIcon size={16} /></span>}
    </span>
  ) : undefined;
  return <ForYouCard className="mb-5" data={{
    tone: place && place <= 3 ? "gold" : "teal",
    glyph: place && place <= 3 ? "trophy" : "check",
    title: place ? <>Platz {place} <span className="text-sm font-semibold text-subtle">von {total}</span></> : spectator ? "Als Zuschauer dabei" : "Dabei gewesen",
    text: place && place <= 3 ? "Stark — du stehst auf dem Treppchen." : "Danke fürs Mitmachen!",
    action: rewardNode,
  }} />;
}
