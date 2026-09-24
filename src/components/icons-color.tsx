// Bunte Icons im Set-Stil als Drop-in für Lucide-Namen (className steuert Größe/Abstand,
// Textfarbe hat keinen Einfluss). Für Spenden: Herz und Gold(-münze).
import type { LucideIcon, LucideProps } from "lucide-react";

function makeColor(file: string, alt: string): LucideIcon {
  function ColorIcon({ className = "", style, size, width, height }: LucideProps) {
    const hasSize = /(^|\s)(size|w)-/.test(className);
    const w = width ?? size ?? (hasSize ? undefined : 24);
    const h = height ?? size ?? (hasSize ? undefined : 24);
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/icons/currency/${file}.png`} alt={alt} draggable={false}
      className={`inline-block object-contain shrink-0 ${className}`} style={{ width: w, height: h, ...style }} />;
  }
  return ColorIcon as unknown as LucideIcon;
}

export const HeartColor = makeColor("heart", "Spenden");
export const GoldColor = makeColor("gold", "Gold");
