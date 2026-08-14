import Image from "next/image";
import type { EventCategory } from "@prisma/client";
import { POKAL_CATEGORY_IMAGE, getPokalCategoryLabel } from "@/lib/pokal";

interface Props {
  category: EventCategory;
  /** true = Eventreihen-Pokal (größer dargestellt), false = Standalone-Event-Pokal. */
  isSeries: boolean;
}

/**
 * Vorschau des Pokals, der bei Abschluss vergeben wird — für noch laufende/kommende
 * Events bzw. Eventreihen. Bewusst im selben horizontalen Banner-Stil wie die spätere
 * "gewonnen"-Anzeige (WinIcon-Box auf der Event-Seite, EventPokalWinners auf der
 * Reihen-Seite), damit an derselben Stelle im Layout einfach die Vorschau durch das
 * Ergebnis ersetzt wird, statt an einer separaten Stelle aufzutauchen.
 */
export default function PokalPreview({ category, isSeries }: Props) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 border border-dashed ${
        isSeries
          ? "border-amber-500/25 bg-amber-500/[0.04]"
          : "border-white/15 bg-white/[0.02]"
      }`}
    >
      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
        <Image
          src={POKAL_CATEGORY_IMAGE[category]}
          alt={getPokalCategoryLabel(category)}
          width={36}
          height={36}
          className="object-contain opacity-70 grayscale-[0.25]"
        />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          {isSeries ? "Eventreihen-Pokal" : "Pokal"} · {getPokalCategoryLabel(category)}
        </p>
        <p className="text-gray-400 text-sm">
          Wird {isSeries ? "an die Gewinner der Reihe" : "an den/die Sieger"} vergeben
        </p>
      </div>
    </div>
  );
}
