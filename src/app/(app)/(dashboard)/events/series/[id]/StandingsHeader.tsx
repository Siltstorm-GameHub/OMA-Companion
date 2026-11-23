"use client";
import type { ReactNode } from "react";
import { Trophy } from "@/components/icons";
import { useScoringInfo } from "@/app/(app)/(dashboard)/tournament/[id]/ScoringInfo";

/**
 * Überschrift "Tabelle" der Eventreihe mit "Wie wird gewertet?" — das Punktesystem steht im
 * aufklappbaren Panel direkt an der Tabelle (vorher ganz unten auf der Seite).
 */
export default function StandingsHeader({ info }: { info: ReactNode | null }) {
  const s = useScoringInfo();
  return (
    <>
      <h2 className="text-base font-extrabold text-fg flex flex-wrap items-center gap-2">
        <Trophy className="size-4 text-coin" /> Tabelle
        {info && <span className="ml-auto">{s.button}</span>}
      </h2>
      {info && s.panel(info)}
    </>
  );
}
