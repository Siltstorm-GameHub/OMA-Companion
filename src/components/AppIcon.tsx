import Image from "next/image";
import type { EventCategory } from "@prisma/client";
import { CATEGORY_ICONS, genreMeta } from "@/lib/app-icons";

type Props =
  | { kind: "genre"; name: string | null | undefined; size?: number; className?: string }
  | { kind: "category"; name: EventCategory; size?: number; className?: string };

/** Einheitliches Icon für Genres und Spielkategorien, Quelle: src/lib/app-icons.ts. */
export default function AppIcon(props: Props) {
  const { size = 16, className = "" } = props;

  if (props.kind === "genre") {
    const meta = genreMeta(props.name);
    if (!meta) return null;
    return <Image src={meta.icon} alt={meta.label} width={size} height={size} className={`object-contain ${className}`} />;
  }

  const cfg = CATEGORY_ICONS[props.name];
  if (!cfg) return null;
  if (!cfg.icon) return <span className={className}>{cfg.emoji}</span>;
  return <Image src={cfg.icon} alt="" width={size} height={size} className={`inline-block object-contain ${className}`} />;
}
