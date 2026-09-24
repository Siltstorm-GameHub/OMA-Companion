"use client";

import type { ReactNode } from "react";

interface RankUpFlareProps {
  userId: string;
  rankPoints: number;
  children: ReactNode;
}

/**
 * Früher: Aufflackern des Rang-Rings beim Aufstieg. Rangstufen gibt es nicht mehr,
 * der Effekt ist deshalb abgeschaltet. Die Komponente reicht nur noch durch, damit die
 * Aufrufstellen unverändert bleiben (wird beim Aufräumen entfernt).
 */
export default function RankUpFlare({ children }: RankUpFlareProps) {
  return <>{children}</>;
}
