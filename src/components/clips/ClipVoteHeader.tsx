import CountdownBadge from "@/components/CountdownBadge";
import CoinIcon from "@/components/CoinIcon";

/** Kopfzeile einer laufenden Abstimmung (Monat oder Jahr): Titel, Anzahl, Restzeit und Belohnungen in einer Zeile. */
export default function ClipVoteHeader({
  title, subtitle, clipCount, endsAt, participationCoins, rewardCoins,
}: {
  title: string;
  subtitle?: string;
  clipCount: number;
  endsAt: Date;
  participationCoins: number;
  rewardCoins: number;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">{title}</h2>
        <p className="text-sm text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{clipCount} {clipCount === 1 ? "Clip" : "Clips"} zur Auswahl</span>
          {participationCoins > 0 && (
            <span className="flex items-center gap-0.5 text-[#b794ff]">· +{participationCoins}<CoinIcon size={12} /> fürs Abstimmen</span>
          )}
          {rewardCoins > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">· {rewardCoins.toLocaleString("de-DE")}<CoinIcon size={12} /> für den Sieger</span>
          )}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <CountdownBadge endsAt={endsAt} />
    </div>
  );
}
