"use client";
import type { CSSProperties, ReactNode } from "react";
import { useJobBadge } from "@/components/community-jobs/JobBadge";
import { getJobRing, GOLD } from "@/lib/job-ring";
import type { JobBadgeData } from "@/lib/job-badges";

interface RankRingProps {
  /** User, dessen Beruf Farbe und Effekt des Rings bestimmt. Ohne ID: schlichter Ring wie bei Arbeitslosen. */
  userId?: string | null;
  /** Schon bekannte Badge-Daten (spart den Abruf); `null` = arbeitslos. */
  badge?: JobBadgeData | null;
  /** Ringbreite in px. Wird als Padding gesetzt — das Padding IST der Ring. */
  width: number;
  /** Tailwind-Rundungsklasse, z.B. "rounded-full". Vererbt sich an die Ringschicht. */
  rounded: string;
  /** Einfarbiger Ring ohne Animation — für sehr kleine Avatare. */
  flat?: boolean;
  /** Stufenpunkte (1–4) am unteren Rand. */
  showLevel?: boolean;
  /** Klassen für den Bild-Container. Trägt die Größe und ggf. eine Sonderform. */
  faceClassName?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

/**
 * Der Rahmen ums Profilbild als eigenständiger Wrapper.
 *
 * Farbe = Beruf, Effekt = Stufe im Beruf (siehe lib/job-ring.ts); wer arbeitslos ist,
 * bekommt den schlichten grauen Ring. Existiert, damit die dreiteilige Struktur
 * (Ringschicht / Bild) nur an einer Stelle steht.
 */
export default function RankRing({
  userId,
  badge: badgeProp,
  width,
  rounded,
  flat = false,
  showLevel = false,
  faceClassName = "",
  className = "",
  style,
  title,
  children,
}: RankRingProps) {
  const badge = useJobBadge(userId, badgeProp);
  const ring = getJobRing(badge);
  // Stufe 4: zusätzlicher goldener Innenring, aber nur wenn der Ring dick genug dafür ist
  const doubleRing = ring.level === 4 && !flat && width >= 4;
  const goldW = width >= 6 ? 2 : 1;
  const faceShadow = doubleRing ? `0 0 0 1px var(--rr-gap), 0 0 0 ${1 + goldW}px ${GOLD}` : undefined;

  return (
    <div
      className={`${ring.className}${flat ? " rr-flat" : ""} ${rounded} ${className}`}
      style={{ ...ring.style, padding: width, ...style }}
      title={title}
    >
      <span className="rr-ring-layer" aria-hidden="true" />
      <div className={`rr-face ${rounded} ${faceClassName}`} style={faceShadow ? { boxShadow: faceShadow } : undefined}>{children}</div>
      {showLevel && !flat && ring.level > 0 && (
        <span className="rr-dots" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`rr-dot${i <= ring.level ? " rr-dot--on" : ""}`} />
          ))}
        </span>
      )}
    </div>
  );
}
