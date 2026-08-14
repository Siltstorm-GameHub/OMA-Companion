import Image from "next/image";
import type { EventCategory } from "@prisma/client";
import { POKAL_CATEGORY_IMAGE, getPokalCategoryLabel } from "@/lib/pokal";

interface Props {
  category: EventCategory;
  /** true = Eventreihen-Pokal (größer dargestellt), false = Standalone-Event-Pokal. */
  isSeries: boolean;
  /** Ohne eigene Überschrift — für den Einsatz innerhalb einer bereits betitelten Kachel (z.B. "Punktesystem"). */
  compact?: boolean;
  /** Kompakte Stat-Kachel im "glass-heavy"-Look, passend zur Kennzahlen-Reihe der Standalone-Event-Kopfkachel. */
  tile?: boolean;
}

/**
 * Vorschau des Pokals, der bei Abschluss vergeben wird — für noch laufende/kommende
 * Events bzw. Eventreihen. Sobald tatsächlich vergeben, ersetzt EventPokalWinners diese
 * Anzeige (siehe tournament/[id]/page.tsx und events/series/[id]/page.tsx: die Preview
 * wird nur gerendert, wenn noch keine Pokal-Zeile existiert).
 */
export default function PokalPreview({ category, isSeries, compact = false, tile = false }: Props) {
  const boxSize = isSeries ? 132 : 78;
  const imgSize = isSeries ? 108 : 64;

  if (tile) {
    return (
      <div className="glass-heavy rounded-xl p-3 text-center flex flex-col items-center justify-center">
        <Image
          src={POKAL_CATEGORY_IMAGE[category]}
          alt={getPokalCategoryLabel(category)}
          width={28}
          height={28}
          className="object-contain opacity-70 grayscale-[0.3]"
        />
        <p className="text-xs text-gray-500 mt-0.5">Pokal</p>
      </div>
    );
  }

  const card = (
    <div
      className={`inline-flex flex-col items-center gap-2 rounded-2xl border border-dashed p-3 ${
        isSeries
          ? "border-amber-500/25 bg-amber-500/[0.04]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div
        className="relative flex items-center justify-center opacity-60"
        style={{ width: boxSize, height: boxSize }}
      >
        <Image
          src={POKAL_CATEGORY_IMAGE[category]}
          alt={getPokalCategoryLabel(category)}
          width={imgSize}
          height={imgSize}
          className="object-contain grayscale-[0.3]"
        />
      </div>
      <p className="text-[10px] text-gray-500 text-center leading-tight max-w-[9rem]">
        Wird {isSeries ? "an die Gewinner der Reihe" : "an den/die Sieger"} vergeben
      </p>
    </div>
  );

  if (compact) return card;

  return (
    <div className="space-y-2">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        🏆 {isSeries ? "Eventreihen-Pokal" : "Pokal"}
      </h2>
      {card}
    </div>
  );
}
