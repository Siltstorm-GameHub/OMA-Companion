import Link from "next/link";
import { Heart, Star, Tag, Users } from "@/components/icons";
import type { GameListInfo as Info } from "@/lib/games/service";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";

/** Kurzinfo aus der Spieleliste neben einem Spielnamen (Event-, Squad-Seite): wer es hat, wer es
 *  zocken will, Note, Angebot — führt auf die Spielseite. Nichts, wenn das Spiel nicht in der Liste ist. */
export default function GameListInfo({ info }: { info: Info | null }) {
  if (!info) return null;
  const avg = info.ratingCount >= MIN_RATINGS_FOR_AVERAGE ? averageRating(info.ratingSum, info.ratingCount) : null;
  const parts: { icon: typeof Users; text: string; className?: string }[] = [];
  if (info.ownCount > 0) parts.push({ icon: Users, text: `${info.ownCount} ${info.ownCount === 1 ? "hat" : "haben"} es` });
  if (info.wantCount > 0) parts.push({ icon: Heart, text: `${info.wantCount} ${info.wantCount === 1 ? "will" : "wollen"} es zocken` });
  if (avg !== null) parts.push({ icon: Star, text: formatRating(avg) });
  if (info.discountPercent > 0) parts.push({ icon: Tag, text: `−${info.discountPercent} % bei Steam`, className: "text-rose-300" });

  return (
    <Link
      href={`/spiele/${info.slug}`}
      className="inline-flex items-center gap-x-2.5 gap-y-1 flex-wrap rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-teal-500/30 px-2.5 py-1 text-[11px] text-gray-400 transition-colors"
      title="In der Spieleliste ansehen und bewerten"
    >
      {parts.length === 0 ? (
        <span>In der Spieleliste bewerten</span>
      ) : (
        parts.map((p) => (
          <span key={p.text} className={`flex items-center gap-1 ${p.className ?? ""}`}>
            <p.icon className="w-3 h-3 shrink-0" /> {p.text}
          </span>
        ))
      )}
      <span className="text-teal-300 font-semibold">Spieleliste →</span>
    </Link>
  );
}
