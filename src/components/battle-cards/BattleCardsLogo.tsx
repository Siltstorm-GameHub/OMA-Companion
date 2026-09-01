"use client";

// ============================================
// Battle-Cards-Wortmarke — Header
// ============================================
// Eigenes Logo/Emblem für den Battle-Cards-Bereich (siehe public/battle-cards/
// logo.png). Fehlt die Datei (noch nicht hochgeladen), wird einfach nichts
// gerendert (onError-Pattern, wie bei Monster-/Hintergrund-Bildern) — kein
// Blocker, die Tabs darunter funktionieren unverändert.

import { useState } from "react";

export default function BattleCardsLogo() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="flex justify-center pb-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/battle-cards/logo.png"
        alt="OMA Battle Cards"
        className="h-16 sm:h-20 w-auto object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
