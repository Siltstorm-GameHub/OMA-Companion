import Link from "next/link";
import { Heart, Star, Tag, Users } from "@/components/icons";
import type { GameListInfo as Info } from "@/lib/games/service";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";

/** Kurzinfo aus der Spieleliste neben einem Spielnamen (Event-, Squad-Seite): wie viele am Start sind,
 *  Wunschliste, Note, Angebot — führt auf die Spielseite. Nichts, wenn das Spiel nicht in der Liste ist. */
export default function GameListInfo({ info }: { info: Info | null }) {
  if (!info) return null;
  const avg = info.ratingCount >= MIN_RATINGS_FOR_AVERAGE ? averageRating(info.ratingSum, info.ratingCount) : null;
  const parts: { icon: typeof Users; text: string; className?: string }[] = [];
  if (info.inCount > 0) parts.push({ icon: Users, text: `${info.inCount} am Start` });
  if (info.wishCount > 0) parts.push({ icon: Heart, text: `${info.wishCount} auf der Wunschliste` });
  if (avg !== null) parts.push({ icon: Star, text: formatRating(avg) });
  if (info.discountPercent > 0) parts.push({ icon: Tag, text: `−${info.discountPercent} % bei Steam`, className: "text-rose-300" });

  return (
    <Link
      href={`/spiele/${info.slug}`}
      className="inline-flex items-center gap-x-2.5 gap-y-1 flex-wrap rounded-lg border border-line bg-surface-2 hover:bg-line hover:border-primary/30 px-2.5 py-1 text-xs text-gray-400 transition-colors max-lg:min-h-10"
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
      <span className="text-primary-fg font-semibold">Spieleliste →</span>
    </Link>
  );
}
