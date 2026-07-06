import { resolveSeriesIcon } from "@/lib/series-icons";

export default function SeriesIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = resolveSeriesIcon(name);
  // eslint-disable-next-line react-hooks/static-components -- Icon kommt aus einer stabilen, modulweiten Map (kein Re-Create pro Render)
  return <Icon className={className} />;
}
