import { decodeSeriesIcon, resolveSeriesIcon, resolveSeriesColor } from "@/lib/series-icons";
import { pictoSrc } from "@/lib/picto-icons";
import { Repeat } from "@/components/icons";

/** Zeigt das Icon einer Reihe/eines Squads. Größe über className (z. B. "w-4 h-4"), Farbe steckt im Wert. */
export default function SeriesIcon({ name, className }: { name?: string | null; className?: string }) {
  const d = decodeSeriesIcon(name);
  if (d?.kind === "picto") {
    const src = `url(${pictoSrc(d.id)})`;
    return (
      <span
        className={`inline-block ${className ?? ""}`}
        style={{
          backgroundColor: d.color,
          WebkitMaskImage: src, maskImage: src,
          WebkitMaskSize: "contain", maskSize: "contain",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
        }}
        aria-hidden
      />
    );
  }
  // Ohne Icon: Fallback "Reihe wiederholt sich" (Stapel-Icon)
  if (!d) return <Repeat className={className} style={{ color: resolveSeriesColor(name) }} />;
  const Icon = resolveSeriesIcon(d.name);
  // eslint-disable-next-line react-hooks/static-components -- Icon kommt aus einer stabilen, modulweiten Map (kein Re-Create pro Render)
  return <Icon className={className} style={{ color: resolveSeriesColor(name) }} />;
}
