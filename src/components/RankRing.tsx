"use client";
import "./RankRing.css";
import type { CSSProperties, ReactNode } from "react";
import { useUserLook } from "@/components/cosmetics/useUserLook";
import { getCosmeticOf, type AuraCosmetic, type UserLook } from "@/lib/cosmetics/catalog";
import { getFrameRing } from "@/lib/cosmetics/frame-style";

interface RankRingProps {
  /** User, dessen ausgerüsteter Rahmen/Aura gezeigt wird. Ohne ID: schlichter grauer Ring. */
  userId?: string | null;
  /** Schon bekanntes Aussehen (spart den Abruf). null = nicht laden, schlichter Ring (z.B. OBS-Overlays). */
  look?: UserLook | null;
  /** Ringbreite in px. Wird als Padding gesetzt — das Padding IST der Ring. */
  width: number;
  /** Tailwind-Rundungsklasse, z.B. "rounded-full". Vererbt sich an die Ringschicht. */
  rounded: string;
  /** Einfarbiger Ring ohne Animation und ohne Aura — für sehr kleine Avatare. */
  flat?: boolean;
  /** Klassen für den Bild-Container. Trägt die Größe und ggf. eine Sonderform. */
  faceClassName?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

/** Aura-Schicht außerhalb des Rings (Styles in RankRing.css, Abschnitt "Auren"). */
export function AuraLayer({ aura }: { aura: AuraCosmetic }) {
  return (
    <span
      className={`cos-aura cos-aura--${aura.kind}`}
      style={{ "--aura-c1": aura.color, "--aura-c2": aura.color2 ?? aura.color } as CSSProperties}
      aria-hidden="true"
    />
  );
}

/**
 * Der Rahmen ums Profilbild als eigenständiger Wrapper.
 *
 * Farbe und Effekt = im Kosmetik-Shop gekaufter und ausgerüsteter Rahmen (lib/cosmetics/catalog.ts),
 * dazu optional eine Aura außerhalb des Rings. Ohne Rahmen: schlichter grauer Ring.
 */
export default function RankRing({
  userId,
  look: lookProp,
  width,
  rounded,
  flat = false,
  faceClassName = "",
  className = "",
  style,
  title,
  children,
}: RankRingProps) {
  const look = useUserLook(userId, lookProp);
  const frame = getCosmeticOf(look?.frame, "frame");
  const aura = flat ? undefined : getCosmeticOf(look?.aura, "aura");
  const ring = getFrameRing(frame);

  return (
    <div
      className={`${ring.className}${flat ? " rr-flat" : ""} ${rounded} ${className}`}
      style={{ ...ring.style, padding: width, ...style }}
      title={title}
    >
      {aura && <AuraLayer aura={aura} />}
      <span className="rr-ring-layer" aria-hidden="true" />
      <div className={`rr-face ${rounded} ${faceClassName}`}>{children}</div>
    </div>
  );
}
