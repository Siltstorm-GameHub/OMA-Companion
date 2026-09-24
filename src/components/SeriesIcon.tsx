import { decodeSeriesIcon } from "@/lib/series-icons";
import { pictoSrc, PICTO_DEFAULT_COLOR } from "@/lib/picto-icons";

const FALLBACK_SRC = "/icons/ui/reverse.png"; // "Reihe wiederholt sich"

/** Zeigt das Icon einer Reihe/eines Squads. Größe über className (z. B. "w-4 h-4"), Farbe steckt im Wert. */
export default function SeriesIcon({ name, className }: { name?: string | null; className?: string }) {
  const d = decodeSeriesIcon(name);
  const src = d ? `url(${pictoSrc(d.id)})` : `url(${FALLBACK_SRC})`;
  return (
    <span
      className={`inline-block ${className ?? ""}`}
      style={{
        backgroundColor: d?.color ?? PICTO_DEFAULT_COLOR,
        WebkitMaskImage: src, maskImage: src,
        WebkitMaskSize: "contain", maskSize: "contain",
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskPosition: "center", maskPosition: "center",
      }}
      aria-hidden
    />
  );
}
