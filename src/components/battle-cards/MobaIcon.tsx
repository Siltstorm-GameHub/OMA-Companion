// ============================================
// MobaIcon — Rasterbild-Icon aus dem MOBA-Style-Kit
// ============================================
// Ersatz für Lucide-Icons innerhalb des .moba-skin — anders als Lucide nicht
// per `color` einfärbbar (Glow ist ins PNG gebrannt), daher `className` nur
// für Größe/Position, nicht für Farbe.

import { MOBA_ICON, type MobaIconName } from "@/lib/battle-cards/moba-icons";

export default function MobaIcon({
  name,
  className = "w-4 h-4",
}: {
  name: MobaIconName;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={MOBA_ICON[name]} alt="" aria-hidden className={`inline-block object-contain ${className}`} />;
}
